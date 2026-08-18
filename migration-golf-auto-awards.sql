-- =============================================
-- YARD$ GOLF — Automatic awards + inventory ledger
-- Run in the Supabase SQL Editor (safe to re-run).
--
-- WHAT CHANGES
--   golf_power_up_uses becomes a LEDGER instead of a list of spends:
--     entry_type 'grant'  delta = +n   (earned, e.g. birdie -> Hot Streak)
--     entry_type 'spend'  delta = -1   (used on a hole)
--   remaining = uses_per_team (starting allowance) + SUM(delta)
--
--   Existing rows default to spend/-1, so nothing already recorded changes.
--
-- AWARD RULES (on golf_power_ups)
--   award_metric      none | score_vs_par | penalties | strokes
--   award_comparator  lte | eq | gte
--   award_value       the number compared against
--   award_amount      how many tokens the team receives
--   award_message     what the popup says
--
--   Example — Hot Streak: metric score_vs_par, comparator lte, value -1
--             ("birdie or better awards 1 token")
--   Example — Snaked Out: metric penalties, comparator gte, value 1
--
-- IDEMPOTENCY
--   Auto grants are keyed to (team, hole, card). Saving a hole again wipes that
--   hole's auto grants and re-evaluates, so corrected scores never double-award.
-- =============================================

ALTER TABLE golf_power_up_uses
  ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'spend',
  ADD COLUMN IF NOT EXISTS delta INT DEFAULT -1,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

UPDATE golf_power_up_uses SET entry_type = 'spend' WHERE entry_type IS NULL;
UPDATE golf_power_up_uses SET delta = -1 WHERE delta IS NULL;
UPDATE golf_power_up_uses SET source = 'manual' WHERE source IS NULL;

ALTER TABLE golf_power_ups
  ADD COLUMN IF NOT EXISTS award_metric TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS award_comparator TEXT DEFAULT 'lte',
  ADD COLUMN IF NOT EXISTS award_value INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS award_amount INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS award_message TEXT DEFAULT '';

UPDATE golf_power_ups SET award_metric = 'none' WHERE award_metric IS NULL;

CREATE INDEX IF NOT EXISTS idx_golf_pu_ledger_team_hole
  ON golf_power_up_uses(team_id, hole_number, entry_type);

-- ─────────────────────────────────────────────
-- Remaining balance for one card / one team
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION golf_remaining(p_team_id UUID, p_power_up_id UUID)
RETURNS INT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_base INT;
  v_sum  INT;
BEGIN
  SELECT COALESCE(uses_per_team, 0) INTO v_base FROM golf_power_ups WHERE id = p_power_up_id;
  SELECT COALESCE(SUM(delta), 0) INTO v_sum FROM golf_power_up_uses
  WHERE team_id = p_team_id AND power_up_id = p_power_up_id;
  RETURN COALESCE(v_base, 0) + COALESCE(v_sum, 0);
END;
$$;

-- ─────────────────────────────────────────────
-- Evaluate award rules for a hole and grant tokens.
-- Returns the list of cards newly awarded so the app can show a popup.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION golf_eval_awards(p_team_id UUID, p_tournament_id UUID, p_hole INT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_score    golf_team_scores%ROWTYPE;
  v_par      INT;
  v_card     RECORD;
  v_metric   INT;
  v_match    BOOLEAN;
  v_granted  JSONB := '[]'::jsonb;
BEGIN
  -- Always clear this hole's automatic grants first: re-saving a corrected
  -- score must never stack a second award on top of the first.
  DELETE FROM golf_power_up_uses
  WHERE team_id = p_team_id AND hole_number = p_hole
    AND entry_type = 'grant' AND source = 'auto';

  SELECT * INTO v_score FROM golf_team_scores
  WHERE team_id = p_team_id AND hole_number = p_hole;

  -- No score entered (or cleared) = nothing to award
  IF v_score.id IS NULL OR COALESCE(v_score.strokes, 0) <= 0 THEN
    RETURN v_granted;
  END IF;

  SELECT par INTO v_par FROM golf_tournament_holes
  WHERE tournament_id = p_tournament_id AND hole_number = p_hole;
  v_par := COALESCE(v_par, 4);

  FOR v_card IN
    SELECT * FROM golf_power_ups
    WHERE tournament_id = p_tournament_id
      AND COALESCE(enabled, true) = true
      AND COALESCE(award_metric, 'none') <> 'none'
  LOOP
    v_metric := CASE v_card.award_metric
      WHEN 'score_vs_par' THEN (COALESCE(v_score.strokes,0) + COALESCE(v_score.penalties,0)) - v_par
      WHEN 'penalties'    THEN COALESCE(v_score.penalties, 0)
      WHEN 'strokes'      THEN COALESCE(v_score.strokes, 0)
      ELSE NULL
    END;

    IF v_metric IS NULL THEN CONTINUE; END IF;

    v_match := CASE COALESCE(v_card.award_comparator, 'lte')
      WHEN 'lte' THEN v_metric <= COALESCE(v_card.award_value, 0)
      WHEN 'gte' THEN v_metric >= COALESCE(v_card.award_value, 0)
      WHEN 'eq'  THEN v_metric  = COALESCE(v_card.award_value, 0)
      ELSE false
    END;

    IF v_match THEN
      INSERT INTO golf_power_up_uses
        (power_up_id, team_id, tournament_id, hole_number, used_by, entry_type, delta, source, option_label)
      VALUES
        (v_card.id, p_team_id, p_tournament_id, p_hole, 'auto',
         'grant', GREATEST(COALESCE(v_card.award_amount, 1), 1), 'auto', '');

      v_granted := v_granted || jsonb_build_object(
        'power_up_id', v_card.id,
        'name',        v_card.name,
        'icon',        v_card.icon,
        'color',       v_card.color,
        'kind',        v_card.kind,
        'amount',      GREATEST(COALESCE(v_card.award_amount, 1), 1),
        'message',     COALESCE(NULLIF(v_card.award_message, ''), v_card.description)
      );
    END IF;
  END LOOP;

  RETURN v_granted;
END;
$$;

-- ─────────────────────────────────────────────
-- Save a hole score, then evaluate awards in the same call
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION golf_save_score(
  p_bag_tag TEXT, p_hole INT, p_strokes INT,
  p_penalties INT DEFAULT 0, p_note TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player  golf_tournament_players%ROWTYPE;
  v_status  TEXT;
  v_granted JSONB;
BEGIN
  SELECT p.* INTO v_player FROM golf_tournament_players p
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag) LIMIT 1;

  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  SELECT status INTO v_status FROM golf_tournaments WHERE id = v_player.tournament_id;
  IF v_status = 'final' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This tournament is final — scores are locked');
  END IF;

  IF p_strokes < 0 OR p_strokes > 30 OR p_penalties < 0 OR p_penalties > 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That score looks out of range');
  END IF;

  INSERT INTO golf_team_scores (team_id, tournament_id, hole_number, strokes, penalties, note, updated_by, updated_at)
  VALUES (v_player.team_id, v_player.tournament_id, p_hole, p_strokes, COALESCE(p_penalties,0), COALESCE(p_note,''), v_player.name, NOW())
  ON CONFLICT (team_id, hole_number) DO UPDATE
    SET strokes = EXCLUDED.strokes,
        penalties = EXCLUDED.penalties,
        note = EXCLUDED.note,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW();

  v_granted := golf_eval_awards(v_player.team_id, v_player.tournament_id, p_hole);

  RETURN jsonb_build_object('ok', true, 'granted', v_granted);
END;
$$;

-- ─────────────────────────────────────────────
-- Replace the team's spends for one hole in a single atomic call.
-- p_selections: [{"power_up_id":"uuid","option_label":"Extra putt"}, ...]
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

  -- Clear what was previously marked for this hole, then re-add. Doing it in
  -- one function keeps the balance consistent if a player edits their picks.
  DELETE FROM golf_power_up_uses
  WHERE team_id = v_player.team_id AND hole_number = p_hole AND entry_type = 'spend';

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

    -- Balance check happens after the delete above, so re-saving the same
    -- hole doesn't count the existing spend against the team twice.
    v_left := golf_remaining(v_player.team_id, v_id);
    IF v_left <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'No ' || v_pu.name || ' left to use');
    END IF;

    INSERT INTO golf_power_up_uses
      (power_up_id, team_id, tournament_id, hole_number, used_by, entry_type, delta, source, option_label)
    VALUES
      (v_id, v_player.team_id, v_player.tournament_id, p_hole, v_player.name,
       'spend', -1, 'manual', v_opt);
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ─────────────────────────────────────────────
-- Keep the single-card claim working (Power-Ups tab)
-- ─────────────────────────────────────────────
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

-- Undo: only ever removes a team's own manual spend, never an auto grant
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
  WHERE id = p_use_id AND team_id = v_player.team_id AND entry_type = 'spend';

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ─────────────────────────────────────────────
-- State function now returns the full ledger
-- ─────────────────────────────────────────────
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

GRANT EXECUTE ON FUNCTION golf_remaining(UUID, UUID)                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_eval_awards(UUID, UUID, INT)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_save_score(TEXT, INT, INT, INT, TEXT)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_set_hole_power_ups(TEXT, INT, JSONB)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_use_power_up(TEXT, UUID, INT, TEXT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_undo_power_up(TEXT, UUID)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_tournament_state(UUID)                     TO anon, authenticated;

SELECT name, kind, uses_per_team AS starting, award_metric, award_comparator, award_value, award_amount
FROM golf_power_ups ORDER BY sort_order;
