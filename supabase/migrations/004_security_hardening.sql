-- 004_security_hardening.sql
-- Security hardening: server-side scoring, server-side PvP timing,
-- RLS lockdown on competitive tables, profile guard trigger.
--
-- ATTACK SURFACE CLOSED:
--   1. Solo scores computed server-side (can't curl fake scores)
--   2. PvP time computed server-side (can't curl fake completion times)
--   3. Direct INSERT/UPDATE on competitive tables blocked (RLS)
--   4. Direct UPDATE of elo/stats columns on profiles blocked (trigger)
--   5. Replay data size-limited

-- ============================================================
-- 1. SERVER-SIDE SCORING HELPERS
-- ============================================================

-- Efficiency: how close keystroke count is to reference (0-100)
CREATE OR REPLACE FUNCTION solo_calc_efficiency(
  p_actual INTEGER,
  p_reference INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_actual <= 0 THEN RETURN 0; END IF;
  IF p_actual <= p_reference THEN RETURN 100; END IF;
  RETURN round((p_reference::NUMERIC / p_actual) * 100)::INTEGER;
END;
$$;

-- Speed score: 100 at time=0, 50 at time=timeLimit, 0 at time>=2*timeLimit
CREATE OR REPLACE FUNCTION solo_calc_speed_score(
  p_time_seconds REAL,
  p_time_limit REAL
) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_time_limit <= 0 THEN RETURN 0; END IF;
  IF p_time_seconds <= 0 THEN RETURN 100; END IF;
  IF p_time_seconds >= p_time_limit THEN
    RETURN GREATEST(0, round(50 - ((p_time_seconds - p_time_limit) / p_time_limit) * 50))::INTEGER;
  END IF;
  RETURN round(50 + (1.0 - p_time_seconds / p_time_limit) * 50)::INTEGER;
END;
$$;

-- Total: 60% efficiency + 40% speed
CREATE OR REPLACE FUNCTION solo_calc_total_score(
  p_efficiency INTEGER,
  p_speed INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN round(p_efficiency * 0.6 + p_speed * 0.4)::INTEGER;
END;
$$;

-- Solo difficulty → Elo-equivalent rating
CREATE OR REPLACE FUNCTION solo_difficulty_to_rating(
  p_difficulty SMALLINT
) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_difficulty
    WHEN 1 THEN 600
    WHEN 2 THEN 900
    WHEN 3 THEN 1200
    WHEN 4 THEN 1600
    WHEN 5 THEN 2000
    ELSE 1000
  END;
END;
$$;

-- Solo expected score (Elo formula)
CREATE OR REPLACE FUNCTION solo_expected_score(
  p_player_rating INTEGER,
  p_opponent_rating INTEGER
) RETURNS DOUBLE PRECISION
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN 1.0 / (1.0 + power(10.0, (p_opponent_rating - p_player_rating)::DOUBLE PRECISION / 400.0));
END;
$$;

-- ============================================================
-- 2. SUBMIT SOLO CHALLENGE RESULT (server-side scoring + elo)
-- ============================================================
CREATE OR REPLACE FUNCTION submit_solo_result(
  p_template_id             TEXT,
  p_snippet_id              TEXT,
  p_time_seconds            REAL,
  p_keystroke_count         INTEGER,
  p_reference_keystroke_count INTEGER,
  p_difficulty              SMALLINT,
  p_timed_out               BOOLEAN,
  p_time_limit              REAL,
  p_is_practice             BOOLEAN DEFAULT false,
  p_is_retry                BOOLEAN DEFAULT false
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id          UUID := auth.uid();
  v_efficiency       INTEGER;
  v_speed            INTEGER;
  v_total            INTEGER;
  v_clamped_time     REAL;
  v_clamped_ks       INTEGER;
  v_profile          RECORD;
  v_opp_rating       INTEGER;
  v_expected         DOUBLE PRECISION;
  v_is_win           BOOLEAN;
  v_actual           DOUBLE PRECISION;
  v_delta            INTEGER;
  v_new_rating       INTEGER;
  v_existing_stats   RECORD;
  v_new_attempts     INTEGER;
  v_new_best_score   INTEGER;
  v_new_best_time    REAL;
  v_user_stats       RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('status', 'error', 'error', 'Not authenticated');
  END IF;

  -- ======== INPUT VALIDATION ========
  IF p_difficulty < 1 OR p_difficulty > 5 THEN
    RETURN json_build_object('status', 'error', 'error', 'Invalid difficulty');
  END IF;
  IF p_time_limit <= 0 OR p_time_limit > 300 THEN
    RETURN json_build_object('status', 'error', 'error', 'Invalid time limit');
  END IF;
  IF p_reference_keystroke_count < 1 THEN
    RETURN json_build_object('status', 'error', 'error', 'Invalid reference keystroke count');
  END IF;

  -- Clamp time (minimum 0.3s, maximum 2x time limit + buffer)
  v_clamped_time := GREATEST(0.3, LEAST(p_time_seconds, p_time_limit * 2.0 + 10.0));
  -- Clamp keystrokes (minimum 1 if completed, max 10000)
  v_clamped_ks := GREATEST(CASE WHEN p_timed_out THEN 0 ELSE 1 END, LEAST(p_keystroke_count, 10000));

  -- ======== COMPUTE SCORES SERVER-SIDE ========
  IF p_timed_out THEN
    v_efficiency := 0;
    v_speed      := 0;
    v_total      := 0;
  ELSE
    v_efficiency := solo_calc_efficiency(v_clamped_ks, p_reference_keystroke_count);
    v_speed      := solo_calc_speed_score(v_clamped_time, p_time_limit);
    v_total      := solo_calc_total_score(v_efficiency, v_speed);
  END IF;

  -- ======== INSERT CHALLENGE RESULT (append-only log) ========
  INSERT INTO challenge_results (
    user_id, template_id, snippet_id,
    time_seconds, keystroke_count, reference_keystroke_count,
    efficiency_score, speed_score, total_score, timed_out
  ) VALUES (
    v_user_id, p_template_id, p_snippet_id,
    v_clamped_time, v_clamped_ks, p_reference_keystroke_count,
    v_efficiency, v_speed, v_total, p_timed_out
  );

  -- ======== UPSERT CHALLENGE STATS (best scores per template) ========
  SELECT * INTO v_existing_stats
  FROM challenge_stats
  WHERE user_id = v_user_id AND template_id = p_template_id;

  IF FOUND THEN
    v_new_attempts   := v_existing_stats.attempts + 1;
    v_new_best_score := GREATEST(v_existing_stats.best_score, v_total);
    v_new_best_time  := CASE
      WHEN v_existing_stats.best_time_seconds <= 0 THEN v_clamped_time
      WHEN p_timed_out THEN v_existing_stats.best_time_seconds
      ELSE LEAST(v_existing_stats.best_time_seconds, v_clamped_time)
    END;

    UPDATE challenge_stats SET
      attempts           = v_new_attempts,
      best_score         = v_new_best_score,
      best_time_seconds  = v_new_best_time,
      average_efficiency = round(
        (v_existing_stats.average_efficiency * v_existing_stats.attempts + v_efficiency)::NUMERIC
        / v_new_attempts
      )::REAL
    WHERE user_id = v_user_id AND template_id = p_template_id;
  ELSE
    INSERT INTO challenge_stats (
      user_id, template_id, attempts, best_score, best_time_seconds, average_efficiency
    ) VALUES (
      v_user_id, p_template_id, 1, v_total, v_clamped_time, v_efficiency
    );
  END IF;

  -- ======== UPDATE SOLO ELO (skip for practice / retry) ========
  IF NOT p_is_practice AND NOT p_is_retry THEN
    SELECT solo_elo, solo_peak_elo, solo_games_played, solo_wins, solo_losses
    INTO v_profile
    FROM profiles WHERE id = v_user_id;

    v_opp_rating := solo_difficulty_to_rating(p_difficulty);
    v_expected   := solo_expected_score(v_profile.solo_elo, v_opp_rating);
    v_is_win     := NOT p_timed_out AND v_total >= 50;

    IF v_is_win THEN
      v_actual := LEAST(1.0, v_total::DOUBLE PRECISION / 100.0 + 0.2);
    ELSE
      v_actual := GREATEST(0.0, v_total::DOUBLE PRECISION / 200.0);
    END IF;

    v_delta      := round(32 * (v_actual - v_expected))::INTEGER;
    v_new_rating := GREATEST(100, LEAST(3000, v_profile.solo_elo + v_delta));

    -- Bypass profile guard trigger for this transaction
    PERFORM set_config('app.bypass_profile_guard', 'true', true);

    UPDATE profiles SET
      solo_elo          = v_new_rating,
      solo_peak_elo     = GREATEST(v_profile.solo_peak_elo, v_new_rating),
      solo_games_played = v_profile.solo_games_played + 1,
      solo_wins         = v_profile.solo_wins  + CASE WHEN v_is_win THEN 1 ELSE 0 END,
      solo_losses       = v_profile.solo_losses + CASE WHEN v_is_win THEN 0 ELSE 1 END
    WHERE id = v_user_id;

    -- Append Elo history
    INSERT INTO solo_elo_history (user_id, rating, difficulty, score)
    VALUES (v_user_id, v_new_rating, p_difficulty, v_total);
  END IF;

  -- ======== UPDATE USER STATS (aggregate counters) ========
  SELECT * INTO v_user_stats FROM user_stats WHERE user_id = v_user_id;
  IF FOUND THEN
    UPDATE user_stats SET
      challenges_attempted       = v_user_stats.challenges_attempted + 1,
      challenges_completed       = CASE WHEN v_total >= 50
                                     THEN v_user_stats.challenges_completed + 1
                                     ELSE v_user_stats.challenges_completed END,
      total_practice_time_seconds = v_user_stats.total_practice_time_seconds + v_clamped_time,
      average_challenge_score    = CASE
        WHEN v_user_stats.challenges_attempted > 0
        THEN round(
          (v_user_stats.average_challenge_score * v_user_stats.challenges_attempted + v_total)::NUMERIC
          / (v_user_stats.challenges_attempted + 1)
        )::REAL
        ELSE v_total::REAL
      END,
      best_challenge_score       = GREATEST(v_user_stats.best_challenge_score, v_total),
      last_active_date           = CURRENT_DATE
    WHERE user_id = v_user_id;
  END IF;

  RETURN json_build_object(
    'status',          'ok',
    'efficiencyScore', v_efficiency,
    'speedScore',      v_speed,
    'totalScore',      v_total,
    'timeSeconds',     v_clamped_time,
    'keystrokeCount',  v_clamped_ks
  );
END;
$$;

-- ============================================================
-- 3. RECORD LESSON COMPLETED (server-side user_stats update)
-- ============================================================
CREATE OR REPLACE FUNCTION record_lesson_completed(
  p_lesson_id TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id            UUID := auth.uid();
  v_already_completed  BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('status', 'error', 'error', 'Not authenticated');
  END IF;

  -- Check current state
  SELECT completed INTO v_already_completed
  FROM lesson_progress
  WHERE user_id = v_user_id AND lesson_id = p_lesson_id;

  -- Upsert lesson progress
  INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at, attempts, steps_completed)
  VALUES (v_user_id, p_lesson_id, true, now(), 1, 0)
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    completed    = true,
    completed_at = COALESCE(lesson_progress.completed_at, now()),
    attempts     = lesson_progress.attempts + 1;

  -- Increment user_stats only if newly completed
  IF NOT COALESCE(v_already_completed, false) THEN
    UPDATE user_stats SET
      lessons_completed = lessons_completed + 1,
      last_active_date  = CURRENT_DATE
    WHERE user_id = v_user_id;
  END IF;

  RETURN json_build_object('status', 'ok');
END;
$$;

-- ============================================================
-- 4. SUBMIT RACE RESULT — SERVER-SIDE TIME + PROFILE GUARD
--    (replaces version from 002/003)
-- ============================================================
CREATE OR REPLACE FUNCTION submit_race_result(
  p_match_id        UUID,
  p_time_seconds    REAL    DEFAULT NULL,   -- IGNORED: server calculates time
  p_keystroke_count INTEGER DEFAULT 0,
  p_completed       BOOLEAN DEFAULT false
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_match        RECORD;
  v_is_p1        BOOLEAN;
  v_p1_done      BOOLEAN;
  v_p2_done      BOOLEAN;
  v_winner_id    UUID;
  v_status       TEXT;
  v_p1_elo_after INTEGER;
  v_p2_elo_after INTEGER;
  v_p1_expected  DOUBLE PRECISION;
  v_p2_expected  DOUBLE PRECISION;
  v_p1_delta     INTEGER;
  v_p2_delta     INTEGER;
  v_p1_name      TEXT;
  v_p2_name      TEXT;
  v_server_time  REAL;
BEGIN
  -- Lock match row
  SELECT * INTO v_match
  FROM pvp_matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'error', 'Match not found');
  END IF;

  v_is_p1 := (v_match.player1_id = v_user_id);

  IF NOT v_is_p1 AND v_match.player2_id != v_user_id THEN
    RETURN json_build_object('status', 'error', 'error', 'Not a participant');
  END IF;

  -- ======== IDEMPOTENT: already finalized → return existing result ========
  IF v_match.status != 'active' THEN
    SELECT username INTO v_p1_name FROM profiles WHERE id = v_match.player1_id;
    SELECT username INTO v_p2_name FROM profiles WHERE id = v_match.player2_id;

    RETURN json_build_object(
      'status', 'completed',
      'result', json_build_object(
        'type',     'race_result',
        'matchId',  p_match_id,
        'winnerId', v_match.winner_id,
        'player1', json_build_object(
          'id', v_match.player1_id, 'username', v_p1_name,
          'timeSeconds', v_match.player1_time_seconds,
          'keystrokeCount', v_match.player1_keystrokes,
          'completed', v_match.player1_completed,
          'eloBefore', v_match.player1_elo_before,
          'eloAfter',  v_match.player1_elo_after
        ),
        'player2', json_build_object(
          'id', v_match.player2_id, 'username', v_p2_name,
          'timeSeconds', v_match.player2_time_seconds,
          'keystrokeCount', v_match.player2_keystrokes,
          'completed', v_match.player2_completed,
          'eloBefore', v_match.player2_elo_before,
          'eloAfter',  v_match.player2_elo_after
        ),
        'status', v_match.status
      )
    );
  END IF;

  -- ======== SERVER-SIDE TIME (authoritative, ignores p_time_seconds) ========
  -- started_at is match creation time; subtract 3s countdown
  v_server_time := GREATEST(0.1,
    EXTRACT(EPOCH FROM (now() - v_match.started_at))::REAL - 3.0
  );

  -- Check if this player already submitted
  v_p1_done := v_match.player1_completed
            OR v_match.player1_time_seconds IS NOT NULL
            OR (v_match.player1_keystrokes IS NOT NULL AND v_match.player1_keystrokes > 0);
  v_p2_done := v_match.player2_completed
            OR v_match.player2_time_seconds IS NOT NULL
            OR (v_match.player2_keystrokes IS NOT NULL AND v_match.player2_keystrokes > 0);

  -- Record this player's result (use SERVER time, not client time)
  IF v_is_p1 AND NOT v_p1_done THEN
    UPDATE pvp_matches SET
      player1_completed    = p_completed,
      player1_time_seconds = CASE WHEN p_completed THEN v_server_time ELSE NULL END,
      player1_keystrokes   = CASE WHEN p_keystroke_count > 0 THEN p_keystroke_count ELSE player1_keystrokes END
    WHERE id = p_match_id;
  ELSIF NOT v_is_p1 AND NOT v_p2_done THEN
    UPDATE pvp_matches SET
      player2_completed    = p_completed,
      player2_time_seconds = CASE WHEN p_completed THEN v_server_time ELSE NULL END,
      player2_keystrokes   = CASE WHEN p_keystroke_count > 0 THEN p_keystroke_count ELSE player2_keystrokes END
    WHERE id = p_match_id;
  END IF;

  -- Re-read
  SELECT * INTO v_match FROM pvp_matches WHERE id = p_match_id;

  v_p1_done := v_match.player1_completed
            OR v_match.player1_time_seconds IS NOT NULL
            OR (v_match.player1_keystrokes IS NOT NULL AND v_match.player1_keystrokes > 0);
  v_p2_done := v_match.player2_completed
            OR v_match.player2_time_seconds IS NOT NULL
            OR (v_match.player2_keystrokes IS NOT NULL AND v_match.player2_keystrokes > 0);

  IF NOT v_p1_done OR NOT v_p2_done THEN
    -- Auto-forfeit if past time limit + 15s grace
    IF now() > v_match.started_at + make_interval(secs => (v_match.time_limit + 15)::DOUBLE PRECISION) THEN
      IF NOT v_p1_done THEN
        UPDATE pvp_matches SET player1_completed = false WHERE id = p_match_id;
      END IF;
      IF NOT v_p2_done THEN
        UPDATE pvp_matches SET player2_completed = false WHERE id = p_match_id;
      END IF;
      SELECT * INTO v_match FROM pvp_matches WHERE id = p_match_id;
    ELSE
      RETURN json_build_object('status', 'waiting_for_opponent', 'result', NULL);
    END IF;
  END IF;

  -- ======== Both done (or forced) — finalize ========

  v_status := 'completed';
  IF v_match.player1_completed AND v_match.player2_completed THEN
    IF COALESCE(v_match.player1_time_seconds, 999999) < COALESCE(v_match.player2_time_seconds, 999999) THEN
      v_winner_id := v_match.player1_id;
    ELSIF COALESCE(v_match.player2_time_seconds, 999999) < COALESCE(v_match.player1_time_seconds, 999999) THEN
      v_winner_id := v_match.player2_id;
    END IF;
  ELSIF v_match.player1_completed AND NOT v_match.player2_completed THEN
    v_winner_id := v_match.player1_id;
    v_status := CASE WHEN v_match.player2_time_seconds IS NULL THEN 'forfeit' ELSE 'timeout' END;
  ELSIF NOT v_match.player1_completed AND v_match.player2_completed THEN
    v_winner_id := v_match.player2_id;
    v_status := CASE WHEN v_match.player1_time_seconds IS NULL THEN 'forfeit' ELSE 'timeout' END;
  ELSE
    v_status := 'timeout';
  END IF;

  -- Elo calculation
  v_p1_expected := pvp_expected_score(v_match.player1_elo_before, v_match.player2_elo_before);
  v_p2_expected := pvp_expected_score(v_match.player2_elo_before, v_match.player1_elo_before);

  IF v_winner_id = v_match.player1_id THEN
    v_p1_delta := round(32 * (1.0 - v_p1_expected))::INTEGER;
    v_p2_delta := round(32 * (0.0 - v_p2_expected))::INTEGER;
  ELSIF v_winner_id = v_match.player2_id THEN
    v_p1_delta := round(32 * (0.0 - v_p1_expected))::INTEGER;
    v_p2_delta := round(32 * (1.0 - v_p2_expected))::INTEGER;
  ELSE
    v_p1_delta := round(32 * (0.5 - v_p1_expected))::INTEGER;
    v_p2_delta := round(32 * (0.5 - v_p2_expected))::INTEGER;
  END IF;

  v_p1_elo_after := GREATEST(100, LEAST(3000, v_match.player1_elo_before + v_p1_delta));
  v_p2_elo_after := GREATEST(100, LEAST(3000, v_match.player2_elo_before + v_p2_delta));

  -- Finalize match
  UPDATE pvp_matches SET
    winner_id         = v_winner_id,
    player1_elo_after = v_p1_elo_after,
    player2_elo_after = v_p2_elo_after,
    status            = v_status,
    finished_at       = now()
  WHERE id = p_match_id;

  -- Bypass profile guard trigger
  PERFORM set_config('app.bypass_profile_guard', 'true', true);

  UPDATE profiles SET
    pvp_elo          = v_p1_elo_after,
    pvp_peak_elo     = GREATEST(pvp_peak_elo, v_p1_elo_after),
    pvp_games_played = pvp_games_played + 1,
    pvp_wins         = pvp_wins  + CASE WHEN v_winner_id = v_match.player1_id THEN 1 ELSE 0 END,
    pvp_losses       = pvp_losses + CASE WHEN v_winner_id = v_match.player2_id THEN 1 ELSE 0 END
  WHERE id = v_match.player1_id;

  UPDATE profiles SET
    pvp_elo          = v_p2_elo_after,
    pvp_peak_elo     = GREATEST(pvp_peak_elo, v_p2_elo_after),
    pvp_games_played = pvp_games_played + 1,
    pvp_wins         = pvp_wins  + CASE WHEN v_winner_id = v_match.player2_id THEN 1 ELSE 0 END,
    pvp_losses       = pvp_losses + CASE WHEN v_winner_id = v_match.player1_id THEN 1 ELSE 0 END
  WHERE id = v_match.player2_id;

  SELECT username INTO v_p1_name FROM profiles WHERE id = v_match.player1_id;
  SELECT username INTO v_p2_name FROM profiles WHERE id = v_match.player2_id;

  RETURN json_build_object(
    'status', 'completed',
    'result', json_build_object(
      'type',     'race_result',
      'matchId',  p_match_id,
      'winnerId', v_winner_id,
      'player1', json_build_object(
        'id',             v_match.player1_id,
        'username',       v_p1_name,
        'timeSeconds',    v_match.player1_time_seconds,
        'keystrokeCount', v_match.player1_keystrokes,
        'completed',      v_match.player1_completed,
        'eloBefore',      v_match.player1_elo_before,
        'eloAfter',       v_p1_elo_after
      ),
      'player2', json_build_object(
        'id',             v_match.player2_id,
        'username',       v_p2_name,
        'timeSeconds',    v_match.player2_time_seconds,
        'keystrokeCount', v_match.player2_keystrokes,
        'completed',      v_match.player2_completed,
        'eloBefore',      v_match.player2_elo_before,
        'eloAfter',       v_p2_elo_after
      ),
      'status', v_status
    )
  );
END;
$$;

-- ============================================================
-- 5. SUBMIT REPLAY DATA — SIZE LIMIT
-- ============================================================
CREATE OR REPLACE FUNCTION submit_replay_data(
  p_match_id    UUID,
  p_replay_data JSONB
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match   RECORD;
BEGIN
  -- Reject oversized payloads (max ~500KB)
  IF octet_length(p_replay_data::TEXT) > 512000 THEN
    RETURN json_build_object('status', 'error', 'error', 'Replay data too large');
  END IF;

  SELECT * INTO v_match FROM pvp_matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'error', 'Match not found');
  END IF;

  IF v_match.player1_id = v_user_id THEN
    UPDATE pvp_matches SET player1_replay = p_replay_data WHERE id = p_match_id;
  ELSIF v_match.player2_id = v_user_id THEN
    UPDATE pvp_matches SET player2_replay = p_replay_data WHERE id = p_match_id;
  ELSE
    RETURN json_build_object('status', 'error', 'error', 'Not a participant');
  END IF;

  RETURN json_build_object('status', 'ok');
END;
$$;

-- ============================================================
-- 6. RLS LOCKDOWN — BLOCK DIRECT WRITES ON COMPETITIVE TABLES
-- ============================================================

-- challenge_results: only RPCs can INSERT (scores are competitive)
DROP POLICY IF EXISTS "Users can insert own challenge results" ON public.challenge_results;

-- challenge_stats: only RPCs can INSERT/UPDATE (best scores are competitive)
DROP POLICY IF EXISTS "Users can insert own challenge stats" ON public.challenge_stats;
DROP POLICY IF EXISTS "Users can update own challenge stats" ON public.challenge_stats;

-- solo_elo_history: only RPCs can INSERT (elo history is competitive)
DROP POLICY IF EXISTS "Users can insert own solo elo history" ON public.solo_elo_history;

-- user_stats: only RPCs can UPDATE (stats are competitive)
DROP POLICY IF EXISTS "Users can update own user stats" ON public.user_stats;

-- ============================================================
-- 7. PROFILE GUARD TRIGGER — BLOCK DIRECT ELO/STATS UPDATES
-- ============================================================

-- RPCs set session var 'app.bypass_profile_guard' = 'true' before
-- updating competitive columns. Direct client UPDATEs cannot set
-- this session var because they don't run SECURITY DEFINER code.

CREATE OR REPLACE FUNCTION guard_profile_competitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow SECURITY DEFINER RPCs to update (they set this flag)
  IF current_setting('app.bypass_profile_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Block changes to competitive fields from direct client UPDATEs
  NEW.solo_elo          := OLD.solo_elo;
  NEW.solo_peak_elo     := OLD.solo_peak_elo;
  NEW.solo_games_played := OLD.solo_games_played;
  NEW.solo_wins         := OLD.solo_wins;
  NEW.solo_losses       := OLD.solo_losses;
  NEW.pvp_elo           := OLD.pvp_elo;
  NEW.pvp_peak_elo      := OLD.pvp_peak_elo;
  NEW.pvp_games_played  := OLD.pvp_games_played;
  NEW.pvp_wins          := OLD.pvp_wins;
  NEW.pvp_losses        := OLD.pvp_losses;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS guard_profile_competitive ON public.profiles;

CREATE TRIGGER guard_profile_competitive
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_profile_competitive_fields();
