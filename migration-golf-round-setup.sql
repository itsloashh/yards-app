-- =============================================
-- YARD$ GOLF — round setup, jackpot holes, stroke effects
-- Run in the Supabase SQL Editor (safe to re-run).
--
-- ADDS
--   golf_tournaments.nine_side      'front' | 'back' | NULL   (NULL = 18 holes)
--   golf_tournament_holes.is_jackpot   doubles bonuses on that hole
--   golf_power_ups.score_effect     strokes added/removed when the card is used
--                                   (-1 for 15-Footer Bonus / Closest to the Pin)
--   golf_teams.tee_time_at          real timestamp, for the countdown
-- =============================================

ALTER TABLE golf_tournaments
  ADD COLUMN IF NOT EXISTS nine_side TEXT DEFAULT NULL;

ALTER TABLE golf_tournament_holes
  ADD COLUMN IF NOT EXISTS is_jackpot BOOLEAN DEFAULT false;

ALTER TABLE golf_power_ups
  ADD COLUMN IF NOT EXISTS score_effect INT DEFAULT 0;

ALTER TABLE golf_teams
  ADD COLUMN IF NOT EXISTS tee_time_at TIMESTAMPTZ DEFAULT NULL;

UPDATE golf_tournament_holes SET is_jackpot = false WHERE is_jackpot IS NULL;
UPDATE golf_power_ups SET score_effect = 0 WHERE score_effect IS NULL;

-- ─────────────────────────────────────────────
-- Rebuild a tournament's holes for 9 (front/back) or 18.
-- Back nine keeps its real numbering (10-18) so scorecards match the course.
-- Existing scores on holes that survive are left untouched.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION golf_setup_holes(
  p_tournament_id UUID,
  p_holes INT DEFAULT 18,
  p_side TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_start INT;
  v_end   INT;
BEGIN
  IF p_holes = 9 AND p_side = 'back' THEN
    v_start := 10; v_end := 18;
  ELSIF p_holes = 9 THEN
    v_start := 1; v_end := 9;
  ELSE
    v_start := 1; v_end := 18;
  END IF;

  UPDATE golf_tournaments
  SET holes_count = CASE WHEN p_holes = 9 THEN 9 ELSE 18 END,
      nine_side   = CASE WHEN p_holes = 9 THEN p_side ELSE NULL END,
      updated_at  = NOW()
  WHERE id = p_tournament_id;

  -- Drop holes outside the chosen range
  DELETE FROM golf_tournament_holes
  WHERE tournament_id = p_tournament_id
    AND (hole_number < v_start OR hole_number > v_end);

  -- Create any missing holes in range
  INSERT INTO golf_tournament_holes (tournament_id, hole_number, par)
  SELECT p_tournament_id, gs, 4
  FROM generate_series(v_start, v_end) gs
  ON CONFLICT (tournament_id, hole_number) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'first_hole', v_start, 'last_hole', v_end);
END;
$$;

GRANT EXECUTE ON FUNCTION golf_setup_holes(UUID, INT, TEXT) TO authenticated;

-- Only one jackpot hole per tournament
CREATE OR REPLACE FUNCTION golf_set_jackpot_hole(p_tournament_id UUID, p_hole INT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE golf_tournament_holes SET is_jackpot = false WHERE tournament_id = p_tournament_id;
  IF p_hole IS NOT NULL THEN
    UPDATE golf_tournament_holes SET is_jackpot = true
    WHERE tournament_id = p_tournament_id AND hole_number = p_hole;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION golf_set_jackpot_hole(UUID, INT) TO authenticated;

-- Include the new fields everywhere the app reads them
CREATE OR REPLACE FUNCTION golf_tournament_state(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'ok', true,
    'tournament', (SELECT to_jsonb(t) FROM golf_tournaments t WHERE t.id = p_tournament_id),
    'holes', (
      SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.hole_number), '[]'::jsonb)
      FROM golf_tournament_holes h WHERE h.tournament_id = p_tournament_id
    ),
    'teams', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'flight', t.flight,
        'tee_time', t.tee_time, 'tee_time_at', t.tee_time_at,
        'starting_hole', t.starting_hole,
        'players', (
          SELECT COALESCE(jsonb_agg(p.name ORDER BY p.name), '[]'::jsonb)
          FROM golf_tournament_players p WHERE p.team_id = t.id
        ),
        'scores', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'hole_number', s.hole_number, 'strokes', s.strokes,
            'penalties', s.penalties, 'updated_at', s.updated_at
          ) ORDER BY s.hole_number), '[]'::jsonb)
          FROM golf_team_scores s WHERE s.team_id = t.id
        ),
        'power_up_uses', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', u.id, 'power_up_id', u.power_up_id,
            'hole_number', u.hole_number, 'used_by', u.used_by,
            'option_label', u.option_label,
            'entry_type', COALESCE(u.entry_type, 'spend'),
            'delta', COALESCE(u.delta, -1),
            'source', COALESCE(u.source, 'manual')
          ) ORDER BY u.used_at), '[]'::jsonb)
          FROM golf_power_up_uses u WHERE u.team_id = t.id
        )
      ) ORDER BY t.sort_order, t.name), '[]'::jsonb)
      FROM golf_teams t WHERE t.tournament_id = p_tournament_id
    ),
    'power_ups', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pu) ORDER BY pu.sort_order, pu.name), '[]'::jsonb)
      FROM golf_power_ups pu WHERE pu.tournament_id = p_tournament_id
    )
  );
END;
$$;

-- Sign-in needs the same extra fields
CREATE OR REPLACE FUNCTION golf_tag_signin(p_bag_tag TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player  golf_tournament_players%ROWTYPE;
  v_team    golf_teams%ROWTYPE;
  v_tourney golf_tournaments%ROWTYPE;
BEGIN
  SELECT p.* INTO v_player
  FROM golf_tournament_players p
  JOIN golf_tournaments t ON t.id = p.tournament_id
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag)
    AND t.status IN ('draft','live','final')
  ORDER BY t.tournament_date DESC NULLS LAST
  LIMIT 1;

  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  SELECT * INTO v_team    FROM golf_teams       WHERE id = v_player.team_id;
  SELECT * INTO v_tourney FROM golf_tournaments WHERE id = v_player.tournament_id;

  RETURN jsonb_build_object(
    'ok', true,
    'player',     jsonb_build_object('id', v_player.id, 'name', v_player.name, 'bag_tag', v_player.bag_tag),
    'tournament', to_jsonb(v_tourney),
    'team',       to_jsonb(v_team),
    'partners', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p2.id, 'name', p2.name) ORDER BY p2.name), '[]'::jsonb)
      FROM golf_tournament_players p2
      WHERE p2.team_id = v_player.team_id AND p2.id <> v_player.id
    ),
    'competitors', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'team_id', t2.id, 'team_name', t2.name, 'flight', t2.flight,
        'players', (
          SELECT COALESCE(jsonb_agg(p3.name ORDER BY p3.name), '[]'::jsonb)
          FROM golf_tournament_players p3 WHERE p3.team_id = t2.id
        )) ORDER BY t2.name), '[]'::jsonb)
      FROM golf_teams t2
      WHERE t2.tournament_id = v_player.tournament_id
        AND t2.id <> v_team.id
        AND t2.tee_time = v_team.tee_time
        AND t2.starting_hole = v_team.starting_hole
    ),
    'holes', (
      SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.hole_number), '[]'::jsonb)
      FROM golf_tournament_holes h WHERE h.tournament_id = v_player.tournament_id
    ),
    'power_ups', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pu) ORDER BY pu.sort_order, pu.name), '[]'::jsonb)
      FROM golf_power_ups pu WHERE pu.tournament_id = v_player.tournament_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION golf_tournament_state(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_tag_signin(TEXT)       TO anon, authenticated;

SELECT name, kind, acquire_mode, score_effect FROM golf_power_ups ORDER BY sort_order;
