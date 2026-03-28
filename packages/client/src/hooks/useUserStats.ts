import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserStats } from '@/types/stats'

const QUERY_KEY = ['user-stats']

const today = () => new Date().toISOString().split('T')[0]

const DEFAULT_STATS: UserStats = {
  lessonsCompleted: 0,
  totalLessons: 0,
  challengesAttempted: 0,
  challengesCompleted: 0,
  totalPracticeTimeSeconds: 0,
  averageChallengeScore: 0,
  bestChallengeScore: 0,
  streakDays: 0,
  lastActiveDate: today(),
  joinedDate: today(),
}

async function fetchUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // Row may not exist yet (race with trigger)
    if (error.code === 'PGRST116') return DEFAULT_STATS
    throw error
  }

  return {
    lessonsCompleted: data.lessons_completed,
    totalLessons: 0, // computed client-side
    challengesAttempted: data.challenges_attempted,
    challengesCompleted: data.challenges_completed,
    totalPracticeTimeSeconds: data.total_practice_time_seconds,
    averageChallengeScore: data.average_challenge_score,
    bestChallengeScore: data.best_challenge_score,
    streakDays: data.streak_days,
    lastActiveDate: data.last_active_date,
    joinedDate: data.joined_date,
  }
}

export function useUserStats() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  const { data: userStats = DEFAULT_STATS, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchUserStats(userId!),
    enabled: !!userId,
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserStats>) => {
      if (!userId) throw new Error('Not authenticated')
      const dbUpdates: Record<string, unknown> = {}
      if (updates.lessonsCompleted !== undefined) dbUpdates.lessons_completed = updates.lessonsCompleted
      if (updates.challengesAttempted !== undefined) dbUpdates.challenges_attempted = updates.challengesAttempted
      if (updates.challengesCompleted !== undefined) dbUpdates.challenges_completed = updates.challengesCompleted
      if (updates.totalPracticeTimeSeconds !== undefined) dbUpdates.total_practice_time_seconds = updates.totalPracticeTimeSeconds
      if (updates.averageChallengeScore !== undefined) dbUpdates.average_challenge_score = updates.averageChallengeScore
      if (updates.bestChallengeScore !== undefined) dbUpdates.best_challenge_score = updates.bestChallengeScore
      if (updates.streakDays !== undefined) dbUpdates.streak_days = updates.streakDays
      if (updates.lastActiveDate !== undefined) dbUpdates.last_active_date = updates.lastActiveDate

      const { error } = await supabase
        .from('user_stats')
        .update(dbUpdates)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const updateStats = useCallback((updates: Partial<UserStats>) => {
    updateMutation.mutate(updates)
  }, [updateMutation])

  const recordChallengeMutation = useMutation({
    mutationFn: async ({ timeSeconds, score }: { timeSeconds: number; score: number }) => {
      if (!userId) throw new Error('Not authenticated')
      const newTotal = userStats.challengesAttempted + 1
      const newAvg = Math.round(
        (userStats.averageChallengeScore * userStats.challengesAttempted + score) / newTotal,
      )
      const { error } = await supabase
        .from('user_stats')
        .update({
          challenges_attempted: newTotal,
          challenges_completed: score >= 50 ? userStats.challengesCompleted + 1 : userStats.challengesCompleted,
          total_practice_time_seconds: userStats.totalPracticeTimeSeconds + timeSeconds,
          average_challenge_score: newAvg,
          best_challenge_score: Math.max(userStats.bestChallengeScore, score),
          last_active_date: today(),
        })
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const recordChallengeCompleted = useCallback((timeSeconds: number, score: number) => {
    recordChallengeMutation.mutate({ timeSeconds, score })
  }, [recordChallengeMutation])

  const recordLessonMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('user_stats')
        .update({
          lessons_completed: userStats.lessonsCompleted + 1,
          last_active_date: today(),
        })
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  const recordLessonCompleted = useCallback(() => {
    recordLessonMutation.mutate()
  }, [recordLessonMutation])

  return { userStats, updateStats, recordChallengeCompleted, recordLessonCompleted, isLoading }
}
