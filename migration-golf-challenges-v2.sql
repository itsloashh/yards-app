-- =============================================
-- YARD$ GOLF — hole challenges that affect the scorecard
-- Run in the Supabase SQL Editor (safe to re-run).
--
-- A hole challenge (Closest to the Pin, Long Drive, 15-Footer) is won by ONE
-- team. Winning can carry a stroke effect, so the result has to be recorded
-- per team — that's what golf_challenge_wins is for.
-- =============================================

ALTER TABLE golf_tournament_holes
  ADD COLUMN IF NOT EXISTS challenge_type TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS challenge_effect INT DEFAULT 0;

UPDATE golf_tournament_holes SET challenge_effect = 0 WHERE challenge_effect IS NULL;

CREATE TABLE IF NOT EXISTS golf_challenge_wins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES golf_tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES golf_teams(id) ON DELETE CASCADE,
  hole_number INT NOT NULL,
  claimed_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, hole_number)
);

CREATE INDEX IF NOT EXISTS idx_golf_challenge_wins_t ON golf_challenge_wins(tournament_id);

ALTER TABLE golf_challenge_wins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Challenge wins public read" ON golf_challenge_wins;
CREATE POLICY "Challenge wins public read" ON golf_challenge_wins FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage challenge wins" ON golf_challenge_wins;
CREATE POLICY "Admins manage challenge wins" ON golf_challenge_wins
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE golf_challenge_wins; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Claim (or release) a hole challenge for the caller's team
CREATE OR REPLACE FUNCTION golf_set_challenge_win(p_bag_tag TEXT, p_hole INT, p_won BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
  v_status TEXT;
BEGIN
  SELECT p.* INTO v_player FROM golf_tournament_players p
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag) LIMIT 1;
  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  SELECT status INTO v_status FROM golf_tournaments WHERE id = v_player.tournament_id;
  IF v_status = 'final' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This tournament is final');
  END IF;

  DELETE FROM golf_challenge_wins
  WHERE team_id = v_player.team_id AND hole_number = p_hole;

  IF p_won THEN
    INSERT INTO golf_challenge_wins (tournament_id, team_id, hole_number, claimed_by)
    VALUES (v_player.tournament_id, v_player.team_id, p_hole, v_player.name);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION golf_set_challenge_win(TEXT, INT, BOOLEAN) TO anon, authenticated;

-- Delete a tournament and everything under it
CREATE OR REPLACE FUNCTION golf_delete_tournament(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not permitted');
  END IF;
  DELETE FROM golf_tournaments WHERE id = p_tournament_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION golf_delete_tournament(UUID) TO authenticated;

-- State now carries challenge wins per team
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
            'source', COALESCE(u.source, 'manual'),
            'used_at', u.used_at
          ) ORDER BY u.used_at), '[]'::jsonb)
          FROM golf_power_up_uses u WHERE u.team_id = t.id
        ),
        'challenge_wins', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'hole_number', w.hole_number, 'claimed_by', w.claimed_by
          ) ORDER BY w.hole_number), '[]'::jsonb)
          FROM golf_challenge_wins w WHERE w.team_id = t.id
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

GRANT EXECUTE ON FUNCTION golf_tournament_state(UUID) TO anon, authenticated;

SELECT hole_number, par, challenge, challenge_type, challenge_effect, is_jackpot
FROM golf_tournament_holes ORDER BY tournament_id, hole_number;
