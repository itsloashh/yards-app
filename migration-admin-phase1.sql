-- =============================================
-- YARD$ ADMIN DASHBOARD — Phase 1 Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add a role column to profiles. Default 'user'; admins are 'admin'.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Helper function: returns true if the CURRENT logged-in user is an admin.
--    SECURITY DEFINER so it can read the profiles table regardless of RLS,
--    avoiding infinite recursion in policies that call it.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- 3. RLS policies — let admins read ALL profiles and ALL sales.
--    (Regular users keep their existing access; these are additive.)

-- Admins can read every profile
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Admins can update any profile (e.g. promote/demote, moderate)
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (is_admin());

-- Admins can read every sale (already public for SELECT, but explicit for clarity)
DROP POLICY IF EXISTS "Admins can read all sales" ON sales;
CREATE POLICY "Admins can read all sales" ON sales
  FOR SELECT USING (is_admin());

-- Admins can delete any sale (moderation)
DROP POLICY IF EXISTS "Admins can delete any sale" ON sales;
CREATE POLICY "Admins can delete any sale" ON sales
  FOR DELETE USING (is_admin());

-- 4. Make YOURSELF an admin. Replace the email below with your admin email.
--    (Run this part after the above succeeds.)
UPDATE profiles SET role = 'admin' WHERE email = 'itsloashh@gmail.com';

-- 5. Verify — should list your admin account
SELECT id, name, email, role FROM profiles WHERE role = 'admin';
