-- =====================================================================
-- YARD$ v1.18 — 018 SECURITY LOCKDOWN
-- Run in the Supabase SQL Editor BEFORE pushing the v1.18 code.
-- Safe to re-run. Changes no feature — it only closes holes.
--
-- The LAST result you see should be a checklist where every row says PASS.
-- =====================================================================

-- ─────────────────────────────────────────────
-- 0. Make sure every column the guards mention exists
-- ─────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sales_posted INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS boost_package TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'yard';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS region TEXT DEFAULT '';

-- ─────────────────────────────────────────────
-- 1. PROFILES — users can no longer make themselves admin or edit
--    their own rating / review count / sales count.
--
--    "Client" = a request coming from the app (browser). The server
--    (Stripe webhook, SQL editor, internal functions) is still trusted.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION yards_guard_profiles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trusted callers (service role, SQL editor, internal functions) pass through
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role         := 'user';
    NEW.rating       := 0;
    NEW.review_count := 0;
    NEW.sales_posted := 0;
    NEW.created_at   := NOW();
  ELSIF NOT is_admin() THEN
    NEW.id           := OLD.id;
    NEW.role         := OLD.role;
    NEW.rating       := OLD.rating;
    NEW.review_count := OLD.review_count;
    NEW.sales_posted := OLD.sales_posted;
    NEW.email        := OLD.email;
    NEW.created_at   := OLD.created_at;
  END IF;

  -- Length limits (only checked on values being written now)
  IF (TG_OP = 'INSERT' OR NEW.name IS DISTINCT FROM OLD.name) AND char_length(COALESCE(NEW.name, '')) > 80 THEN
    RAISE EXCEPTION 'Name is too long (80 characters max).';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.bio IS DISTINCT FROM OLD.bio) AND char_length(COALESCE(NEW.bio, '')) > 500 THEN
    RAISE EXCEPTION 'Bio is too long (500 characters max).';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone) AND char_length(COALESCE(NEW.phone, '')) > 30 THEN
    RAISE EXCEPTION 'Phone number is too long.';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.location IS DISTINCT FROM OLD.location) AND char_length(COALESCE(NEW.location, '')) > 200 THEN
    RAISE EXCEPTION 'Location is too long.';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
     AND COALESCE(NEW.avatar_url, '') <> ''
     AND (NEW.avatar_url !~ '^https://' OR char_length(NEW.avatar_url) > 600) THEN
    RAISE EXCEPTION 'That profile photo link is not valid.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_yards_guard_profiles ON profiles;
CREATE TRIGGER trg_yards_guard_profiles
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION yards_guard_profiles();

-- ─────────────────────────────────────────────
-- 2. SALES — sellers can no longer give themselves a free boost,
--    fake their view count, or move a sale to another account.
--    Also adds sane size limits.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION yards_guard_sales()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_item TEXT;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.boosted_until := NULL;
    NEW.boost_package := NULL;
    NEW.view_count    := 0;
    NEW.created_at    := NOW();
  ELSE
    NEW.id            := OLD.id;
    NEW.user_id       := OLD.user_id;
    NEW.boosted_until := OLD.boosted_until;
    NEW.boost_package := OLD.boost_package;
    NEW.view_count    := OLD.view_count;
    NEW.created_at    := OLD.created_at;
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.title IS DISTINCT FROM OLD.title) THEN
    IF char_length(TRIM(COALESCE(NEW.title, ''))) = 0 THEN
      RAISE EXCEPTION 'Please add a title.';
    END IF;
    IF char_length(NEW.title) > 150 THEN
      RAISE EXCEPTION 'Title is too long (150 characters max).';
    END IF;
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.description IS DISTINCT FROM OLD.description) AND char_length(COALESCE(NEW.description, '')) > 5000 THEN
    RAISE EXCEPTION 'Description is too long (5,000 characters max).';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.address IS DISTINCT FROM OLD.address) AND char_length(COALESCE(NEW.address, '')) > 300 THEN
    RAISE EXCEPTION 'Address is too long.';
  END IF;
  IF char_length(COALESCE(NEW.city, '')) > 120 OR char_length(COALESCE(NEW.region, '')) > 120
     OR char_length(COALESCE(NEW.date_display, '')) > 160 OR char_length(COALESCE(NEW.sale_type, '')) > 30
     OR char_length(COALESCE(NEW.start_time, '')) > 10 OR char_length(COALESCE(NEW.end_time, '')) > 10 THEN
    RAISE EXCEPTION 'One of the sale details is too long.';
  END IF;

  IF NEW.lat IS NULL OR NEW.lng IS NULL OR NEW.lat < -90 OR NEW.lat > 90 OR NEW.lng < -180 OR NEW.lng > 180 THEN
    RAISE EXCEPTION 'That location is not valid.';
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.tags IS DISTINCT FROM OLD.tags) THEN
    IF COALESCE(array_length(NEW.tags, 1), 0) > 25 THEN
      RAISE EXCEPTION 'Too many categories.';
    END IF;
    FOREACH v_item IN ARRAY COALESCE(NEW.tags, '{}') LOOP
      IF char_length(COALESCE(v_item, '')) > 40 THEN
        RAISE EXCEPTION 'A category name is too long.';
      END IF;
    END LOOP;
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.photos IS DISTINCT FROM OLD.photos) THEN
    IF COALESCE(array_length(NEW.photos, 1), 0) > 10 THEN
      RAISE EXCEPTION 'Too many photos.';
    END IF;
    FOREACH v_item IN ARRAY COALESCE(NEW.photos, '{}') LOOP
      IF v_item IS NULL OR v_item !~ '^https://' OR char_length(v_item) > 600 THEN
        RAISE EXCEPTION 'One of the photos is not valid.';
      END IF;
    END LOOP;
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.featured_items IS DISTINCT FROM OLD.featured_items)
     AND char_length(COALESCE(NEW.featured_items, '[]'::jsonb)::text) > 10000 THEN
    RAISE EXCEPTION 'Too many featured items.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_yards_guard_sales ON sales;
CREATE TRIGGER trg_yards_guard_sales
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION yards_guard_sales();

-- "Sales posted" is now counted by the database, not by the phone.
CREATE OR REPLACE FUNCTION yards_count_sale_posted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET sales_posted = COALESCE(sales_posted, 0) + 1 WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_yards_count_sale_posted ON sales;
CREATE TRIGGER trg_yards_count_sale_posted
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION yards_count_sale_posted();

CREATE INDEX IF NOT EXISTS idx_sales_user ON sales (user_id);

-- ─────────────────────────────────────────────
-- 3. Who is calling? (used for throttles — stores a daily hash, never the raw IP)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION yards_client_ip_key()
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  h  JSON;
  ip TEXT;
BEGIN
  BEGIN
    h := NULLIF(current_setting('request.headers', true), '')::json;
  EXCEPTION WHEN OTHERS THEN
    h := NULL;
  END;
  ip := COALESCE(
    NULLIF(TRIM(h->>'cf-connecting-ip'), ''),
    NULLIF(TRIM(split_part(COALESCE(h->>'x-forwarded-for', ''), ',', 1)), '')
  );
  IF ip IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN md5(ip || ':' || CURRENT_DATE::text);
END;
$$;
REVOKE ALL ON FUNCTION yards_client_ip_key() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────
-- 4. VIEW COUNTS — one view per person, per sale, per day.
--    (Before: anyone could loop the counter forever.)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_view_log (
  sale_id    UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  viewer_key TEXT NOT NULL,
  view_day   DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (sale_id, viewer_key, view_day)
);
CREATE INDEX IF NOT EXISTS idx_sale_view_log_day ON sale_view_log (view_day);
ALTER TABLE sale_view_log ENABLE ROW LEVEL SECURITY;  -- no policies: app can't read or write it directly

CREATE OR REPLACE FUNCTION increment_sale_views(sale_id_input UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_key TEXT;
  v_new INT;
BEGIN
  v_key := COALESCE('u:' || auth.uid()::text, 'ip:' || yards_client_ip_key(), 'unknown');

  BEGIN
    INSERT INTO sale_view_log (sale_id, viewer_key) VALUES (sale_id_input, v_key)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_new = ROW_COUNT;
  EXCEPTION WHEN foreign_key_violation THEN
    RETURN;  -- sale doesn't exist
  END;

  IF v_new = 1 THEN
    UPDATE sales SET view_count = COALESCE(view_count, 0) + 1 WHERE id = sale_id_input;
  END IF;

  -- Light housekeeping
  IF random() < 0.02 THEN
    DELETE FROM sale_view_log WHERE view_day < CURRENT_DATE - 2;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION increment_sale_views(UUID) TO anon, authenticated;

-- ─────────────────────────────────────────────
-- 5. REPORTS + REVIEWS — size limits and daily throttles
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION yards_my_recent_count(p_table TEXT)
RETURNS INT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  n INT;
BEGIN
  IF p_table = 'reports' THEN
    SELECT COUNT(*) INTO n FROM reports WHERE reporter_id = auth.uid() AND created_at > NOW() - INTERVAL '24 hours';
  ELSIF p_table = 'reviews' THEN
    SELECT COUNT(*) INTO n FROM reviews WHERE reviewer_id = auth.uid() AND created_at > NOW() - INTERVAL '24 hours';
  ELSE
    n := 0;
  END IF;
  RETURN COALESCE(n, 0);
END;
$$;
REVOKE ALL ON FUNCTION yards_my_recent_count(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION yards_my_recent_count(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION yards_guard_reports()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  NEW.status      := 'open';
  NEW.resolved_at := NULL;
  NEW.resolved_by := NULL;
  NEW.created_at  := NOW();
  NEW.details     := LEFT(COALESCE(NEW.details, ''), 2000);
  IF char_length(COALESCE(NEW.reason, '')) > 60 OR NEW.target_type NOT IN ('sale', 'user') THEN
    RAISE EXCEPTION 'That report is not valid.';
  END IF;
  IF yards_my_recent_count('reports') >= 15 THEN
    RAISE EXCEPTION 'You''ve sent a lot of reports today. Please try again tomorrow.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_yards_guard_reports ON reports;
CREATE TRIGGER trg_yards_guard_reports
  BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION yards_guard_reports();

CREATE OR REPLACE FUNCTION yards_guard_reviews()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.id          := OLD.id;
    NEW.seller_id   := OLD.seller_id;
    NEW.reviewer_id := OLD.reviewer_id;
    NEW.created_at  := OLD.created_at;
  ELSE
    NEW.created_at := NOW();
    IF yards_my_recent_count('reviews') >= 10 THEN
      RAISE EXCEPTION 'You''ve left a lot of reviews today. Please try again tomorrow.';
    END IF;
  END IF;

  IF char_length(COALESCE(NEW.comment, '')) > 2000 THEN
    RAISE EXCEPTION 'Review is too long (2,000 characters max).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_yards_guard_reviews ON reviews;
CREATE TRIGGER trg_yards_guard_reviews
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION yards_guard_reviews();

CREATE INDEX IF NOT EXISTS idx_reports_target_user ON reports (target_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sales_sale ON saved_sales (sale_id);

-- ─────────────────────────────────────────────
-- 6. PUBLIC PROFILES — the safe, public slice of a profile.
--    No email, no home location. Phone only for people with a current sale
--    (same people whose phone the app already shows under "Contact Seller").
--    The v1.18 app reads this. Migration 019 then closes the full table.
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  p.id,
  p.name,
  p.bio,
  p.avatar_color,
  p.avatar_url,
  p.rating,
  p.review_count,
  p.sales_posted,
  p.created_at,
  CASE WHEN EXISTS (
    SELECT 1 FROM sales s
    WHERE s.user_id = p.id
      AND (s.created_at > NOW() - INTERVAL '31 days' OR s.expires_at > NOW())
  ) THEN p.phone ELSE '' END AS phone
FROM profiles p;

GRANT SELECT ON public_profiles TO anon, authenticated;

-- ─────────────────────────────────────────────
-- 7. PHOTO UPLOADS — images only, 8 MB max, and only into your own folder
-- ─────────────────────────────────────────────
UPDATE storage.buckets
SET file_size_limit = 8388608,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('sale-photos', 'avatars');

DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own sale photos" ON storage.objects;
CREATE POLICY "Users upload own sale photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'sale-photos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────────
-- 8. BOOSTS — one boost row per Stripe checkout, so a repeated
--    Stripe notification can never add the time twice.
-- ─────────────────────────────────────────────
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_boosts_stripe_session
    ON boosts (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add unique index on boosts.stripe_session_id: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────
-- 9. GOLF — bag tags
--    a) One place decides which player a tag belongs to. It always picks the
--       NEWEST tournament (same rule sign-in already used), so a reused tag
--       number can't write scores into an old event.
--    b) Guessing lots of different tags from one device gets paused for
--       10 minutes. Re-trying the same tag never counts against you.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS golf_tag_attempts (
  client_key   TEXT NOT NULL,
  tag_hash     TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_golf_tag_attempts ON golf_tag_attempts (client_key, attempted_at);
ALTER TABLE golf_tag_attempts ENABLE ROW LEVEL SECURITY;  -- no policies: internal only

CREATE OR REPLACE FUNCTION golf_resolve_tag(p_bag_tag TEXT)
RETURNS golf_tournament_players
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
  v_key    TEXT := yards_client_ip_key();
  v_wrong  INT := 0;
BEGIN
  IF v_key IS NOT NULL THEN
    SELECT COUNT(DISTINCT tag_hash) INTO v_wrong
    FROM golf_tag_attempts
    WHERE client_key = v_key AND attempted_at > NOW() - INTERVAL '10 minutes';
    IF v_wrong >= 10 THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT p.* INTO v_player
  FROM golf_tournament_players p
  JOIN golf_tournaments t ON t.id = p.tournament_id
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag)
    AND t.status IN ('draft', 'live', 'final')
  ORDER BY t.tournament_date DESC NULLS LAST, t.created_at DESC, p.id
  LIMIT 1;

  IF v_player.id IS NULL THEN
    IF v_key IS NOT NULL THEN
      INSERT INTO golf_tag_attempts (client_key, tag_hash)
      VALUES (v_key, md5(COALESCE(TRIM(p_bag_tag), '')));
      IF random() < 0.05 THEN
        DELETE FROM golf_tag_attempts WHERE attempted_at < NOW() - INTERVAL '1 day';
      END IF;
    END IF;
    RETURN NULL;
  END IF;

  RETURN v_player;
END;
$$;
REVOKE ALL ON FUNCTION golf_resolve_tag(TEXT) FROM PUBLIC, anon, authenticated;

-- Point every bag-tag function at that one resolver.
-- This edits ONLY the tag lookup line inside each live function and leaves
-- the rest of the function exactly as it is in your database today.
DO $$
DECLARE
  r     RECORD;
  v_def TEXT;
  v_new TEXT;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('golf_tag_signin', 'golf_save_score', 'golf_use_power_up',
                        'golf_set_hole_power_ups', 'golf_undo_power_up', 'golf_set_challenge_win')
  LOOP
    v_def := pg_get_functiondef(r.oid);
    IF v_def LIKE '%golf_resolve_tag(%' THEN
      CONTINUE;  -- already done
    END IF;
    v_new := regexp_replace(
      v_def,
      'SELECT\s+p\.\*\s+INTO\s+v_player\s+FROM\s+golf_tournament_players\s+p.*?LIMIT\s+1\s*;',
      'v_player := golf_resolve_tag(p_bag_tag);',
      'i'
    );
    IF v_new = v_def THEN
      RAISE WARNING 'Could not update the tag lookup in % — tell Claude', r.proname;
    ELSE
      EXECUTE v_new;
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- 10. GOLF — admin-only setup functions now actually check for admin.
--     Same technique: adds one line at the top, leaves the rest alone.
-- ─────────────────────────────────────────────
DO $$
DECLARE
  r     RECORD;
  v_def TEXT;
  v_new TEXT;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('golf_setup_holes', 'golf_set_jackpot_hole', 'golf_seed_holes')
  LOOP
    v_def := pg_get_functiondef(r.oid);
    IF v_def LIKE '%is_admin()%' THEN
      CONTINUE;  -- already done
    END IF;
    v_new := regexp_replace(
      v_def,
      '\nBEGIN\s*\n',
      E'\nBEGIN\n  IF NOT is_admin() THEN\n    RAISE EXCEPTION ''Not permitted'';\n  END IF;\n',
      'i'
    );
    IF v_new = v_def THEN
      RAISE WARNING 'Could not add the admin check to % — tell Claude', r.proname;
    ELSE
      EXECUTE v_new;
    END IF;
  END LOOP;
END $$;

-- Internal-only: the awards calculator is called by golf_save_score, never by the app.
DO $$
BEGIN
  REVOKE ALL ON FUNCTION golf_eval_awards(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;

-- ─────────────────────────────────────────────
-- CHECKLIST — every row should say PASS
-- ─────────────────────────────────────────────
SELECT * FROM (
  SELECT 1 AS n, 'Profiles guard on' AS check_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_yards_guard_profiles') THEN 'PASS' ELSE 'FAIL' END AS result
  UNION ALL SELECT 2, 'Sales guard on',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_yards_guard_sales') THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 3, 'Reports + reviews guards on',
    CASE WHEN (SELECT COUNT(*) FROM pg_trigger WHERE tgname IN ('trg_yards_guard_reports', 'trg_yards_guard_reviews')) = 2 THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 4, 'Public profiles view ready',
    CASE WHEN to_regclass('public.public_profiles') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 5, 'Photo buckets limited to images',
    CASE WHEN NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id IN ('sale-photos', 'avatars') AND (file_size_limit IS NULL OR allowed_mime_types IS NULL)) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 6, 'Uploads restricted to own folder',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'INSERT'
        AND with_check LIKE '%sale-photos%' AND with_check NOT LIKE '%foldername%'
    ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 7, 'Golf tag functions use the resolver',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
      WHERE ns.nspname = 'public'
        AND p.proname IN ('golf_tag_signin', 'golf_save_score', 'golf_use_power_up',
                          'golf_set_hole_power_ups', 'golf_undo_power_up', 'golf_set_challenge_win')
        AND pg_get_functiondef(p.oid) NOT LIKE '%golf_resolve_tag(%'
    ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 8, 'Golf setup functions are admin-only',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
      WHERE ns.nspname = 'public'
        AND p.proname IN ('golf_setup_holes', 'golf_set_jackpot_hole', 'golf_seed_holes')
        AND pg_get_functiondef(p.oid) NOT LIKE '%is_admin()%'
    ) THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 9, 'Only one admin (you)',
    CASE WHEN (SELECT COUNT(*) FROM profiles WHERE role = 'admin') = 1 THEN 'PASS' ELSE 'CHECK — ' || (SELECT COUNT(*) FROM profiles WHERE role = 'admin') || ' admins' END
  UNION ALL SELECT 10, 'No boosts without a payment',
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM sales s WHERE s.boosted_until > NOW()
        AND NOT EXISTS (SELECT 1 FROM boosts b WHERE b.sale_id = s.id AND b.status = 'active')
    ) THEN 'PASS' ELSE 'CHECK — a sale is boosted with no paid boost' END
) checks
ORDER BY n;
