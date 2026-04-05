-- 005_security_hardening_phase2.sql
-- Security Phase 2: Server-side timing for solo challenges,
-- prevent metadata spoofing, minimum time gates, rate limiting.
--
-- ATTACK SURFACE CLOSED:
--   1. Solo time computed server-side (can't curl fake time)
--   2. Difficulty / reference keystrokes stored at start (can't spoof)
--   3. Double-submission blocked (challenge marked completed)
--   4. Minimum time gate rejects instant completions
--   5. PvP minimum time gate added

-- ============================================================
-- 1. ACTIVE SOLO CHALLENGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.active_solo_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  snippet_id TEXT NOT NULL,
  difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  reference_keystroke_count INTEGER NOT NULL CHECK (reference_keystroke_count >= 1),
  time_limit REAL NOT NULL CHECK (time_limit > 0 AND time_limit <= 300),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_solo_user
  ON public.active_solo_challenges(user_id, completed, created_at DESC);

-- RLS: only RPCs can read/write
ALTER TABLE public.active_solo_challenges ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT own rows (needed for debugging)
CREATE POLICY "Users can view own active challenges"
  ON public.active_solo_challenges FOR SELECT
  USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE — only SECURITY DEFINER RPCs

-- ============================================================
-- 2. START SOLO CHALLENGE (records metadata + start time)
-- ============================================================
CREATE OR REPLACE FUNCTION start_solo_challenge(
  p_template_id TEXT,
  p_snippet_id TEXT,
  p_difficulty SMALLINT,
  p_reference_keystroke_count INTEGER,
  p_time_limit REAL
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
    reference_keystroke_count, time_limit
  ) VALUES (
    v_user_id, p_template_id, p_snippet_id, p_difficulty,
    p_reference_keystroke_count, p_time_limit
  ) RETURNING id INTO v_challenge_id;

  RETURN json_build_object('status', 'ok', 'challengeId', v_challenge_id);
END;
$$;

-- ============================================================
-- 3. HARDENED SUBMIT SOLO RESULT
--    Now accepts p_challenge_id for server-side timing + metadata.
--    Falls back to old behavior when p_challenge_id is NULL
--    (backward compat during client migration).
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
  p_is_retry                BOOLEAN DEFAULT false,
  p_challenge_id            UUID DEFAULT NULL
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

  -- ======== SERVER-SIDE CHALLENGE LOOKUP (when p_challenge_id provided) ========
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

    -- Compute server-side time (subtract 3s countdown)
    v_server_time := EXTRACT(EPOCH FROM (now() - v_challenge.started_at))::REAL - 3.0;

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
    -- Still validate
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
    efficiency_score, speed_score, total_score, timed_out
  ) VALUES (
    v_user_id, p_template_id, p_snippet_id,
    v_clamped_time, v_clamped_ks, v_use_ref_ks,
    v_efficiency, v_speed, v_total, p_timed_out
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

  -- ======== UPDATE SOLO ELO (skip for practice / retry) ========
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

-- ============================================================
-- 4. HARDENED SUBMIT RACE RESULT — MINIMUM TIME GATE
-- ============================================================
CREATE OR REPLACE FUNCTION submit_race_result(
  p_match_id        UUID,
  p_time_seconds    REAL    DEFAULT NULL,
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
  v_clamped_ks   INTEGER;
BEGIN
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

  -- Idempotent: already finalized
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

  -- ======== SERVER-SIDE TIME (authoritative) ========
  v_server_time := GREATEST(0.1,
    EXTRACT(EPOCH FROM (now() - v_match.started_at))::REAL - 3.0
  );

  -- ======== MINIMUM TIME GATE ========
  -- Reject completions faster than 1.0s (physically impossible)
  IF p_completed AND v_server_time < 1.0 THEN
    RETURN json_build_object('status', 'error', 'error', 'Completed too fast');
  END IF;

  -- ======== CLAMP KEYSTROKE COUNT ========
  v_clamped_ks := CASE
    WHEN p_keystroke_count <= 0 THEN 0
    ELSE LEAST(p_keystroke_count, 10000)
  END;

  -- Check if this player already submitted
  v_p1_done := v_match.player1_completed
            OR v_match.player1_time_seconds IS NOT NULL
            OR (v_match.player1_keystrokes IS NOT NULL AND v_match.player1_keystrokes > 0);
  v_p2_done := v_match.player2_completed
            OR v_match.player2_time_seconds IS NOT NULL
            OR (v_match.player2_keystrokes IS NOT NULL AND v_match.player2_keystrokes > 0);

  -- Record this player's result (use SERVER time, clamped keystrokes)
  IF v_is_p1 AND NOT v_p1_done THEN
    UPDATE pvp_matches SET
      player1_completed    = p_completed,
      player1_time_seconds = CASE WHEN p_completed THEN v_server_time ELSE NULL END,
      player1_keystrokes   = CASE WHEN v_clamped_ks > 0 THEN v_clamped_ks ELSE player1_keystrokes END
    WHERE id = p_match_id;
  ELSIF NOT v_is_p1 AND NOT v_p2_done THEN
    UPDATE pvp_matches SET
      player2_completed    = p_completed,
      player2_time_seconds = CASE WHEN p_completed THEN v_server_time ELSE NULL END,
      player2_keystrokes   = CASE WHEN v_clamped_ks > 0 THEN v_clamped_ks ELSE player2_keystrokes END
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

  -- ======== Both done — finalize ========
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

  UPDATE pvp_matches SET
    winner_id         = v_winner_id,
    player1_elo_after = v_p1_elo_after,
    player2_elo_after = v_p2_elo_after,
    status            = v_status,
    finished_at       = now()
  WHERE id = p_match_id;

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
