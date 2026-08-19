-- =============================================
-- YARD$ GOLF — how a card is acquired
-- Run in the Supabase SQL Editor (safe to re-run).
--
-- THE PROBLEM
--   Penalties were modelled like power-ups: a team had to "start with" one and
--   then "spend" it. But a penalty isn't held and used — it happens to you and
--   gets recorded. There's no allowance to draw down.
--
-- THE FIX — every card now declares how it is acquired:
--   'auto'       awarded by an award rule when the score is saved      (+1)
--   'allowance'  team starts with N and spends them                    (-1)
--   'logged'     marked when it happens on a hole, no cap              (+1)
--
--   Rewards are usually 'auto' or 'allowance'. Penalties are usually
--   'auto' or 'logged'.
-- =============================================

ALTER TABLE golf_power_ups
  ADD COLUMN IF NOT EXISTS acquire_mode TEXT DEFAULT 'allowance';

-- Backfill from what each card already does
UPDATE golf_power_ups
SET acquire_mode = CASE
  WHEN COALESCE(award_metric, 'none') <> 'none' THEN 'auto'
  WHEN kind = 'hazard' AND COALESCE(uses_per_team, 0) = 0 THEN 'logged'
  ELSE 'allowance'
END
WHERE acquire_mode IS NULL OR acquire_mode = '';

-- ─────────────────────────────────────────────
-- Replace the team's manual entries for one hole, in one atomic call.
-- Handles BOTH directions:
--   allowance/auto cards -> 'spend'  (-1, balance checked)
--   logged cards         -> 'grant'  (+1, no cap, it happened)
--
-- Only touches source = 'manual', so auto awards from the score are untouched.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION golf_set_hole_power_ups(
  p_bag_tag TEXT, p_hole INT, p_selections JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
  v_status TEXT;
  v_sel    JSONB;
  v_pu     golf_power_ups%ROWTYPE;
  v_id     UUID;
  v_opt    TEXT;
  v_par    INT;
  v_left   INT;
  v_mode   TEXT;
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

  -- Clear this hole's manual entries (spends AND logged penalties), then
  -- re-add from the selections. Auto grants (source='auto') are left alone.
  DELETE FROM golf_power_up_uses
  WHERE team_id = v_player.team_id
    AND hole_number = p_hole
    AND COALESCE(source, 'manual') = 'manual';

  SELECT par INTO v_par FROM golf_tournament_holes
  WHERE tournament_id = v_player.tournament_id AND hole_number = p_hole;

  FOR v_sel IN SELECT * FROM jsonb_array_elements(COALESCE(p_selections, '[]'::jsonb))
  LOOP
    v_id  := (v_sel->>'power_up_id')::UUID;
    v_opt := COALESCE(v_sel->>'option_label', '');

    SELECT * INTO v_pu FROM golf_power_ups WHERE id = v_id;
    IF v_pu.id IS NULL THEN CONTINUE; END IF;

    IF COALESCE(v_pu.enabled, true) = false THEN
      RETURN jsonb_build_object('ok', false, 'error', v_pu.name || ' is switched off');
    END IF;

    IF COALESCE(array_length(v_pu.allowed_holes, 1), 0) > 0
       AND NOT (p_hole = ANY (v_pu.allowed_holes)) THEN
      RETURN jsonb_build_object('ok', false, 'error',
        v_pu.name || ' is only valid on hole ' || array_to_string(v_pu.allowed_holes, ', '));
    END IF;

    IF COALESCE(array_length(v_pu.allowed_pars, 1), 0) > 0 THEN
      IF v_par IS NULL OR NOT (v_par = ANY (v_pu.allowed_pars)) THEN
        RETURN jsonb_build_object('ok', false, 'error',
          v_pu.name || ' is only valid on par ' || array_to_string(v_pu.allowed_pars, '/') || ' holes');
      END IF;
    END IF;

    IF COALESCE(array_length(v_pu.options, 1), 0) > 0 THEN
      IF COALESCE(TRIM(v_opt), '') = '' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Pick an option for ' || v_pu.name);
      END IF;
      IF NOT (v_opt = ANY (v_pu.options)) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Invalid option for ' || v_pu.name);
      END IF;
    END IF;

    v_mode := COALESCE(v_pu.acquire_mode, 'allowance');

    IF v_mode = 'logged' THEN
      -- Something that happened to them: recorded, never capped.
      INSERT INTO golf_power_up_uses
        (power_up_id, team_id, tournament_id, hole_number, used_by, entry_type, delta, source, option_label)
      VALUES
        (v_id, v_player.team_id, v_player.tournament_id, p_hole, v_player.name,
         'grant', 1, 'manual', v_opt);
    ELSE
      -- Something they hold and are spending: balance checked after the clear
      -- above, so re-confirming an unchanged hole can't fail against itself.
      v_left := golf_remaining(v_player.team_id, v_id);
      IF v_left <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'No ' || v_pu.name || ' left to use');
      END IF;

      INSERT INTO golf_power_up_uses
        (power_up_id, team_id, tournament_id, hole_number, used_by, entry_type, delta, source, option_label)
      VALUES
        (v_id, v_player.team_id, v_player.tournament_id, p_hole, v_player.name,
         'spend', -1, 'manual', v_opt);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Single-card claim from the Power-Ups tab respects the same modes
CREATE OR REPLACE FUNCTION golf_use_power_up(
  p_bag_tag TEXT, p_power_up_id UUID, p_hole INT, p_option TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
  v_pu     golf_power_ups%ROWTYPE;
  v_par    INT;
  v_left   INT;
  v_mode   TEXT;
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

  IF COALESCE(array_length(v_pu.options, 1), 0) > 0 THEN
    IF COALESCE(TRIM(p_option), '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Pick an option first');
    END IF;
    IF NOT (p_option = ANY (v_pu.options)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'That option is not on this card');
    END IF;
  END IF;

  v_mode := COALESCE(v_pu.acquire_mode, 'allowance');

  IF v_mode = 'logged' THEN
    INSERT INTO golf_power_up_uses
      (power_up_id, team_id, tournament_id, hole_number, used_by, entry_type, delta, source, option_label)
    VALUES
      (p_power_up_id, v_player.team_id, v_player.tournament_id, p_hole, v_player.name,
       'grant', 1, 'manual', COALESCE(p_option, ''));
    RETURN jsonb_build_object('ok', true);
  END IF;

  v_left := golf_remaining(v_player.team_id, p_power_up_id);
  IF v_left <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'None left for your team');
  END IF;

  INSERT INTO golf_power_up_uses
    (power_up_id, team_id, tournament_id, hole_number, used_by, entry_type, delta, source, option_label)
  VALUES
    (p_power_up_id, v_player.team_id, v_player.tournament_id, p_hole, v_player.name,
     'spend', -1, 'manual', COALESCE(p_option, ''));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Undo now removes a team's own manual entry of EITHER direction
CREATE OR REPLACE FUNCTION golf_undo_power_up(p_bag_tag TEXT, p_use_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
BEGIN
  SELECT p.* INTO v_player FROM golf_tournament_players p
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag) LIMIT 1;
  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  DELETE FROM golf_power_up_uses
  WHERE id = p_use_id
    AND team_id = v_player.team_id
    AND COALESCE(source, 'manual') = 'manual';

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION golf_set_hole_power_ups(TEXT, INT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_use_power_up(TEXT, UUID, INT, TEXT)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_undo_power_up(TEXT, UUID)            TO anon, authenticated;

SELECT name, kind, acquire_mode, uses_per_team AS starting, award_metric
FROM golf_power_ups ORDER BY acquire_mode, sort_order;
