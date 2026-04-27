-- 006_settings_fixes.sql
-- Fix variable countdown duration for solo challenges
-- Add data clearing RPCs
-- Add replay data support for solo challenges

-- 1. Update active_solo_challenges table
ALTER TABLE public.active_solo_challenges ADD COLUMN IF NOT EXISTS countdown_duration REAL DEFAULT 3.0;

-- 2. Update challenge_results table
ALTER TABLE public.challenge_results ADD COLUMN IF NOT EXISTS replay_data JSONB DEFAULT NULL;

-- 3. Update start_solo_challenge
CREATE OR REPLACE FUNCTION start_solo_challenge(
  p_template_id TEXT,
  p_snippet_id TEXT,
  p_difficulty SMALLINT,
  p_reference_keystroke_count INTEGER,
  p_time_limit REAL,
  p_countdown_duration REAL DEFAULT 3.0
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_challenge_id UUID;
  v_active_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('status', 'error', 'error', 'Not authenticated');
  END IF;

  -- Input validation
  IF p_difficulty < 1 OR p_difficulty > 5 THEN
    RETURN json_build_object('status', 'error', 'error', 'Invalid difficulty');
  END IF;
  IF p_time_limit <= 0 OR p_time_limit > 300 THEN
    RETURN json_build_object('status', 'error', 'error', 'Invalid time limit');
  END IF;
  IF p_reference_keystroke_count < 1 THEN
    RETURN json_build_object('status', 'error', 'error', 'Invalid reference keystroke count');
  END IF;

  -- Clean up stale uncompleted challenges (> 10 min old)
  DELETE FROM active_solo_challenges
  WHERE user_id = v_user_id
    AND completed = false
    AND created_at < now() - interval '10 minutes';

  -- Enforce max 5 active challenges per user (prevent spam)
  SELECT COUNT(*) INTO v_active_count
  FROM active_solo_challenges
  WHERE user_id = v_user_id AND completed = false;

  IF v_active_count >= 5 THEN
    -- Delete oldest to make room
    DELETE FROM active_solo_challenges
    WHERE id = (
      SELECT id FROM active_solo_challenges
      WHERE user_id = v_user_id AND completed = false
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;

  -- Create challenge record
  INSERT INTO active_solo_challenges (
    user_id, template_id, snippet_id, difficulty,
    reference_keystroke_count, time_limit, countdown_duration
  ) VALUES (
    v_user_id, p_template_id, p_snippet_id, p_difficulty,
    p_reference_keystroke_count, p_time_limit, p_countdown_duration
  ) RETURNING id INTO v_challenge_id;

  RETURN json_build_object('status', 'ok', 'challengeId', v_challenge_id);
END;
$$;

-- 4. Update submit_solo_result
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
  p_is_retry                BOOLEAN DEFAULT false,
  p_challenge_id            UUID DEFAULT NULL,
  p_replay_data             JSONB DEFAULT NULL
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
  -- Server-side challenge tracking
  v_challenge        RECORD;
  v_server_time      REAL;
  v_use_difficulty    SMALLINT;
  v_use_ref_ks       INTEGER;
  v_use_time_limit   REAL;
  v_use_time         REAL;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('status', 'error', 'error', 'Not authenticated');
  END IF;

  -- ======== SERVER-SIDE CHALLENGE LOOKUP ========
  IF p_challenge_id IS NOT NULL THEN
    SELECT * INTO v_challenge
    FROM active_solo_challenges
    WHERE id = p_challenge_id AND user_id = v_user_id;

    IF NOT FOUND THEN
      RETURN json_build_object('status', 'error', 'error', 'Challenge not found');
    END IF;

    IF v_challenge.completed THEN
      RETURN json_build_object('status', 'error', 'error', 'Challenge already submitted');
    END IF;

    -- Mark as completed (prevents double-submission)
    UPDATE active_solo_challenges SET completed = true WHERE id = p_challenge_id;

    -- Compute server-side time (subtract variable countdown)
    v_server_time := EXTRACT(EPOCH FROM (now() - v_challenge.started_at))::REAL - v_challenge.countdown_duration;

    -- Reject if submitted before countdown finished (possible cheat)
    IF v_server_time < 0.5 THEN
      RETURN json_build_object('status', 'error', 'error', 'Completed too fast');
    END IF;

    -- Use stored values (ignore client-supplied metadata)
    v_use_difficulty  := v_challenge.difficulty;
    v_use_ref_ks      := v_challenge.reference_keystroke_count;
    v_use_time_limit  := v_challenge.time_limit;
    v_use_time        := v_server_time;

    -- Override timed_out based on server time
    IF v_server_time >= v_challenge.time_limit THEN
      p_timed_out := true;
    END IF;
  ELSE
    -- Fallback: use client-supplied values (backward compat)
    IF p_difficulty < 1 OR p_difficulty > 5 THEN
      RETURN json_build_object('status', 'error', 'error', 'Invalid difficulty');
    END IF;
    IF p_time_limit <= 0 OR p_time_limit > 300 THEN
      RETURN json_build_object('status', 'error', 'error', 'Invalid time limit');
    END IF;
    IF p_reference_keystroke_count < 1 THEN
      RETURN json_build_object('status', 'error', 'error', 'Invalid reference keystroke count');
    END IF;

    v_use_difficulty  := p_difficulty;
    v_use_ref_ks      := p_reference_keystroke_count;
    v_use_time_limit  := p_time_limit;
    v_use_time        := p_time_seconds;
  END IF;

  -- ======== CLAMP VALUES ========
  v_clamped_time := GREATEST(0.3, LEAST(v_use_time, v_use_time_limit * 2.0 + 10.0));
  v_clamped_ks := GREATEST(CASE WHEN p_timed_out THEN 0 ELSE 1 END, LEAST(p_keystroke_count, 10000));

  -- ======== COMPUTE SCORES SERVER-SIDE ========
  IF p_timed_out THEN
    v_efficiency := 0;
    v_speed      := 0;
    v_total      := 0;
  ELSE
    v_efficiency := solo_calc_efficiency(v_clamped_ks, v_use_ref_ks);
    v_speed      := solo_calc_speed_score(v_clamped_time, v_use_time_limit);
    v_total      := solo_calc_total_score(v_efficiency, v_speed);
  END IF;

  -- ======== INSERT CHALLENGE RESULT ========
  INSERT INTO challenge_results (
    user_id, template_id, snippet_id,
    time_seconds, keystroke_count, reference_keystroke_count,
    efficiency_score, speed_score, total_score, timed_out, replay_data
  ) VALUES (
    v_user_id, p_template_id, p_snippet_id,
    v_clamped_time, v_clamped_ks, v_use_ref_ks,
    v_efficiency, v_speed, v_total, p_timed_out, p_replay_data
  );

  -- ======== UPSERT CHALLENGE STATS ========
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

  -- ======== UPDATE SOLO ELO ========
  IF NOT p_is_practice AND NOT p_is_retry THEN
    SELECT solo_elo, solo_peak_elo, solo_games_played, solo_wins, solo_losses
    INTO v_profile
    FROM profiles WHERE id = v_user_id;

    v_opp_rating := solo_difficulty_to_rating(v_use_difficulty);
    v_expected   := solo_expected_score(v_profile.solo_elo, v_opp_rating);
    v_is_win     := NOT p_timed_out AND v_total >= 50;

    IF v_is_win THEN
      v_actual := LEAST(1.0, v_total::DOUBLE PRECISION / 100.0 + 0.2);
    ELSE
      v_actual := GREATEST(0.0, v_total::DOUBLE PRECISION / 200.0);
    END IF;

    v_delta      := round(32 * (v_actual - v_expected))::INTEGER;
    v_new_rating := GREATEST(100, LEAST(3000, v_profile.solo_elo + v_delta));

    PERFORM set_config('app.bypass_profile_guard', 'true', true);

    UPDATE profiles SET
      solo_elo          = v_new_rating,
      solo_peak_elo     = GREATEST(v_profile.solo_peak_elo, v_new_rating),
      solo_games_played = v_profile.solo_games_played + 1,
      solo_wins         = v_profile.solo_wins  + CASE WHEN v_is_win THEN 1 ELSE 0 END,
      solo_losses       = v_profile.solo_losses + CASE WHEN v_is_win THEN 0 ELSE 1 END
    WHERE id = v_user_id;

    INSERT INTO solo_elo_history (user_id, rating, difficulty, score)
    VALUES (v_user_id, v_new_rating, v_use_difficulty, v_total);
  END IF;

  -- ======== UPDATE USER STATS ========
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


-- 5. Data clearing RPCs
CREATE OR REPLACE FUNCTION clear_solo_data() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  
  DELETE FROM challenge_results WHERE user_id = auth.uid();
  DELETE FROM challenge_stats WHERE user_id = auth.uid();
  DELETE FROM solo_elo_history WHERE user_id = auth.uid();
  
  PERFORM set_config('app.bypass_profile_guard', 'true', true);
  UPDATE profiles SET 
    solo_elo = 1000, 
    solo_peak_elo = 1000, 
    solo_games_played = 0, 
    solo_wins = 0, 
    solo_losses = 0 
  WHERE id = auth.uid();
  
  UPDATE user_stats SET
    challenges_attempted = 0,
    challenges_completed = 0,
    total_practice_time_seconds = 0,
    average_challenge_score = 0,
    best_challenge_score = 0
  WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION clear_lesson_data() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  
  DELETE FROM lesson_progress WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION clear_all_data() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  
  -- Clear solo & lesson data
  PERFORM clear_solo_data();
  PERFORM clear_lesson_data();
  
  -- Clear PvP history
  DELETE FROM pvp_matches WHERE player1_id = auth.uid() OR player2_id = auth.uid();
  
  PERFORM set_config('app.bypass_profile_guard', 'true', true);
  UPDATE profiles SET 
    pvp_elo = 1000, 
    pvp_peak_elo = 1000, 
    pvp_games_played = 0, 
    pvp_wins = 0, 
    pvp_losses = 0 
  WHERE id = auth.uid();
END;
$$;
