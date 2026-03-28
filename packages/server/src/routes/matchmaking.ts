import { Router, type IRouter } from 'express'
import { getAdminClient } from '../lib/supabase.js'

export const matchmakingRouter: IRouter = Router()

// POST /api/matchmaking/queue — join the matchmaking queue
matchmakingRouter.post('/matchmaking/queue', async (req, res) => {
  try {
    const userId = req.userId!
    const supabase = getAdminClient()

    // Get user's pvp_elo from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('pvp_elo')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    // Insert into queue (UNIQUE on user_id — duplicate joins get 23505)
    const { error: insertError } = await supabase
      .from('matchmaking_queue')
      .insert({
        user_id: userId,
        pvp_elo: profile.pvp_elo,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return res.json({ status: 'already_queued' })
      }
      return res.status(500).json({ error: insertError.message })
    }

    res.json({ status: 'queued', pvpElo: profile.pvp_elo })
  } catch (err) {
    console.error('[matchmaking/queue POST error]', err)
    res.status(500).json({ error: 'Failed to join queue' })
  }
})

// DELETE /api/matchmaking/queue — leave the matchmaking queue
matchmakingRouter.delete('/matchmaking/queue', async (req, res) => {
  try {
    const userId = req.userId!
    const supabase = getAdminClient()

    const { error } = await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', userId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ status: 'left_queue' })
  } catch (err) {
    console.error('[matchmaking/queue DELETE error]', err)
    res.status(500).json({ error: 'Failed to leave queue' })
  }
})

// GET /api/matchmaking/status — check queue status + active match
matchmakingRouter.get('/matchmaking/status', async (req, res) => {
  try {
    const userId = req.userId!
    const supabase = getAdminClient()

    // Check queue
    const { data: queueEntry, error: queueError } = await supabase
      .from('matchmaking_queue')
      .select('queued_at, pvp_elo')
      .eq('user_id', userId)
      .single()

    const inQueue = !queueError && !!queueEntry

    // Check for active match (polling fallback for Realtime)
    const { data: activeMatch } = await supabase
      .from('pvp_matches')
      .select('id, player1_id, player2_id, challenge_seed, challenge_template_id, challenge_difficulty, time_limit, player1_elo_before, player2_elo_before, status')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    let match = null
    if (activeMatch) {
      // Fetch usernames for match config
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', [activeMatch.player1_id, activeMatch.player2_id])

      const p1Name = profiles?.find((p: { id: string }) => p.id === activeMatch.player1_id)?.username ?? 'Player 1'
      const p2Name = profiles?.find((p: { id: string }) => p.id === activeMatch.player2_id)?.username ?? 'Player 2'

      match = {
        matchId: activeMatch.id,
        challengeSeed: activeMatch.challenge_seed,
        challengeTemplateId: activeMatch.challenge_template_id,
        challengeDifficulty: activeMatch.challenge_difficulty,
        timeLimit: activeMatch.time_limit,
        player1Id: activeMatch.player1_id,
        player2Id: activeMatch.player2_id,
        player1Username: p1Name,
        player2Username: p2Name,
        player1Elo: activeMatch.player1_elo_before,
        player2Elo: activeMatch.player2_elo_before,
      }
    }

    res.json({
      inQueue,
      queuedAt: queueEntry?.queued_at ?? null,
      pvpElo: queueEntry?.pvp_elo ?? null,
      match,
    })
  } catch (err) {
    console.error('[matchmaking/status error]', err)
    res.status(500).json({ error: 'Failed to check matchmaking status' })
  }
})
