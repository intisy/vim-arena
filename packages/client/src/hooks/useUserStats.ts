import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserStats } from '@/types/stats'

export const USER_STATS_QUERY_KEY = ['user-stats']

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
    if (error.code === 'PGRST116') return DEFAULT_STATS
    throw error
  }

  return {
    lessonsCompleted: data.lessons_completed,
    totalLessons: 0,
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
  const userId = user?.id

  const { data: userStats = DEFAULT_STATS, isLoading } = useQuery({
    queryKey: USER_STATS_QUERY_KEY,
    queryFn: () => fetchUserStats(userId!),
    enabled: !!userId,
  })

  return { userStats, isLoading }
}
