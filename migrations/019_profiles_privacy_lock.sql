-- =====================================================================
-- YARD$ v1.18 — 019 PROFILES PRIVACY LOCK
-- Run in the Supabase SQL Editor AFTER v1.18 is live on shopyards.ca
-- (wait for the Vercel deploy to finish first). Safe to re-run.
--
-- What it does: the full profiles table (emails, phone numbers, home
-- location) stops being readable by the public. People can read their own
-- row, admins can read all rows, and everyone else gets the safe
-- public_profiles view that migration 018 created.
--
-- Why it waits: the OLD app code reads seller names straight from the
-- profiles table. If you ran this first, sellers would show as "Unknown"
-- until the new code went live.
--
-- The LAST result should be a checklist where every row says PASS.
-- =====================================================================

-- Refuse to run if 018 hasn't been run yet
DO $$
BEGIN
  IF to_regclass('public.public_profiles') IS NULL THEN
    RAISE EXCEPTION 'Run 018_security_lockdown.sql first.';
  END IF;
END $$;

-- Drop every "anyone can read every profile" rule, whatever it was named
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND cmd = 'SELECT' AND TRIM(qual) = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON profiles', r.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- CHECKLIST — every row should say PASS
SELECT * FROM (
  SELECT 1 AS n, 'Profiles table no longer public' AS check_name,
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('SELECT', 'ALL') AND TRIM(qual) = 'true'
    ) THEN 'PASS' ELSE 'FAIL' END AS result
  UNION ALL SELECT 2, 'You can still read your own profile',
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users read own profile') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 3, 'Admins can still read all profiles',
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can read all profiles') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 4, 'Public profiles view still works',
    CASE WHEN (SELECT COUNT(*) FROM public_profiles) = (SELECT COUNT(*) FROM profiles) THEN 'PASS' ELSE 'FAIL' END
) checks
ORDER BY n;
