-- =============================================
-- YARD$ GOLF — Live tournament scoring
-- Run this in the Supabase SQL Editor (safe to re-run).
--
-- MODEL
--   tournament -> teams -> players (each player holds a physical bag tag)
--   scoring is per TEAM per HOLE (scramble = one team score)
--   the bag tag number is the credential; all writes go through
--   SECURITY DEFINER functions that validate it.
--
-- SECURITY NOTE
--   golf_tournament_players holds the bag tags, so it is admin-read-only.
--   Public data (teams, holes, scores, power-ups) is exposed through the
--   golf_tournament_state() function and through public SELECT on the two
--   tables Realtime needs to broadcast.
-- =============================================

-- ─── TOURNAMENTS ───
CREATE TABLE IF NOT EXISTS golf_tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course TEXT DEFAULT '',
  tournament_date DATE,
  format TEXT DEFAULT '2-Man Scramble',
  status TEXT DEFAULT 'draft',            -- draft | live | final
  holes_count INT DEFAULT 18,
  notes TEXT DEFAULT '',                  -- shown to players on their info tab
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HOLE SETUP (par + challenge holes) ───
CREATE TABLE IF NOT EXISTS golf_tournament_holes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES golf_tournaments(id) ON DELETE CASCADE,
  hole_number INT NOT NULL,
  par INT DEFAULT 4,
  yardage INT,
  challenge TEXT DEFAULT '',              -- e.g. "Long Drive", "Closest to the Pin"
  UNIQUE (tournament_id, hole_number)
);

-- ─── TEAMS ───
CREATE TABLE IF NOT EXISTS golf_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES golf_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  flight TEXT DEFAULT '',
  tee_time TEXT DEFAULT '',               -- free text so "8:10 AM" displays exactly as entered
  starting_hole INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PLAYERS + BAG TAGS (admin-read-only: tags are credentials) ───
CREATE TABLE IF NOT EXISTS golf_tournament_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES golf_tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES golf_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bag_tag TEXT NOT NULL,                  -- the number printed on the physical tag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, bag_tag)
);

-- ─── TEAM SCORES (one row per team per hole) ───
CREATE TABLE IF NOT EXISTS golf_team_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES golf_teams(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES golf_tournaments(id) ON DELETE CASCADE,
  hole_number INT NOT NULL,
  strokes INT DEFAULT 0,
  penalties INT DEFAULT 0,
  note TEXT DEFAULT '',
  updated_by TEXT DEFAULT '',             -- player name who entered it
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, hole_number)
);

-- ─── POWER-UPS (defined per tournament) ───
CREATE TABLE IF NOT EXISTS golf_power_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES golf_tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',                   -- optional emoji
  uses_per_team INT DEFAULT 1,
  sort_order INT DEFAULT 0
);

-- ─── POWER-UP USAGE ───
CREATE TABLE IF NOT EXISTS golf_power_up_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  power_up_id UUID REFERENCES golf_power_ups(id) ON DELETE CASCADE,
  team_id UUID REFERENCES golf_teams(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES golf_tournaments(id) ON DELETE CASCADE,
  hole_number INT,
  used_by TEXT DEFAULT '',
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_golf_teams_tournament ON golf_teams(tournament_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_golf_scores_tournament ON golf_team_scores(tournament_id);
CREATE INDEX IF NOT EXISTS idx_golf_scores_team ON golf_team_scores(team_id, hole_number);
CREATE INDEX IF NOT EXISTS idx_golf_pu_uses_team ON golf_power_up_uses(team_id);
CREATE INDEX IF NOT EXISTS idx_golf_players_tag ON golf_tournament_players(tournament_id, bag_tag);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE golf_tournaments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_tournament_holes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_team_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_power_ups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_power_up_uses      ENABLE ROW LEVEL SECURITY;

-- Tournaments: public can see live/final ones
DROP POLICY IF EXISTS "Tournaments public read" ON golf_tournaments;
CREATE POLICY "Tournaments public read" ON golf_tournaments
  FOR SELECT USING (status IN ('live','final') OR is_admin());
DROP POLICY IF EXISTS "Admins manage tournaments" ON golf_tournaments;
CREATE POLICY "Admins manage tournaments" ON golf_tournaments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Holes / teams: public read (no secrets here)
DROP POLICY IF EXISTS "Holes public read" ON golf_tournament_holes;
CREATE POLICY "Holes public read" ON golf_tournament_holes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage holes" ON golf_tournament_holes;
CREATE POLICY "Admins manage holes" ON golf_tournament_holes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Teams public read" ON golf_teams;
CREATE POLICY "Teams public read" ON golf_teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage teams" ON golf_teams;
CREATE POLICY "Admins manage teams" ON golf_teams
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Players: ADMIN ONLY (this table holds the bag tags).
-- Player names reach the app through golf_tournament_state() instead.
DROP POLICY IF EXISTS "Admins manage players" ON golf_tournament_players;
CREATE POLICY "Admins manage players" ON golf_tournament_players
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Scores + power-up uses: public READ so Realtime can broadcast changes.
-- Writes are blocked here and only happen through the functions below.
DROP POLICY IF EXISTS "Scores public read" ON golf_team_scores;
CREATE POLICY "Scores public read" ON golf_team_scores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage scores" ON golf_team_scores;
CREATE POLICY "Admins manage scores" ON golf_team_scores
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Power up uses public read" ON golf_power_up_uses;
CREATE POLICY "Power up uses public read" ON golf_power_up_uses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage power up uses" ON golf_power_up_uses;
CREATE POLICY "Admins manage power up uses" ON golf_power_up_uses
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Power ups public read" ON golf_power_ups;
CREATE POLICY "Power ups public read" ON golf_power_ups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage power ups" ON golf_power_ups;
CREATE POLICY "Admins manage power ups" ON golf_power_ups
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- =============================================
-- FUNCTIONS (bag tag = the credential)
-- =============================================

-- Sign in with a bag tag number. Returns the player's whole round setup:
-- tournament, their team + partner, playing competitors (same tee time and
-- starting hole), hole/challenge list and the power-up catalogue.
CREATE OR REPLACE FUNCTION golf_tag_signin(p_bag_tag TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player  golf_tournament_players%ROWTYPE;
  v_team    golf_teams%ROWTYPE;
  v_tourney golf_tournaments%ROWTYPE;
  v_result  JSONB;
BEGIN
  SELECT p.* INTO v_player
  FROM golf_tournament_players p
  JOIN golf_tournaments t ON t.id = p.tournament_id
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag)
    AND t.status IN ('draft','live','final')
  ORDER BY t.tournament_date DESC NULLS LAST
  LIMIT 1;

  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  SELECT * INTO v_team    FROM golf_teams        WHERE id = v_player.team_id;
  SELECT * INTO v_tourney FROM golf_tournaments  WHERE id = v_player.tournament_id;

  SELECT jsonb_build_object(
    'ok', true,
    'player',     jsonb_build_object('id', v_player.id, 'name', v_player.name, 'bag_tag', v_player.bag_tag),
    'tournament', to_jsonb(v_tourney),
    'team',       to_jsonb(v_team),
    'partners', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p2.id, 'name', p2.name) ORDER BY p2.name), '[]'::jsonb)
      FROM golf_tournament_players p2
      WHERE p2.team_id = v_player.team_id AND p2.id <> v_player.id
    ),
    'competitors', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'team_id', t2.id, 'team_name', t2.name, 'flight', t2.flight,
        'players', (
          SELECT COALESCE(jsonb_agg(p3.name ORDER BY p3.name), '[]'::jsonb)
          FROM golf_tournament_players p3 WHERE p3.team_id = t2.id
        )) ORDER BY t2.name), '[]'::jsonb)
      FROM golf_teams t2
      WHERE t2.tournament_id = v_player.tournament_id
        AND t2.id <> v_team.id
        AND t2.tee_time = v_team.tee_time
        AND t2.starting_hole = v_team.starting_hole
    ),
    'holes', (
      SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.hole_number), '[]'::jsonb)
      FROM golf_tournament_holes h WHERE h.tournament_id = v_player.tournament_id
    ),
    'power_ups', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pu) ORDER BY pu.sort_order, pu.name), '[]'::jsonb)
      FROM golf_power_ups pu WHERE pu.tournament_id = v_player.tournament_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Everything the live board needs, without ever exposing a bag tag.
CREATE OR REPLACE FUNCTION golf_tournament_state(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'ok', true,
    'tournament', (SELECT to_jsonb(t) FROM golf_tournaments t WHERE t.id = p_tournament_id),
    'holes', (
      SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.hole_number), '[]'::jsonb)
      FROM golf_tournament_holes h WHERE h.tournament_id = p_tournament_id
    ),
    'teams', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'flight', t.flight,
        'tee_time', t.tee_time, 'starting_hole', t.starting_hole,
        'players', (
          SELECT COALESCE(jsonb_agg(p.name ORDER BY p.name), '[]'::jsonb)
          FROM golf_tournament_players p WHERE p.team_id = t.id
        ),
        'scores', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'hole_number', s.hole_number, 'strokes', s.strokes,
            'penalties', s.penalties, 'updated_at', s.updated_at
          ) ORDER BY s.hole_number), '[]'::jsonb)
          FROM golf_team_scores s WHERE s.team_id = t.id
        ),
        'power_up_uses', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', u.id, 'power_up_id', u.power_up_id,
            'hole_number', u.hole_number, 'used_by', u.used_by
          )), '[]'::jsonb)
          FROM golf_power_up_uses u WHERE u.team_id = t.id
        )
      ) ORDER BY t.sort_order, t.name), '[]'::jsonb)
      FROM golf_teams t WHERE t.tournament_id = p_tournament_id
    ),
    'power_ups', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pu) ORDER BY pu.sort_order, pu.name), '[]'::jsonb)
      FROM golf_power_ups pu WHERE pu.tournament_id = p_tournament_id
    )
  );
END;
$$;

-- Save a hole score. The bag tag proves the caller is on that team.
CREATE OR REPLACE FUNCTION golf_save_score(
  p_bag_tag TEXT, p_hole INT, p_strokes INT,
  p_penalties INT DEFAULT 0, p_note TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
  v_status TEXT;
BEGIN
  SELECT p.* INTO v_player FROM golf_tournament_players p
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag) LIMIT 1;

  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  SELECT status INTO v_status FROM golf_tournaments WHERE id = v_player.tournament_id;
  IF v_status = 'final' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This tournament is final — scores are locked');
  END IF;

  IF p_strokes < 0 OR p_strokes > 30 OR p_penalties < 0 OR p_penalties > 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That score looks out of range');
  END IF;

  INSERT INTO golf_team_scores (team_id, tournament_id, hole_number, strokes, penalties, note, updated_by, updated_at)
  VALUES (v_player.team_id, v_player.tournament_id, p_hole, p_strokes, COALESCE(p_penalties,0), COALESCE(p_note,''), v_player.name, NOW())
  ON CONFLICT (team_id, hole_number) DO UPDATE
    SET strokes = EXCLUDED.strokes,
        penalties = EXCLUDED.penalties,
        note = EXCLUDED.note,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Spend a power-up (respects uses_per_team).
CREATE OR REPLACE FUNCTION golf_use_power_up(p_bag_tag TEXT, p_power_up_id UUID, p_hole INT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
  v_allowed INT;
  v_used INT;
BEGIN
  SELECT p.* INTO v_player FROM golf_tournament_players p
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag) LIMIT 1;
  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  SELECT uses_per_team INTO v_allowed FROM golf_power_ups WHERE id = p_power_up_id;
  IF v_allowed IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unknown power-up');
  END IF;

  SELECT COUNT(*) INTO v_used FROM golf_power_up_uses
  WHERE team_id = v_player.team_id AND power_up_id = p_power_up_id;

  IF v_used >= v_allowed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No uses left for this power-up');
  END IF;

  INSERT INTO golf_power_up_uses (power_up_id, team_id, tournament_id, hole_number, used_by)
  VALUES (p_power_up_id, v_player.team_id, v_player.tournament_id, p_hole, v_player.name);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Undo a power-up your own team used (mis-taps happen).
CREATE OR REPLACE FUNCTION golf_undo_power_up(p_bag_tag TEXT, p_use_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_player golf_tournament_players%ROWTYPE;
BEGIN
  SELECT p.* INTO v_player FROM golf_tournament_players p
  WHERE TRIM(p.bag_tag) = TRIM(p_bag_tag) LIMIT 1;
  IF v_player.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tag not found');
  END IF;

  DELETE FROM golf_power_up_uses
  WHERE id = p_use_id AND team_id = v_player.team_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION golf_tag_signin(TEXT)                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_tournament_state(UUID)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_save_score(TEXT, INT, INT, INT, TEXT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_use_power_up(TEXT, UUID, INT)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION golf_undo_power_up(TEXT, UUID)               TO anon, authenticated;

-- =============================================
-- REALTIME — lets every group see scores as they land
-- =============================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE golf_team_scores;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE golf_power_up_uses; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ─── Helper: build a default 18 holes (all par 4) for a tournament ───
CREATE OR REPLACE FUNCTION golf_seed_holes(p_tournament_id UUID, p_holes INT DEFAULT 18)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO golf_tournament_holes (tournament_id, hole_number, par)
  SELECT p_tournament_id, gs, 4 FROM generate_series(1, p_holes) gs
  ON CONFLICT (tournament_id, hole_number) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION golf_seed_holes(UUID, INT) TO authenticated;

SELECT 'golf tournament system ready' AS status;
