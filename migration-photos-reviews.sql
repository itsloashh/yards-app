-- =============================================
-- YARD$ — Profile Photos + Seller Reviews
-- Run this in Supabase SQL Editor
-- =============================================

-- ─── 1. PROFILE PHOTOS ───
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';

-- Storage bucket for avatars (public read). Create via dashboard OR this SQL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can view; users manage their own avatar files.
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── 2. SELLER REVIEWS ───
-- A review is left by a signed-in user on a seller, optionally tied to a sale.
-- One review per reviewer per seller (editable).
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- one review per reviewer per seller
  UNIQUE (seller_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
DROP POLICY IF EXISTS "Reviews public read" ON reviews;
CREATE POLICY "Reviews public read" ON reviews FOR SELECT USING (true);

-- Signed-in users can create their own review (and not review themselves)
DROP POLICY IF EXISTS "Users create own review" ON reviews;
CREATE POLICY "Users create own review" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id AND auth.uid() <> seller_id);

-- Users can edit/delete their own review
DROP POLICY IF EXISTS "Users update own review" ON reviews;
CREATE POLICY "Users update own review" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Users delete own review" ON reviews;
CREATE POLICY "Users delete own review" ON reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- ─── 3. CACHED RATING ON PROFILES ───
-- Keep an average rating + count on the profile for fast display.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

-- Function: recompute a seller's rating aggregate
CREATE OR REPLACE FUNCTION recompute_seller_rating(seller UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE seller_id = seller), 0),
    review_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE seller_id = seller), 0)
  WHERE id = seller;
END;
$$;

-- Trigger: after any change to reviews, recompute the affected seller's aggregate
CREATE OR REPLACE FUNCTION reviews_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM recompute_seller_rating(OLD.seller_id);
    RETURN OLD;
  ELSE
    PERFORM recompute_seller_rating(NEW.seller_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_change ON reviews;
CREATE TRIGGER trg_reviews_change
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION reviews_after_change();

-- Verify
SELECT 'profile photos + reviews ready' AS status;
