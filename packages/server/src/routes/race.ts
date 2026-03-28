import { Router, type IRouter } from 'express'
import { getAdminClient } from '../lib/supabase.js'
import { calculatePvpElo, calculatePvpEloDraw } from '@vim-arena/shared'
import type { RaceResultMessage } from '@vim-arena/shared'

export const raceRouter: IRouter = Router()

interface RaceCompleteBody {
  matchId: string
  timeSeconds: number | null
  keystrokeCount: number
  completed: boolean
}

// POST /api/race/complete — player reports race completion or timeout
raceRouter.post('/race/complete', async (req, res) => {
  try {
    const body = req.body as RaceCompleteBody
    const userId = req.userId!
    const supabase = getAdminClient()

    if (!body.matchId) {
      return res.status(400).json({ error: 'Missing matchId' })
    }

    // Fetch the match
    const { data: match, error: matchError } = await supabase
      .from('pvp_matches')
      .select('*')
      .eq('id', body.matchId)
      .single()

    if (matchError || !match) {
      return res.status(404).json({ error: 'Match not found' })
    }

    // Verify user is a participant
    const isP1 = match.player1_id === userId
    const isP2 = match.player2_id === userId
    if (!isP1 && !isP2) {
      return res.status(403).json({ error: 'Not a participant in this match' })
    }

    // Don't allow double-submit
    if (match.status !== 'active') {
      return res.json({ status: 'already_completed', matchId: body.matchId })
    }

    // Update this player's result in the match
    const playerUpdate: Record<string, unknown> = {}
    if (isP1) {
      playerUpdate.player1_completed = body.completed
      if (body.timeSeconds !== null) playerUpdate.player1_time_seconds = body.timeSeconds
      if (body.keystrokeCount > 0) playerUpdate.player1_keystrokes = body.keystrokeCount
    } else {
      playerUpdate.player2_completed = body.completed
      if (body.timeSeconds !== null) playerUpdate.player2_time_seconds = body.timeSeconds
      if (body.keystrokeCount > 0) playerUpdate.player2_keystrokes = body.keystrokeCount
    }

    await supabase
      .from('pvp_matches')
      .update(playerUpdate)
      .eq('id', body.matchId)

    // Re-fetch to see if both players have submitted
    const { data: updated } = await supabase
      .from('pvp_matches')
      .select('*')
      .eq('id', body.matchId)
      .single()

    if (!updated) {
      return res.json({ status: 'recorded', result: null })
    }

    // Check if both players have submitted
    const p1Done = updated.player1_completed || updated.player1_time_seconds !== null || updated.player1_keystrokes !== null
    const p2Done = updated.player2_completed || updated.player2_time_seconds !== null || updated.player2_keystrokes !== null

    if (!p1Done || !p2Done) {
      // Only one player finished — wait for the other
      if (body.completed) {
        const channel = supabase.channel(`race:${body.matchId}`)
        await channel.send({
          type: 'broadcast',
          event: 'player_complete',
          payload: { playerId: userId },
        })
        supabase.removeChannel(channel)
      }

      return res.json({ status: 'waiting_for_opponent', result: null })
    }

    // Both players done — finalize the match
    const result = await finalizeMatch(updated)
    res.json({ status: 'completed', result })
  } catch (err) {
    console.error('[race/complete error]', err)
    res.status(500).json({ error: 'Failed to record race completion' })
  }
})

interface MatchRow {
  id: string
  player1_id: string
  player2_id: string
  player1_completed: boolean
  player2_completed: boolean
  player1_time_seconds: number | null
  player2_time_seconds: number | null
  player1_keystrokes: number | null
  player2_keystrokes: number | null
  player1_elo_before: number
  player2_elo_before: number
  time_limit: number
}

async function finalizeMatch(match: MatchRow): Promise<RaceResultMessage> {
  const supabase = getAdminClient()

  // Determine winner
  let winnerId: string | null = null
  let status: 'completed' | 'forfeit' | 'timeout' = 'completed'

  if (match.player1_completed && match.player2_completed) {
    const t1 = match.player1_time_seconds ?? Infinity
    const t2 = match.player2_time_seconds ?? Infinity
    if (t1 < t2) winnerId = match.player1_id
    else if (t2 < t1) winnerId = match.player2_id
  } else if (match.player1_completed && !match.player2_completed) {
    winnerId = match.player1_id
    status = match.player2_time_seconds === null ? 'forfeit' : 'timeout'
  } else if (!match.player1_completed && match.player2_completed) {
    winnerId = match.player2_id
    status = match.player1_time_seconds === null ? 'forfeit' : 'timeout'
  } else {
    status = 'timeout'
  }

  // Calculate Elo changes
  let p1EloAfter: number
  let p2EloAfter: number

  if (winnerId === match.player1_id) {
    const elo = calculatePvpElo(match.player1_elo_before, match.player2_elo_before)
    p1EloAfter = elo.winnerNewElo
    p2EloAfter = elo.loserNewElo
  } else if (winnerId === match.player2_id) {
    const elo = calculatePvpElo(match.player2_elo_before, match.player1_elo_before)
    p1EloAfter = elo.loserNewElo
    p2EloAfter = elo.winnerNewElo
  } else {
    const elo = calculatePvpEloDraw(match.player1_elo_before, match.player2_elo_before)
    p1EloAfter = elo.player1NewElo
    p2EloAfter = elo.player2NewElo
  }

  // Update match with final results
  await supabase
    .from('pvp_matches')
    .update({
      winner_id: winnerId,
      player1_elo_after: p1EloAfter,
      player2_elo_after: p2EloAfter,
      status,
      finished_at: new Date().toISOString(),
    })
    .eq('id', match.id)

  // Update profiles — read current values, then write incremented
  const p1Won = winnerId === match.player1_id
  const p2Won = winnerId === match.player2_id

  await updatePlayerProfile(match.player1_id, p1EloAfter, match.player1_elo_before, p1Won, p2Won)
  await updatePlayerProfile(match.player2_id, p2EloAfter, match.player2_elo_before, p2Won, p1Won)

  // Fetch usernames for result message
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', [match.player1_id, match.player2_id])

  const p1Name = profiles?.find((p: { id: string }) => p.id === match.player1_id)?.username ?? 'Player 1'
  const p2Name = profiles?.find((p: { id: string }) => p.id === match.player2_id)?.username ?? 'Player 2'

  const resultMessage: RaceResultMessage = {
    type: 'race_result',
    matchId: match.id,
    winnerId,
    player1: {
      id: match.player1_id,
      username: p1Name,
      timeSeconds: match.player1_time_seconds,
      keystrokeCount: match.player1_keystrokes,
      completed: match.player1_completed,
      eloBefore: match.player1_elo_before,
      eloAfter: p1EloAfter,
    },
    player2: {
      id: match.player2_id,
      username: p2Name,
      timeSeconds: match.player2_time_seconds,
      keystrokeCount: match.player2_keystrokes,
      completed: match.player2_completed,
      eloBefore: match.player2_elo_before,
      eloAfter: p2EloAfter,
    },
    status,
  }

  // Broadcast result to both players via Realtime
  const channel = supabase.channel(`race:${match.id}`)
  await channel.send({
    type: 'broadcast',
    event: 'race_result',
    payload: resultMessage,
  })
  supabase.removeChannel(channel)

  return resultMessage
}

/** Read-then-write profile update for PvP stats (atomic increment not available without RPC) */
async function updatePlayerProfile(
  playerId: string,
  newElo: number,
  previousElo: number,
  won: boolean,
  lost: boolean,
): Promise<void> {
  const supabase = getAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('pvp_games_played, pvp_wins, pvp_losses, pvp_peak_elo')
    .eq('id', playerId)
    .single()

  if (!profile) return

  await supabase
    .from('profiles')
    .update({
      pvp_elo: newElo,
      pvp_peak_elo: Math.max(newElo, profile.pvp_peak_elo, previousElo),
      pvp_games_played: profile.pvp_games_played + 1,
      pvp_wins: profile.pvp_wins + (won ? 1 : 0),
      pvp_losses: profile.pvp_losses + (lost ? 1 : 0),
    })
    .eq('id', playerId)
}
