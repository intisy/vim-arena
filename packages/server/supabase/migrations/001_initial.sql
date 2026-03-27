-- 001_initial.sql
-- Supabase DB schema for vim-arena

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_seed TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  solo_elo INTEGER NOT NULL DEFAULT 1000,
  solo_peak_elo INTEGER NOT NULL DEFAULT 1000,
  solo_games_played INTEGER NOT NULL DEFAULT 0,
  solo_wins INTEGER NOT NULL DEFAULT 0,
  solo_losses INTEGER NOT NULL DEFAULT 0,
  pvp_elo INTEGER NOT NULL DEFAULT 1000,
  pvp_peak_elo INTEGER NOT NULL DEFAULT 1000,
  pvp_games_played INTEGER NOT NULL DEFAULT 0,
  pvp_wins INTEGER NOT NULL DEFAULT 0,
  pvp_losses INTEGER NOT NULL DEFAULT 0,
  theme TEXT NOT NULL DEFAULT 'theme-matrix',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'user_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    )
  );
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SOLO ELO HISTORY
-- ============================================================
CREATE TABLE public.solo_elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_solo_elo_history_user ON public.solo_elo_history(user_id, created_at DESC);

-- ============================================================
-- LESSON PROGRESS
-- ============================================================
CREATE TABLE public.lesson_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, lesson_id)
);

-- ============================================================
-- CHALLENGE STATS (aggregated per template)
-- ============================================================
CREATE TABLE public.challenge_stats (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_time_seconds REAL NOT NULL DEFAULT 0,
  average_efficiency REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, template_id)
);

-- ============================================================
-- CHALLENGE RESULTS (individual attempts)
-- ============================================================
CREATE TABLE public.challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  snippet_id TEXT NOT NULL,
  time_seconds REAL NOT NULL,
  keystroke_count INTEGER NOT NULL,
  reference_keystroke_count INTEGER NOT NULL,
  efficiency_score REAL NOT NULL,
  speed_score REAL NOT NULL,
  total_score INTEGER NOT NULL,
  timed_out BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_challenge_results_user ON public.challenge_results(user_id, created_at DESC);

-- ============================================================
-- USER STATS (aggregated)
-- ============================================================
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  lessons_completed INTEGER NOT NULL DEFAULT 0,
  challenges_attempted INTEGER NOT NULL DEFAULT 0,
  challenges_completed INTEGER NOT NULL DEFAULT 0,
  total_practice_time_seconds REAL NOT NULL DEFAULT 0,
  average_challenge_score REAL NOT NULL DEFAULT 0,
  best_challenge_score INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ============================================================
-- PVP MATCHES
-- ============================================================
CREATE TABLE public.pvp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES public.profiles(id),
  player2_id UUID NOT NULL REFERENCES public.profiles(id),
  winner_id UUID REFERENCES public.profiles(id),
  challenge_seed BIGINT NOT NULL,
  challenge_template_id TEXT NOT NULL,
  challenge_difficulty SMALLINT NOT NULL CHECK (challenge_difficulty BETWEEN 1 AND 5),
  player1_time_seconds REAL,
  player1_keystrokes INTEGER,
  player1_completed BOOLEAN NOT NULL DEFAULT false,
  player2_time_seconds REAL,
  player2_keystrokes INTEGER,
  player2_completed BOOLEAN NOT NULL DEFAULT false,
  player1_elo_before INTEGER NOT NULL,
  player2_elo_before INTEGER NOT NULL,
  player1_elo_after INTEGER,
  player2_elo_after INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'forfeit', 'timeout')),
  time_limit INTEGER NOT NULL DEFAULT 60,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX idx_pvp_matches_player1 ON public.pvp_matches(player1_id, started_at DESC);
CREATE INDEX idx_pvp_matches_player2 ON public.pvp_matches(player2_id, started_at DESC);

-- ============================================================
-- MATCHMAKING QUEUE
-- ============================================================
CREATE TABLE public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id),
  pvp_elo INTEGER NOT NULL,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solo_elo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update own
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Solo elo history: users can read/insert own
CREATE POLICY "Users can view own solo elo history"
  ON public.solo_elo_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own solo elo history"
  ON public.solo_elo_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lesson progress: users can read/insert/update own
CREATE POLICY "Users can view own lesson progress"
  ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lesson progress"
  ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lesson progress"
  ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- Challenge stats: users can read/insert/update own
CREATE POLICY "Users can view own challenge stats"
  ON public.challenge_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenge stats"
  ON public.challenge_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenge stats"
  ON public.challenge_stats FOR UPDATE USING (auth.uid() = user_id);

-- Challenge results: users can read/insert own
CREATE POLICY "Users can view own challenge results"
  ON public.challenge_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenge results"
  ON public.challenge_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User stats: users can read/update own
CREATE POLICY "Users can view own user stats"
  ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own user stats"
  ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

-- PvP matches: participants can read their own matches
CREATE POLICY "Users can view own pvp matches"
  ON public.pvp_matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Matchmaking queue: users can read/insert/delete own
CREATE POLICY "Users can view own queue entry"
  ON public.matchmaking_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue entry"
  ON public.matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own queue entry"
  ON public.matchmaking_queue FOR DELETE USING (auth.uid() = user_id);
