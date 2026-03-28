import { Router, type IRouter } from 'express'
import { getAdminClient } from '../lib/supabase.js'
import { updateElo } from '@vim-arena/shared'
import type { EloRating } from '@vim-arena/shared'

export const challengesRouter: IRouter = Router()

interface RecordBody {
  templateId: string
  snippetId: string
  timeSeconds: number
  keystrokeCount: number
  referenceKeystrokeCount: number
  efficiencyScore: number
  speedScore: number
  totalScore: number
  timedOut: boolean
  difficulty: 1 | 2 | 3 | 4 | 5
  practiceMode?: boolean
}

// POST /api/challenges/record — securely record a challenge result + update elo
challengesRouter.post('/challenges/record', async (req, res) => {
  try {
    const body = req.body as RecordBody
    const userId = req.userId!
    const supabase = getAdminClient()

    // Validate required fields
    if (!body.templateId || !body.snippetId || body.totalScore === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // 1. Insert challenge result
    const { error: resultError } = await supabase
      .from('challenge_results')
      .insert({
        user_id: userId,
        template_id: body.templateId,
        snippet_id: body.snippetId,
        time_seconds: body.timeSeconds,
        keystroke_count: body.keystrokeCount,
        reference_keystroke_count: body.referenceKeystrokeCount,
        efficiency_score: body.efficiencyScore,
        speed_score: body.speedScore,
        total_score: body.totalScore,
        timed_out: body.timedOut,
      })
    if (resultError) {
      return res.status(500).json({ error: resultError.message })
    }

    // 2. Upsert challenge stats
    const { data: existingStats } = await supabase
      .from('challenge_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('template_id', body.templateId)
      .single()

    const newAttempts = (existingStats?.attempts ?? 0) + 1
    const newBestScore = Math.max(existingStats?.best_score ?? 0, body.totalScore)
    const existingBestTime = existingStats?.best_time_seconds ?? body.timeSeconds
    const newBestTime = Math.min(existingBestTime, body.timeSeconds)

    const { error: statsError } = await supabase
      .from('challenge_stats')
      .upsert({
        user_id: userId,
        template_id: body.templateId,
        attempts: newAttempts,
        best_score: newBestScore,
        best_time_seconds: newBestTime,
        average_efficiency: body.efficiencyScore, // simplified — single value update
      }, { onConflict: 'user_id,template_id' })
    if (statsError) {
      return res.status(500).json({ error: statsError.message })
    }

    // 3. Update user stats
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (userStats) {
      const total = userStats.challenges_attempted + 1
      const newAvg = Math.round(
        (userStats.average_challenge_score * userStats.challenges_attempted + body.totalScore) / total,
      )
      await supabase
        .from('user_stats')
        .update({
          challenges_attempted: total,
          challenges_completed: body.totalScore >= 50 ? userStats.challenges_completed + 1 : userStats.challenges_completed,
          total_practice_time_seconds: userStats.total_practice_time_seconds + body.timeSeconds,
          average_challenge_score: newAvg,
          best_challenge_score: Math.max(userStats.best_challenge_score, body.totalScore),
          last_active_date: new Date().toISOString().split('T')[0],
        })
        .eq('user_id', userId)
    }

    // 4. Update Elo (skip if practice mode)
    let eloChange: { before: number; after: number } | null = null
    if (!body.practiceMode) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('solo_elo, solo_peak_elo, solo_games_played, solo_wins, solo_losses')
        .eq('id', userId)
        .single()

      if (profile) {
        const currentElo: EloRating = {
          rating: profile.solo_elo,
          gamesPlayed: profile.solo_games_played,
          wins: profile.solo_wins,
          losses: profile.solo_losses,
          peakRating: profile.solo_peak_elo,
          history: [],
        }

        const updated = updateElo(currentElo, body.difficulty, body.totalScore, body.timedOut)
        eloChange = { before: currentElo.rating, after: updated.rating }

        await supabase
          .from('profiles')
          .update({
            solo_elo: updated.rating,
            solo_peak_elo: updated.peakRating,
            solo_games_played: updated.gamesPlayed,
            solo_wins: updated.wins,
            solo_losses: updated.losses,
          })
          .eq('id', userId)

        await supabase
          .from('solo_elo_history')
          .insert({
            user_id: userId,
            rating: updated.rating,
            difficulty: body.difficulty,
            score: body.totalScore,
          })
      }
    }

    res.json({ success: true, eloChange })
  } catch (err) {
    console.error('[challenges/record error]', err)
    res.status(500).json({ error: 'Failed to record challenge result' })
  }
})
