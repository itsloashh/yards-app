-- =============================================
-- YARD$ TRUST & SAFETY — Reports
-- Run this in Supabase SQL Editor
-- =============================================

-- Reports table — covers both sale reports and user reports.
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- What's being reported:
  target_type TEXT NOT NULL,          -- 'sale' | 'user'
  target_sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,               -- category key
  details TEXT DEFAULT '',            -- optional free text
  status TEXT DEFAULT 'open',         -- 'open' | 'dismissed' | 'actioned'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_sale ON reports(target_sale_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Signed-in users can create reports (must be the reporter)
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can see their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can view + update all reports (moderation)
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
CREATE POLICY "Admins can view all reports" ON reports
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON reports;
CREATE POLICY "Admins can update reports" ON reports
  FOR UPDATE USING (is_admin());

-- Verify
SELECT 'reports table ready' AS status;
