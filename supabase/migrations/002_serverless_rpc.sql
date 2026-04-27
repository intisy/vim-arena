-- 002_serverless_rpc.sql
-- Replace the Express API server with Postgres RPC functions.
-- All PvP matchmaking and race logic runs inside Postgres.
-- Client calls these via supabase.rpc() — no server needed.

-- ============================================================
-- HELPER: PVP ELO EXPECTED SCORE (mirrors shared/pvp.types.ts)
-- ============================================================
CREATE OR REPLACE FUNCTION pvp_expected_score(
  player_rating INTEGER,
  opponent_rating INTEGER
) RETURNS DOUBLE PRECISION
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN 1.0 / (1.0 + power(10.0, (opponent_rating - player_rating)::DOUBLE PRECISION / 400.0));
END;
$$;

-- ============================================================
-- INTERNAL: Try to pair a queued player with an opponent.
-- Uses advisory lock to prevent concurrent match creation.
-- NOT callable by clients (REVOKE below).
-- ============================================================
CREATE OR REPLACE FUNCTION _try_pvp_match(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pvp_elo    INTEGER;
  v_opponent   RECORD;
  v_match_id   UUID;
  v_template_id TEXT;
  v_difficulty  SMALLINT;
  v_seed        BIGINT;
  v_p1_name     TEXT;
  v_p2_name     TEXT;
  v_now         TIMESTAMPTZ := now();
  v_wait_ms     DOUBLE PRECISION;
  v_max_diff    INTEGER;
  v_templates   TEXT[] := ARRAY['delete-char','delete-word','change-word','delete-line','join-lines'];
BEGIN
  -- Acquire advisory lock (transaction-scoped, non-blocking).
  -- If another _try_pvp_match is running, skip and return null.
  IF NOT pg_try_advisory_xact_lock(20250328) THEN
    RETURN NULL;
  END IF;

  -- Verify caller is still in queue
  SELECT mq.pvp_elo INTO v_pvp_elo
  FROM matchmaking_queue mq WHERE mq.user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN NULL; -- Not in queue (already matched or left)
  END IF;

  -- Find best opponent by Elo proximity, respecting expanding windows
  FOR v_opponent IN
    SELECT mq.user_id, mq.pvp_elo, mq.queued_at
    FROM matchmaking_queue mq
    WHERE mq.user_id != p_user_id
    ORDER BY ABS(mq.pvp_elo - v_pvp_elo) ASC
  LOOP
    -- Opponent's allowed diff expands over wait time: 100 base + 50 per 10s, capped at 500
    v_wait_ms := EXTRACT(EPOCH FROM (v_now - v_opponent.queued_at)) * 1000;
    v_max_diff := LEAST(500, 100 + (floor(v_wait_ms / 10000)::INTEGER) * 50);
    -- Also use caller's own wait time
    v_max_diff := GREATEST(v_max_diff, 100);

    IF ABS(v_opponent.pvp_elo - v_pvp_elo) <= v_max_diff THEN
      -- Match found — pick random template + difficulty
      v_template_id := v_templates[1 + floor(random() * array_length(v_templates, 1))::INTEGER];
      v_difficulty  := (2 + floor(random() * 2))::SMALLINT; -- 2 or 3
      v_seed        := floor(random() * 2147483647)::BIGINT;

      SELECT username INTO v_p1_name FROM profiles WHERE id = v_opponent.user_id;
      SELECT username INTO v_p2_name FROM profiles WHERE id = p_user_id;

      -- Create match (opponent = player1, caller = player2)
      INSERT INTO pvp_matches (
        player1_id, player2_id, challenge_seed, challenge_template_id,
        challenge_difficulty, player1_elo_before, player2_elo_before, time_limit
      ) VALUES (
        v_opponent.user_id, p_user_id, v_seed, v_template_id,
        v_difficulty, v_opponent.pvp_elo, v_pvp_elo, 60
      ) RETURNING id INTO v_match_id;

      -- Remove both from queue
      DELETE FROM matchmaking_queue
      WHERE user_id IN (v_opponent.user_id, p_user_id);

      RETURN json_build_object(
        'matchId',        v_match_id,
        'challengeSeed',  v_seed,
        'challengeTemplateId', v_template_id,
        'challengeDifficulty', v_difficulty,
        'timeLimit',      60,
        'player1Id',      v_opponent.user_id,
        'player2Id',      p_user_id,
        'player1Username', v_p1_name,
        'player2Username', v_p2_name,
        'player1Elo',     v_opponent.pvp_elo,
        'player2Elo',     v_pvp_elo,
        'opponentUserId', v_opponent.user_id
      );
    END IF;
  END LOOP;

  RETURN NULL; -- No suitable opponent found
END;
$$;

-- Hide internal helper from PostgREST / client .rpc() calls
REVOKE ALL ON FUNCTION _try_pvp_match FROM PUBLIC;

-- ============================================================
-- PUBLIC: JOIN MATCHMAKING QUEUE + INSTANT MATCH ATTEMPT
-- ============================================================
CREATE OR REPLACE FUNCTION join_matchmaking_queue()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_pvp_elo INTEGER;
  v_match   JSON;
BEGIN
  -- Get caller's PvP Elo
  SELECT pvp_elo INTO v_pvp_elo FROM profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('matched', false, 'error', 'Profile not found');
  END IF;

  -- Insert into queue (idempotent — duplicate joins are ignored)
  INSERT INTO matchmaking_queue (user_id, pvp_elo)
  VALUES (v_user_id, v_pvp_elo)
  ON CONFLICT (user_id) DO NOTHING;

  -- Attempt instant match
  v_match := _try_pvp_match(v_user_id);

  IF v_match IS NOT NULL THEN
    RETURN json_build_object('matched', true, 'config', v_match);
  END IF;

  RETURN json_build_object('matched', false);
END;
$$;

-- ============================================================
-- PUBLIC: LEAVE MATCHMAKING QUEUE
-- ============================================================
CREATE OR REPLACE FUNCTION leave_matchmaking_queue()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM matchmaking_queue WHERE user_id = auth.uid();
  RETURN json_build_object('status', 'left_queue');
END;
$$;

-- ============================================================
-- PUBLIC: GET MATCHMAKING STATUS (polling fallback + re-match)
-- ============================================================
CREATE OR REPLACE FUNCTION get_matchmaking_status()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_in_queue  BOOLEAN := false;
  v_queued_at TIMESTAMPTZ;
  v_pvp_elo   INTEGER;
  v_match_row RECORD;
  v_p1_name   TEXT;
  v_p2_name   TEXT;
  v_try_match JSON;
BEGIN
  -- Check if caller is in queue
  SELECT true, mq.queued_at, mq.pvp_elo
  INTO v_in_queue, v_queued_at, v_pvp_elo
  FROM matchmaking_queue mq
  WHERE mq.user_id = v_user_id;

  v_in_queue := COALESCE(v_in_queue, false);

  -- Check for active match (may have been created by opponent's call)
  SELECT * INTO v_match_row
  FROM pvp_matches
  WHERE (player1_id = v_user_id OR player2_id = v_user_id)
    AND status = 'active'
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_match_row.id IS NOT NULL THEN
    -- Active match exists — return it
    SELECT username INTO v_p1_name FROM profiles WHERE id = v_match_row.player1_id;
    SELECT username INTO v_p2_name FROM profiles WHERE id = v_match_row.player2_id;

    RETURN json_build_object(
      'inQueue', false,
      'match', json_build_object(
        'matchId',              v_match_row.id,
        'challengeSeed',        v_match_row.challenge_seed,
        'challengeTemplateId',  v_match_row.challenge_template_id,
        'challengeDifficulty',  v_match_row.challenge_difficulty,
        'timeLimit',            v_match_row.time_limit,
        'player1Id',            v_match_row.player1_id,
        'player2Id',            v_match_row.player2_id,
        'player1Username',      v_p1_name,
        'player2Username',      v_p2_name,
        'player1Elo',           v_match_row.player1_elo_before,
        'player2Elo',           v_match_row.player2_elo_before
      ),
      'justMatched', false
    );
  END IF;

  -- Still in queue with no match — try matching again (expanding window)
  IF v_in_queue THEN
    v_try_match := _try_pvp_match(v_user_id);

    IF v_try_match IS NOT NULL THEN
      RETURN json_build_object(
        'inQueue', false,
        'match', v_try_match,
        'justMatched', true
      );
    END IF;
  END IF;

  -- No match yet
  RETURN json_build_object(
    'inQueue', v_in_queue,
    'match', NULL,
    'justMatched', false
  );
END;
$$;

-- ============================================================
-- PUBLIC: SUBMIT RACE RESULT (atomic finalization with Elo)
-- ============================================================
CREATE OR REPLACE FUNCTION submit_race_result(
  p_match_id       UUID,
  p_time_seconds   REAL    DEFAULT NULL,
  p_keystroke_count INTEGER DEFAULT 0,
  p_completed      BOOLEAN DEFAULT false
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_match      RECORD;
  v_is_p1      BOOLEAN;
  v_p1_done    BOOLEAN;
  v_p2_done    BOOLEAN;
  v_winner_id  UUID;
  v_status     TEXT;
  v_p1_elo_after INTEGER;
  v_p2_elo_after INTEGER;
  v_p1_expected  DOUBLE PRECISION;
  v_p2_expected  DOUBLE PRECISION;
  v_p1_delta     INTEGER;
  v_p2_delta     INTEGER;
  v_p1_name      TEXT;
  v_p2_name      TEXT;
BEGIN
  -- Lock match row (prevents race condition when both players submit simultaneously)
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

  IF v_match.status != 'active' THEN
    RETURN json_build_object('status', 'already_completed', 'matchId', p_match_id);
  END IF;

  -- Record this player's result
  IF v_is_p1 THEN
    UPDATE pvp_matches SET
      player1_completed    = p_completed,
      player1_time_seconds = p_time_seconds,
      player1_keystrokes   = CASE WHEN p_keystroke_count > 0 THEN p_keystroke_count ELSE player1_keystrokes END
    WHERE id = p_match_id;
  ELSE
    UPDATE pvp_matches SET
      player2_completed    = p_completed,
      player2_time_seconds = p_time_seconds,
      player2_keystrokes   = CASE WHEN p_keystroke_count > 0 THEN p_keystroke_count ELSE player2_keystrokes END
    WHERE id = p_match_id;
  END IF;

  -- Re-read updated match
  SELECT * INTO v_match FROM pvp_matches WHERE id = p_match_id;

  -- Check if both players have submitted
  v_p1_done := v_match.player1_completed
            OR v_match.player1_time_seconds IS NOT NULL
            OR v_match.player1_keystrokes IS NOT NULL;
  v_p2_done := v_match.player2_completed
            OR v_match.player2_time_seconds IS NOT NULL
            OR v_match.player2_keystrokes IS NOT NULL;

  IF NOT v_p1_done OR NOT v_p2_done THEN
    RETURN json_build_object('status', 'waiting_for_opponent', 'result', NULL);
  END IF;

  -- ======== Both done — finalize ========

  -- Determine winner
  v_status := 'completed';
  IF v_match.player1_completed AND v_match.player2_completed THEN
    IF COALESCE(v_match.player1_time_seconds, 999999) < COALESCE(v_match.player2_time_seconds, 999999) THEN
      v_winner_id := v_match.player1_id;
    ELSIF COALESCE(v_match.player2_time_seconds, 999999) < COALESCE(v_match.player1_time_seconds, 999999) THEN
      v_winner_id := v_match.player2_id;
    END IF;
    -- else draw (v_winner_id stays NULL)
  ELSIF v_match.player1_completed AND NOT v_match.player2_completed THEN
    v_winner_id := v_match.player1_id;
    v_status := CASE WHEN v_match.player2_time_seconds IS NULL THEN 'forfeit' ELSE 'timeout' END;
  ELSIF NOT v_match.player1_completed AND v_match.player2_completed THEN
    v_winner_id := v_match.player2_id;
    v_status := CASE WHEN v_match.player1_time_seconds IS NULL THEN 'forfeit' ELSE 'timeout' END;
  ELSE
    v_status := 'timeout';
  END IF;

  -- Calculate Elo changes (K=32, range 100-3000)
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

  -- Update match final results
  UPDATE pvp_matches SET
    winner_id        = v_winner_id,
    player1_elo_after = v_p1_elo_after,
    player2_elo_after = v_p2_elo_after,
    status           = v_status,
    finished_at      = now()
  WHERE id = p_match_id;

  -- Update player 1 profile
  UPDATE profiles SET
    pvp_elo          = v_p1_elo_after,
    pvp_peak_elo     = GREATEST(pvp_peak_elo, v_p1_elo_after),
    pvp_games_played = pvp_games_played + 1,
    pvp_wins         = pvp_wins  + CASE WHEN v_winner_id = v_match.player1_id THEN 1 ELSE 0 END,
    pvp_losses       = pvp_losses + CASE WHEN v_winner_id = v_match.player2_id THEN 1 ELSE 0 END
  WHERE id = v_match.player1_id;

  -- Update player 2 profile
  UPDATE profiles SET
    pvp_elo          = v_p2_elo_after,
    pvp_peak_elo     = GREATEST(pvp_peak_elo, v_p2_elo_after),
    pvp_games_played = pvp_games_played + 1,
    pvp_wins         = pvp_wins  + CASE WHEN v_winner_id = v_match.player2_id THEN 1 ELSE 0 END,
    pvp_losses       = pvp_losses + CASE WHEN v_winner_id = v_match.player1_id THEN 1 ELSE 0 END
  WHERE id = v_match.player2_id;

  -- Fetch usernames for result
  SELECT username INTO v_p1_name FROM profiles WHERE id = v_match.player1_id;
  SELECT username INTO v_p2_name FROM profiles WHERE id = v_match.player2_id;

  RETURN json_build_object(
    'status', 'completed',
    'result', json_build_object(
      'type',      'race_result',
      'matchId',   p_match_id,
      'winnerId',  v_winner_id,
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
