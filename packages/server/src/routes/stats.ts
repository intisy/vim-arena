import { Router, type IRouter } from 'express'
import { getAdminClient } from '../lib/supabase.js'

export const statsRouter: IRouter = Router()

// GET /api/stats — fetch user stats
statsRouter.get('/stats', async (req, res) => {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', req.userId!)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ data: null })
      }
      return res.status(500).json({ error: error.message })
    }
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/elo — fetch solo elo + history
statsRouter.get('/elo', async (req, res) => {
  try {
    const supabase = getAdminClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('solo_elo, solo_peak_elo, solo_games_played, solo_wins, solo_losses')
      .eq('id', req.userId!)
      .single()

    if (profileError) {
      return res.status(500).json({ error: profileError.message })
    }

    const { data: history } = await supabase
      .from('solo_elo_history')
      .select('rating, created_at, difficulty, score')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .limit(50)

    res.json({ data: { profile, history: history ?? [] } })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch elo' })
  }
})

// GET /api/progress — fetch lesson progress
statsRouter.get('/progress', async (req, res) => {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', req.userId!)

    if (error) {
      return res.status(500).json({ error: error.message })
    }
    res.json({ data: data ?? [] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

// GET /api/challenge-stats — fetch challenge stats + recent results
statsRouter.get('/challenge-stats', async (req, res) => {
  try {
    const supabase = getAdminClient()
    const { data: stats, error: statsError } = await supabase
      .from('challenge_stats')
      .select('*')
      .eq('user_id', req.userId!)

    if (statsError) {
      return res.status(500).json({ error: statsError.message })
    }

    const { data: results } = await supabase
      .from('challenge_results')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .limit(200)

    res.json({ data: { stats: stats ?? [], results: results ?? [] } })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenge stats' })
  }
})
