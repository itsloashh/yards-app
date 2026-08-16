-- =============================================
-- YARD$ GOLF — Hole challenges + rewards
-- Run in the Supabase SQL Editor (safe to re-run).
--
-- Adds a reward to each hole challenge, so "Long Drive" can carry
-- "Winner takes a free Bomber Bonus" etc.
-- =============================================

ALTER TABLE golf_tournament_holes
  ADD COLUMN IF NOT EXISTS challenge_reward TEXT DEFAULT '';

-- ─────────────────────────────────────────────
-- OPTIONAL CLEANUP — clears stray one-character challenges that came from
-- accidental keystrokes in the old free-text field (e.g. "*" or "C").
-- Review the SELECT first, then run the UPDATE if it looks right.
-- ─────────────────────────────────────────────
-- SELECT tournament_id, hole_number, challenge
-- FROM golf_tournament_holes
-- WHERE COALESCE(TRIM(challenge), '') <> '' AND length(TRIM(challenge)) <= 2;

-- UPDATE golf_tournament_holes
-- SET challenge = '', challenge_reward = ''
-- WHERE COALESCE(TRIM(challenge), '') <> '' AND length(TRIM(challenge)) <= 2;

SELECT hole_number, par, challenge, challenge_reward
FROM golf_tournament_holes
ORDER BY tournament_id, hole_number;
