-- =============================================
-- YARD$ DATABASE SCHEMA
-- Run this in Supabase SQL Editor (one time)
-- =============================================

-- Users profile table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  bio TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '#059669',
  sales_posted INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT DEFAULT '',
  date_display TEXT DEFAULT 'TBD',
  date_raw DATE,
  start_time TEXT,
  end_time TEXT,
  tags TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  featured_items JSONB DEFAULT '[]',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved sales (user favorites)
CREATE TABLE IF NOT EXISTS saved_sales (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, sale_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_sales ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only owner can update
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Sales: anyone can read, only owner can insert/update/delete
CREATE POLICY "Sales are viewable by everyone" ON sales FOR SELECT USING (true);
CREATE POLICY "Users can create sales" ON sales FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sales" ON sales FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sales" ON sales FOR DELETE USING (auth.uid() = user_id);

-- Saved: only owner can manage their saves
CREATE POLICY "Users can view own saves" ON saved_sales FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save sales" ON saved_sales FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave sales" ON saved_sales FOR DELETE USING (auth.uid() = user_id);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_sales_location ON sales (lat, lng);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_expires ON sales (expires_at);

-- Enable realtime for sales (so new sales appear instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
