-- =============================================
-- YARD$ GOLF — Power-Ups v2
-- Run in the Supabase SQL Editor (safe to re-run).
--
-- Adds:
--   kind          power_up | hazard   (hazards = the "caution" cards)
--   enabled       turn a card on/off without deleting it
--   allowed_holes restrict to specific hole numbers ({} = any hole)
--   allowed_pars  restrict by par, e.g. {5} for "par 5 only" ({} = any par)
--   color         card highlight colour
-- =============================================

ALTER TABLE golf_power_ups
  ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'power_up',
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allowed_holes INT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_pars INT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'lime';

-- Anything already created is a power-up and stays enabled.
UPDATE golf_power_ups SET kind = 'power_up' WHERE kind IS NULL;
UPDATE golf_power_ups SET enabled = true    WHERE enabled IS NULL;

-- ─── Replace the claim function so it enforces the new rules ───
CREATE OR REPLACE FUNCTION golf_use_power_up(p_bag_tag TEXT, p_power_up_id UUID, p_hole INT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player  golf_tournament_players%ROWTYPE;
  v_pu      golf_power_ups%ROWTYPE;
  v_used    INT;
  v_par     INT;
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

  -- Hole number restriction
  IF COALESCE(array_length(v_pu.allowed_holes, 1), 0) > 0
     AND NOT (p_hole = ANY (v_pu.allowed_holes)) THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Only valid on hole ' || array_to_string(v_pu.allowed_holes, ', '));
  END IF;

  -- Par restriction (e.g. Bomber Bonus on par 5s)
  IF COALESCE(array_length(v_pu.allowed_pars, 1), 0) > 0 THEN
    SELECT par INTO v_par FROM golf_tournament_holes
    WHERE tournament_id = v_player.tournament_id AND hole_number = p_hole;
    IF v_par IS NULL OR NOT (v_par = ANY (v_pu.allowed_pars)) THEN
      RETURN jsonb_build_object('ok', false, 'error',
        'Only valid on par ' || array_to_string(v_pu.allowed_pars, '/') || ' holes');
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_used FROM golf_power_up_uses
  WHERE team_id = v_player.team_id AND power_up_id = p_power_up_id;

  IF v_used >= COALESCE(v_pu.uses_per_team, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'None left for your team');
  END IF;

  INSERT INTO golf_power_up_uses (power_up_id, team_id, tournament_id, hole_number, used_by)
  VALUES (p_power_up_id, v_player.team_id, v_player.tournament_id, p_hole, v_player.name);

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION golf_use_power_up(TEXT, UUID, INT) TO anon, authenticated;

SELECT name, kind, enabled, uses_per_team, allowed_holes, allowed_pars
FROM golf_power_ups ORDER BY kind, sort_order;
