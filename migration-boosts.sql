-- =============================================
-- YARD$ AD BOOSTING + STRIPE — Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Track when a sale's boost expires (fast lookups for ranking/styling).
--    NULL or past = not boosted.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS boost_package TEXT;

-- 2. Boosts table — one row per purchase, full audit trail.
CREATE TABLE IF NOT EXISTS boosts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  package_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'cad',
  status TEXT DEFAULT 'pending',          -- pending | active | expired | failed
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boosts_sale ON boosts(sale_id);
CREATE INDEX IF NOT EXISTS idx_boosts_user ON boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_boosts_status ON boosts(status);

-- 3. RLS
ALTER TABLE boosts ENABLE ROW LEVEL SECURITY;

-- Users can see their own boosts
DROP POLICY IF EXISTS "Users can view own boosts" ON boosts;
CREATE POLICY "Users can view own boosts" ON boosts
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all boosts
DROP POLICY IF EXISTS "Admins can view all boosts" ON boosts;
CREATE POLICY "Admins can view all boosts" ON boosts
  FOR SELECT USING (is_admin());

-- NOTE: inserts/updates to boosts happen ONLY server-side via the Stripe webhook
-- using the service-role key, which bypasses RLS. No client insert policy on purpose —
-- users can't fake a boost without paying.

-- 4. Verify
SELECT 'boosts table ready' AS status;
