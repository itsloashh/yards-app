-- =============================================
-- YARD$ MIGRATION: View Counter (v3.22)
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add view_count column to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. Atomic increment function — avoids race conditions when multiple
--    people view a sale at the same time. SECURITY DEFINER lets any
--    viewer (even anonymous) bump the count without needing UPDATE rights
--    on the whole row.
CREATE OR REPLACE FUNCTION increment_sale_views(sale_id_input UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE sales SET view_count = COALESCE(view_count, 0) + 1 WHERE id = sale_id_input;
$$;

-- 3. Allow the function to be called by anyone (anon + authenticated)
GRANT EXECUTE ON FUNCTION increment_sale_views(UUID) TO anon, authenticated;
