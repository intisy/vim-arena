import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { EloRating } from '@/types/stats'
import { createInitialElo, updateElo, ratingToDifficulty } from '@/engine/EloRating'

const QUERY_KEY = ['elo-rating']

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
  const queryClient = useQueryClient()
  const userId = user?.id

  const { data: elo = createInitialElo(), isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchElo(userId!),
    enabled: !!userId,
  })

  const recordMutation = useMutation({
    mutationFn: async ({ difficulty, score, timedOut }: { difficulty: 1 | 2 | 3 | 4 | 5; score: number; timedOut: boolean }) => {
      if (!userId) throw new Error('Not authenticated')
      const updated = updateElo(elo, difficulty, score, timedOut)

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          solo_elo: updated.rating,
          solo_peak_elo: updated.peakRating,
          solo_games_played: updated.gamesPlayed,
          solo_wins: updated.wins,
          solo_losses: updated.losses,
        })
        .eq('id', userId)
      if (profileError) throw profileError

      // Insert history entry
      const { error: histError } = await supabase
        .from('solo_elo_history')
        .insert({
          user_id: userId,
          rating: updated.rating,
          difficulty,
          score,
        })
      if (histError) throw histError
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const recordChallengeResult = useCallback(
    (difficulty: 1 | 2 | 3 | 4 | 5, score: number, timedOut: boolean) => {
      recordMutation.mutate({ difficulty, score, timedOut })
    },
    [recordMutation],
  )

  const getMatchedDifficulty = useCallback((): 1 | 2 | 3 | 4 | 5 => {
    return ratingToDifficulty(elo.rating)
  }, [elo.rating])

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated')
      const initial = createInitialElo()
      const { error } = await supabase
        .from('profiles')
        .update({
          solo_elo: initial.rating,
          solo_peak_elo: initial.peakRating,
          solo_games_played: initial.gamesPlayed,
          solo_wins: initial.wins,
          solo_losses: initial.losses,
        })
        .eq('id', userId)
      if (error) throw error

      // Clear history
      const { error: histError } = await supabase
        .from('solo_elo_history')
        .delete()
        .eq('user_id', userId)
      if (histError) throw histError
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const resetElo = useCallback(() => {
    resetMutation.mutate()
  }, [resetMutation])

  return { elo, recordChallengeResult, getMatchedDifficulty, resetElo, isLoading }
}
