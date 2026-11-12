-- =====================================================================
-- YARD$ v1.20 — 020 SELLER ANALYTICS
-- Run in the Supabase SQL Editor BEFORE pushing the v1.20 code.
-- Safe to re-run. Adds new things only; changes nothing that exists.
--
-- What it adds: real counts per sale of direction taps, shares and
-- "added to a route", plus one function that gives a seller the numbers
-- for their own sales (views, saves, directions, shares, route adds).
--
-- The LAST result should be a checklist where every row says PASS.
-- =====================================================================

DO $$
BEGIN
  IF to_regprocedure('public.yards_client_ip_key()') IS NULL THEN
    RAISE EXCEPTION 'Run 018_security_lockdown.sql first.';
  END IF;
END $$;

-- One row per person, per sale, per kind of action, per day.
-- (Same idea as view counts: tapping Directions ten times counts once.)
CREATE TABLE IF NOT EXISTS sale_events (
  sale_id    UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('directions', 'share', 'route_add')),
  actor_key  TEXT NOT NULL,
  event_day  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sale_id, kind, actor_key, event_day)
);
ALTER TABLE sale_events ENABLE ROW LEVEL SECURITY;  -- no policies: the app can't read or write it directly

-- Record one action. Called by the app; never trusts anything but the sale id and kind.
CREATE OR REPLACE FUNCTION log_sale_event(sale_id_input UUID, kind_input TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_key   TEXT;
BEGIN
  IF kind_input NOT IN ('directions', 'share', 'route_add') THEN
    RETURN;
  END IF;

  SELECT user_id INTO v_owner FROM sales WHERE id = sale_id_input;
  IF v_owner IS NULL THEN
    RETURN;  -- sale doesn't exist
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() = v_owner THEN
    RETURN;  -- a seller's own taps don't count
  END IF;

  v_key := COALESCE('u:' || auth.uid()::text, 'ip:' || yards_client_ip_key(), 'unknown');

  INSERT INTO sale_events (sale_id, kind, actor_key)
  VALUES (sale_id_input, kind_input, v_key)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION log_sale_event(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_sale_event(UUID, TEXT) TO anon, authenticated;

-- The signed-in seller's numbers, one row per sale they own.
-- Nobody can ask for someone else's.
CREATE OR REPLACE FUNCTION get_my_sale_stats()
RETURNS TABLE (
  sale_id    UUID,
  views      INT,
  saves      INT,
  directions INT,
  shares     INT,
  route_adds INT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    s.id,
    COALESCE(s.view_count, 0)::int,
    (SELECT COUNT(*) FROM saved_sales ss WHERE ss.sale_id = s.id AND ss.user_id <> s.user_id)::int,
    (SELECT COUNT(*) FROM sale_events e WHERE e.sale_id = s.id AND e.kind = 'directions')::int,
    (SELECT COUNT(*) FROM sale_events e WHERE e.sale_id = s.id AND e.kind = 'share')::int,
    (SELECT COUNT(*) FROM sale_events e WHERE e.sale_id = s.id AND e.kind = 'route_add')::int
  FROM sales s
  WHERE s.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION get_my_sale_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_sale_stats() TO authenticated;

-- CHECKLIST — every row should say PASS
SELECT * FROM (
  SELECT 1 AS n, 'Events table ready and locked' AS check_name,
    CASE WHEN to_regclass('public.sale_events') IS NOT NULL
      AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.sale_events'::regclass)
      AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sale_events')
    THEN 'PASS' ELSE 'FAIL' END AS result
  UNION ALL SELECT 2, 'Action logging function ready',
    CASE WHEN to_regprocedure('public.log_sale_event(uuid, text)') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  UNION ALL SELECT 3, 'Seller stats function ready',
    CASE WHEN to_regprocedure('public.get_my_sale_stats()') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
) checks
ORDER BY n;
