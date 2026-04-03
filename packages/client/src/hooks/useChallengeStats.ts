import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ChallengeStats } from '@/types/stats'
import type { ChallengeResult } from '@/types/challenge'

type StatsMap = Record<string, ChallengeStats>

export const CHALLENGE_STATS_QUERY_KEY = ['challenge-stats']

async function fetchStats(userId: string): Promise<StatsMap> {
  const { data: statsRows, error: statsError } = await supabase
    .from('challenge_stats')
    .select('*')
    .eq('user_id', userId)
  if (statsError) throw statsError

  const { data: resultsRows, error: resultsError } = await supabase
    .from('challenge_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (resultsError) throw resultsError

  const map: StatsMap = {}
  for (const row of statsRows ?? []) {
    const recentResults: ChallengeResult[] = (resultsRows ?? [])
      .filter(r => r.template_id === row.template_id)
      .slice(0, 20)
      .map(r => ({
        templateId: r.template_id,
        snippetId: r.snippet_id,
        completedAt: new Date(r.created_at).getTime(),
        timeSeconds: r.time_seconds,
        keystrokeCount: r.keystroke_count,
        referenceKeystrokeCount: r.reference_keystroke_count,
        efficiencyScore: r.efficiency_score,
        speedScore: r.speed_score,
        totalScore: r.total_score,
        timedOut: r.timed_out,
      }))

    map[row.template_id] = {
      templateId: row.template_id,
      attempts: row.attempts,
      bestScore: row.best_score,
      bestTimeSeconds: row.best_time_seconds,
      averageEfficiency: row.average_efficiency,
      recentResults,
    }
  }
  return map
}

export function useChallengeStats() {
  const { user } = useAuth()
  const userId = user?.id

  const { data: stats = {}, isLoading } = useQuery({
    queryKey: CHALLENGE_STATS_QUERY_KEY,
    queryFn: () => fetchStats(userId!),
    enabled: !!userId,
  })

  const getStats = useCallback(
    (templateId: string): ChallengeStats | null => {
      return stats[templateId] ?? null
    },
    [stats],
  )

  const getBestScore = useCallback(
    (templateId: string): number => {
      return stats[templateId]?.bestScore ?? 0
    },
    [stats],
  )

  return { stats, getStats, getBestScore, isLoading }
}
