-- =============================================
-- YARD$ GOLF — split game header image from rules reference images
-- Run this in the Supabase SQL Editor (safe to run more than once)
--
-- WHY: golf_games had a single `images` array, and the app used images[0]
-- as the card/header cover. That meant uploading a rules sheet turned the
-- rules sheet into the header. These are now two separate fields.
-- =============================================

-- ─── New columns ───
ALTER TABLE golf_games
  ADD COLUMN IF NOT EXISTS header_image TEXT,               -- single banner photo for the card + detail header
  ADD COLUMN IF NOT EXISTS rules_images TEXT[] DEFAULT '{}'; -- zoomable rules sheets / reference images

-- ─── Backfill existing rows ───
-- Everything previously uploaded was really a rules reference, so move the
-- whole `images` array into rules_images and leave header_image empty.
-- (Only touches rows that haven't been migrated yet.)
UPDATE golf_games
SET rules_images = images
WHERE COALESCE(array_length(images, 1), 0) > 0
  AND COALESCE(array_length(rules_images, 1), 0) = 0;

-- NOTE: the old `images` column is intentionally left in place so nothing
-- breaks if you roll back. It is no longer read by the app.

SELECT
  name,
  header_image IS NOT NULL AS has_header,
  COALESCE(array_length(rules_images, 1), 0) AS rules_image_count
FROM golf_games
ORDER BY sort_order, created_at;
