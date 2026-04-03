import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { EloRating } from '@/types/stats'
import { createInitialElo, ratingToDifficulty, getDifficultyWeights, getTimeMultiplier } from '@/engine/EloRating'

export const ELO_QUERY_KEY = ['elo-rating']

async function fetchElo(userId: string): Promise<EloRating> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('solo_elo, solo_peak_elo, solo_games_played, solo_wins, solo_losses')
    .eq('id', userId)
    .single()

  if (error) throw error

  const { data: history } = await supabase
    .from('solo_elo_history')
    .select('rating, created_at, difficulty, score')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return {
    rating: profile.solo_elo,
    gamesPlayed: profile.solo_games_played,
    wins: profile.solo_wins,
    losses: profile.solo_losses,
    peakRating: profile.solo_peak_elo,
    history: (history ?? []).map(h => ({
      rating: h.rating,
      timestamp: new Date(h.created_at).getTime(),
      difficulty: h.difficulty as 1 | 2 | 3 | 4 | 5,
      score: h.score,
    })),
  }
}

export function useEloRating() {
  const { user } = useAuth()
  const userId = user?.id

  const { data: elo = createInitialElo(), isLoading } = useQuery({
    queryKey: ELO_QUERY_KEY,
    queryFn: () => fetchElo(userId!),
    enabled: !!userId,
  })

  const getMatchedDifficulty = useCallback((): 1 | 2 | 3 | 4 | 5 => {
    return ratingToDifficulty(elo.rating)
  }, [elo.rating])

  return { elo, getMatchedDifficulty, getDifficultyWeights, getTimeMultiplier, isLoading }
}
