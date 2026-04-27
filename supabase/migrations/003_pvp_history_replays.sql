-- 003_pvp_history_replays.sql
-- Adds: replay storage, match history RPCs, auto-forfeit for stale matches,
--        stale queue cleanup, stale match cleanup in matchmaking.

-- ============================================================
-- 1. REPLAY DATA COLUMNS
-- ============================================================
ALTER TABLE public.pvp_matches
  ADD COLUMN IF NOT EXISTS player1_replay JSONB,
  ADD COLUMN IF NOT EXISTS player2_replay JSONB;

-- ============================================================
-- 2. SUBMIT REPLAY DATA (player sends snapshots after race)
-- ============================================================
CREATE OR REPLACE FUNCTION submit_replay_data(
  p_match_id UUID,
  p_replay_data JSONB
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match   RECORD;
BEGIN
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
-- 3. GET PVP MATCH HISTORY
-- ============================================================
CREATE OR REPLACE FUNCTION get_pvp_history(
  p_limit INTEGER DEFAULT 20
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result  JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT
      m.id AS "matchId",
      m.status,
      m.winner_id AS "winnerId",
      m.started_at AS "startedAt",
      m.finished_at AS "finishedAt",
      m.challenge_template_id AS "challengeTemplateId",
      m.challenge_difficulty AS "challengeDifficulty",
      CASE WHEN m.player1_id = v_user_id THEN m.player1_id ELSE m.player2_id END AS "myId",
      CASE WHEN m.player1_id = v_user_id THEN p1.username ELSE p2.username END AS "myUsername",
      CASE WHEN m.player1_id = v_user_id THEN m.player2_id ELSE m.player1_id END AS "opponentId",
      CASE WHEN m.player1_id = v_user_id THEN p2.username ELSE p1.username END AS "opponentUsername",
      CASE WHEN m.player1_id = v_user_id THEN m.player1_time_seconds ELSE m.player2_time_seconds END AS "myTimeSeconds",
      CASE WHEN m.player1_id = v_user_id THEN m.player1_keystrokes ELSE m.player2_keystrokes END AS "myKeystrokes",
      CASE WHEN m.player1_id = v_user_id THEN m.player1_completed ELSE m.player2_completed END AS "myCompleted",
      CASE WHEN m.player1_id = v_user_id THEN m.player1_elo_before ELSE m.player2_elo_before END AS "myEloBefore",
      CASE WHEN m.player1_id = v_user_id THEN m.player1_elo_after ELSE m.player2_elo_after END AS "myEloAfter",
      CASE WHEN m.player1_id = v_user_id THEN m.player2_time_seconds ELSE m.player1_time_seconds END AS "opponentTimeSeconds",
      CASE WHEN m.player1_id = v_user_id THEN m.player2_keystrokes ELSE m.player1_keystrokes END AS "opponentKeystrokes",
      CASE WHEN m.player1_id = v_user_id THEN m.player2_completed ELSE m.player1_completed END AS "opponentCompleted",
      CASE WHEN m.player1_id = v_user_id THEN m.player2_elo_before ELSE m.player1_elo_before END AS "opponentEloBefore",
      CASE WHEN m.player1_id = v_user_id THEN m.player2_elo_after ELSE m.player1_elo_after END AS "opponentEloAfter",
      (m.player1_replay IS NOT NULL OR m.player2_replay IS NOT NULL) AS "hasReplay"
    FROM pvp_matches m
    JOIN profiles p1 ON p1.id = m.player1_id
    JOIN profiles p2 ON p2.id = m.player2_id
    WHERE (m.player1_id = v_user_id OR m.player2_id = v_user_id)
      AND m.status != 'active'
    ORDER BY m.started_at DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- ============================================================
-- 4. GET MATCH REPLAY DATA
-- ============================================================
CREATE OR REPLACE FUNCTION get_match_replay(
  p_match_id UUID
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match   RECORD;
  v_p1_name TEXT;
  v_p2_name TEXT;
BEGIN
  SELECT * INTO v_match FROM pvp_matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN json_build_object('status', 'error', 'error', 'Match not found');
  END IF;

  IF v_match.player1_id != v_user_id AND v_match.player2_id != v_user_id THEN
    RETURN json_build_object('status', 'error', 'error', 'Not a participant');
  END IF;

  SELECT username INTO v_p1_name FROM profiles WHERE id = v_match.player1_id;
  SELECT username INTO v_p2_name FROM profiles WHERE id = v_match.player2_id;

  RETURN json_build_object(
    'status', 'ok',
    'match', json_build_object(
      'matchId',              v_match.id,
      'status',               v_match.status,
      'winnerId',             v_match.winner_id,
      'challengeSeed',        v_match.challenge_seed,
      'challengeTemplateId',  v_match.challenge_template_id,
      'challengeDifficulty',  v_match.challenge_difficulty,
      'timeLimit',            v_match.time_limit,
      'startedAt',            v_match.started_at,
      'finishedAt',           v_match.finished_at,
      'player1', json_build_object(
        'id',             v_match.player1_id,
        'username',       v_p1_name,
        'timeSeconds',    v_match.player1_time_seconds,
        'keystrokeCount', v_match.player1_keystrokes,
        'completed',      v_match.player1_completed,
        'eloBefore',      v_match.player1_elo_before,
        'eloAfter',       v_match.player1_elo_after,
        'replay',         v_match.player1_replay
      ),
      'player2', json_build_object(
        'id',             v_match.player2_id,
        'username',       v_p2_name,
        'timeSeconds',    v_match.player2_time_seconds,
        'keystrokeCount', v_match.player2_keystrokes,
        'completed',      v_match.player2_completed,
        'eloBefore',      v_match.player2_elo_before,
        'eloAfter',       v_match.player2_elo_after,
        'replay',         v_match.player2_replay
      )
    )
  );
END;
$$;

-- ============================================================
-- 5. UPDATE submit_race_result: IDEMPOTENT + AUTO-FORFEIT
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

  IF v_match.status != 'active' THEN
    -- Match already finalized — return existing result (idempotent)
    SELECT username INTO v_p1_name FROM profiles WHERE id = v_match.player1_id;
    SELECT username INTO v_p2_name FROM profiles WHERE id = v_match.player2_id;

    RETURN json_build_object(
      'status', 'completed',
      'result', json_build_object(
        'type',      'race_result',
        'matchId',   p_match_id,
        'winnerId',  v_match.winner_id,
        'player1', json_build_object(
          'id', v_match.player1_id, 'username', v_p1_name,
          'timeSeconds', v_match.player1_time_seconds,
          'keystrokeCount', v_match.player1_keystrokes,
          'completed', v_match.player1_completed,
          'eloBefore', v_match.player1_elo_before,
          'eloAfter', v_match.player1_elo_after
        ),
        'player2', json_build_object(
          'id', v_match.player2_id, 'username', v_p2_name,
          'timeSeconds', v_match.player2_time_seconds,
          'keystrokeCount', v_match.player2_keystrokes,
          'completed', v_match.player2_completed,
          'eloBefore', v_match.player2_elo_before,
          'eloAfter', v_match.player2_elo_after
        ),
        'status', v_match.status
      )
    );
  END IF;

  -- Check if this player already submitted
  v_p1_done := v_match.player1_completed
            OR v_match.player1_time_seconds IS NOT NULL
            OR (v_match.player1_keystrokes IS NOT NULL AND v_match.player1_keystrokes > 0);
  v_p2_done := v_match.player2_completed
            OR v_match.player2_time_seconds IS NOT NULL
            OR (v_match.player2_keystrokes IS NOT NULL AND v_match.player2_keystrokes > 0);

  -- Record this player's result only if not already recorded
  IF v_is_p1 AND NOT v_p1_done THEN
    UPDATE pvp_matches SET
      player1_completed    = p_completed,
      player1_time_seconds = p_time_seconds,
      player1_keystrokes   = CASE WHEN p_keystroke_count > 0 THEN p_keystroke_count ELSE player1_keystrokes END
    WHERE id = p_match_id;
  ELSIF NOT v_is_p1 AND NOT v_p2_done THEN
    UPDATE pvp_matches SET
      player2_completed    = p_completed,
      player2_time_seconds = p_time_seconds,
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
    winner_id        = v_winner_id,
    player1_elo_after = v_p1_elo_after,
    player2_elo_after = v_p2_elo_after,
    status           = v_status,
    finished_at      = now()
  WHERE id = p_match_id;

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

-- ============================================================
-- 6. UPDATE join_matchmaking_queue: CLEAN STALE QUEUE + MATCHES
-- ============================================================
CREATE OR REPLACE FUNCTION join_matchmaking_queue()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_pvp_elo INTEGER;
  v_match   JSON;
BEGIN
  -- Clean up stale queue entries (queued > 5 min ago)
  DELETE FROM matchmaking_queue
  WHERE queued_at < now() - interval '5 minutes';

  -- Finalize any stale active matches for the caller so they can re-queue
  UPDATE pvp_matches SET
    status = 'forfeit',
    finished_at = now()
  WHERE status = 'active'
    AND (player1_id = v_user_id OR player2_id = v_user_id)
    AND now() > started_at + make_interval(secs => (time_limit + 60)::DOUBLE PRECISION);

  SELECT pvp_elo INTO v_pvp_elo FROM profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('matched', false, 'error', 'Profile not found');
  END IF;

  INSERT INTO matchmaking_queue (user_id, pvp_elo)
  VALUES (v_user_id, v_pvp_elo)
  ON CONFLICT (user_id) DO NOTHING;

  v_match := _try_pvp_match(v_user_id);

  IF v_match IS NOT NULL THEN
    RETURN json_build_object('matched', true, 'config', v_match);
  END IF;

  RETURN json_build_object('matched', false);
END;
$$;

-- ============================================================
-- 7. UPDATE get_matchmaking_status: SKIP STALE ACTIVE MATCHES
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
  SELECT true, mq.queued_at, mq.pvp_elo
  INTO v_in_queue, v_queued_at, v_pvp_elo
  FROM matchmaking_queue mq
  WHERE mq.user_id = v_user_id;

  v_in_queue := COALESCE(v_in_queue, false);

  -- Only return non-stale active matches (within time_limit + 60s)
  SELECT * INTO v_match_row
  FROM pvp_matches
  WHERE (player1_id = v_user_id OR player2_id = v_user_id)
    AND status = 'active'
    AND now() <= started_at + make_interval(secs => (time_limit + 60)::DOUBLE PRECISION)
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_match_row.id IS NOT NULL THEN
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

  -- Finalize any stale active matches
  UPDATE pvp_matches SET
    status = 'forfeit',
    finished_at = now()
  WHERE (player1_id = v_user_id OR player2_id = v_user_id)
    AND status = 'active'
    AND now() > started_at + make_interval(secs => (time_limit + 60)::DOUBLE PRECISION);

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

  RETURN json_build_object(
    'inQueue', v_in_queue,
    'match', NULL,
    'justMatched', false
  );
END;
$$;
