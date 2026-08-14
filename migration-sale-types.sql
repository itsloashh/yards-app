-- =============================================
-- YARD$ — Sale Types (yard / estate / market / event)
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'yard';

-- Backfill any existing rows to the default type
UPDATE sales SET sale_type = 'yard' WHERE sale_type IS NULL OR sale_type = '';

SELECT 'sale_type ready' AS status;
