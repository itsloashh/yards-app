-- =============================================
-- YARD$ GOLF — Power-Ups v3
-- Run in the Supabase SQL Editor (safe to re-run).
--
-- Adds:
--   options[]      a card can offer a menu the player picks from
--                  (e.g. Hot Streak: Replay a shot / Move up 2 club lengths / ...)
--   option_label   which one they chose, recorded on the use
-- =============================================

ALTER TABLE golf_power_ups
  ADD COLUMN IF NOT EXISTS options TEXT[] DEFAULT '{}';

ALTER TABLE golf_power_up_uses
  ADD COLUMN IF NOT EXISTS option_label TEXT DEFAULT '';

-- ─────────────────────────────────────────────
-- OPTIONAL REPAIR — run this only if your cards show "New Power-Up" as the
-- title with the real name sitting in the icon field. The old editor had a
-- full-width icon box, so names were easy to type into the wrong input.
-- It moves the text back into name and restores a default emoji.
-- ─────────────────────────────────────────────
-- UPDATE golf_power_ups
-- SET name = icon,
--     icon = CASE WHEN kind = 'hazard' THEN '⚠️' ELSE '⚡' END
-- WHERE name IN ('New Power-Up', 'New Caution')
--   AND COALESCE(icon, '') <> ''
--   AND length(icon) > 3;

-- ─── Claim function now accepts a chosen option ───
DROP FUNCTION IF EXISTS golf_use_power_up(TEXT, UUID, INT);

CREATE OR REPLACE FUNCTION golf_use_power_up(
  p_bag_tag TEXT, p_power_up_id UUID, p_hole INT, p_option TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
  v_pu     golf_power_ups%ROWTYPE;
  v_used   INT;
  v_par    INT;
BEGIN
  SELECT p.* INTO v_player FROM golf_tournament_players p
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag) LIMIT 1;
  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  SELECT * INTO v_pu FROM golf_power_ups WHERE id = p_power_up_id;
  IF v_pu.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unknown card');
  END IF;

  IF COALESCE(v_pu.enabled, true) = false THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That card is switched off for this round');
  END IF;

  IF COALESCE(array_length(v_pu.allowed_holes, 1), 0) > 0
     AND NOT (p_hole = ANY (v_pu.allowed_holes)) THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Only valid on hole ' || array_to_string(v_pu.allowed_holes, ', '));
  END IF;

  IF COALESCE(array_length(v_pu.allowed_pars, 1), 0) > 0 THEN
    SELECT par INTO v_par FROM golf_tournament_holes
    WHERE tournament_id = v_player.tournament_id AND hole_number = p_hole;
    IF v_par IS NULL OR NOT (v_par = ANY (v_pu.allowed_pars)) THEN
      RETURN jsonb_build_object('ok', false, 'error',
        'Only valid on par ' || array_to_string(v_pu.allowed_pars, '/') || ' holes');
    END IF;
  END IF;

  -- If the card offers a menu, a valid choice is required
  IF COALESCE(array_length(v_pu.options, 1), 0) > 0 THEN
    IF COALESCE(TRIM(p_option), '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Pick an option first');
    END IF;
    IF NOT (p_option = ANY (v_pu.options)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'That option is not on this card');
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_used FROM golf_power_up_uses
  WHERE team_id = v_player.team_id AND power_up_id = p_power_up_id;

  IF v_used >= COALESCE(v_pu.uses_per_team, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'None left for your team');
  END IF;

  INSERT INTO golf_power_up_uses (power_up_id, team_id, tournament_id, hole_number, used_by, option_label)
  VALUES (p_power_up_id, v_player.team_id, v_player.tournament_id, p_hole, v_player.name, COALESCE(p_option, ''));

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION golf_use_power_up(TEXT, UUID, INT, TEXT) TO anon, authenticated;

-- ─── State function now returns the chosen option too ───
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
        'tee_time', t.tee_time, 'starting_hole', t.starting_hole,
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
            'option_label', u.option_label
          )), '[]'::jsonb)
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

GRANT EXECUTE ON FUNCTION golf_tournament_state(UUID) TO anon, authenticated;

SELECT name, kind, uses_per_team, options FROM golf_power_ups ORDER BY sort_order;
