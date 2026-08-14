-- =============================================
-- YARD$ SEO — city/region on sales
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add city + region columns so we can group sales into city landing pages.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS region TEXT DEFAULT '';

-- 2. Index for fast city lookups (the SEO pages query by city).
CREATE INDEX IF NOT EXISTS idx_sales_city ON sales (lower(city));

-- 3. Backfill: we leave existing sales' city empty here and let the app populate
--    them accurately. The create/edit flow now captures city from geocoding.
--    To backfill existing rows accurately, open the admin dashboard — a one-time
--    "Backfill cities" action can be run there, or simply re-save each sale.
--    (Parsing cities reliably from free-text addresses in SQL is error-prone, so
--    we deliberately avoid guessing here to keep landing pages accurate.)

-- 4. Verify columns exist
SELECT id, address, city, region FROM sales LIMIT 20;
