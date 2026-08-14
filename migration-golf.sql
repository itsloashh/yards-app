-- =============================================
-- YARD$ GOLF — Shop products + Games
-- Run this in Supabase SQL Editor
-- =============================================

-- ─── GOLF PRODUCTS (shop) ───
CREATE TABLE IF NOT EXISTS golf_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_cents INT NOT NULL DEFAULT 0,          -- price in cents (CAD)
  images TEXT[] DEFAULT '{}',                   -- product photo URLs
  category TEXT DEFAULT '',                      -- e.g. apparel, gear, accessories
  in_stock BOOLEAN DEFAULT true,
  stock_qty INT,                                -- optional inventory count (null = untracked)
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,                   -- show in shop
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_golf_products_active ON golf_products(active, sort_order);

ALTER TABLE golf_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
DROP POLICY IF EXISTS "Golf products public read" ON golf_products;
CREATE POLICY "Golf products public read" ON golf_products
  FOR SELECT USING (active = true OR is_admin());

-- Only admins can manage products
DROP POLICY IF EXISTS "Admins manage golf products" ON golf_products;
CREATE POLICY "Admins manage golf products" ON golf_products
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── GOLF GAMES (reference content) ───
CREATE TABLE IF NOT EXISTS golf_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',                       -- short one-liner
  players TEXT DEFAULT '',                       -- e.g. "2-4 players"
  difficulty TEXT DEFAULT '',                    -- e.g. Easy / Medium / Hard
  rules TEXT DEFAULT '',                         -- full rules (markdown-ish text)
  images TEXT[] DEFAULT '{}',                    -- rule reference images (added later)
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_golf_games_active ON golf_games(active, sort_order);

ALTER TABLE golf_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Golf games public read" ON golf_games;
CREATE POLICY "Golf games public read" ON golf_games
  FOR SELECT USING (active = true OR is_admin());

DROP POLICY IF EXISTS "Admins manage golf games" ON golf_games;
CREATE POLICY "Admins manage golf games" ON golf_games
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── STORAGE BUCKET for golf images (products + game references) ───
INSERT INTO storage.buckets (id, name, public)
VALUES ('golf', 'golf', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Golf images public read" ON storage.objects;
CREATE POLICY "Golf images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'golf');

DROP POLICY IF EXISTS "Admins upload golf images" ON storage.objects;
CREATE POLICY "Admins upload golf images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'golf' AND is_admin());

DROP POLICY IF EXISTS "Admins update golf images" ON storage.objects;
CREATE POLICY "Admins update golf images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'golf' AND is_admin());

DROP POLICY IF EXISTS "Admins delete golf images" ON storage.objects;
CREATE POLICY "Admins delete golf images" ON storage.objects
  FOR DELETE USING (bucket_id = 'golf' AND is_admin());

SELECT 'golf section ready' AS status;
