import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ChallengeStats } from '@/types/stats'
import type { ChallengeResult } from '@/types/challenge'

type StatsMap = Record<string, ChallengeStats>

const QUERY_KEY = ['challenge-stats']

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
  const queryClient = useQueryClient()
  const userId = user?.id

  const { data: stats = {}, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchStats(userId!),
    enabled: !!userId,
  })

  const recordMutation = useMutation({
    mutationFn: async (result: ChallengeResult) => {
      if (!userId) return // silently skip when not authenticated

      // Insert challenge result
      const { error: resultError } = await supabase
        .from('challenge_results')
        .insert({
          user_id: userId,
          template_id: result.templateId,
          snippet_id: result.snippetId,
          time_seconds: result.timeSeconds,
          keystroke_count: result.keystrokeCount,
          reference_keystroke_count: result.referenceKeystrokeCount,
          efficiency_score: result.efficiencyScore,
          speed_score: result.speedScore,
          total_score: result.totalScore,
          timed_out: result.timedOut,
        })
      if (resultError) throw resultError

      // Upsert challenge stats
      const existing = stats[result.templateId]
      const newAttempts = (existing?.attempts ?? 0) + 1
      const newBestScore = Math.max(existing?.bestScore ?? 0, result.totalScore)
      const bestTime = existing?.bestTimeSeconds ?? result.timeSeconds
      const newBestTime = Math.min(bestTime, result.timeSeconds)

      // Compute average efficiency from recent results
      const recentEfficiencies = [...(existing?.recentResults ?? []).map(r => r.efficiencyScore), result.efficiencyScore].slice(0, 20)
      const avgEfficiency = Math.round(recentEfficiencies.reduce((s, e) => s + e, 0) / recentEfficiencies.length)

      const { error: statsError } = await supabase
        .from('challenge_stats')
        .upsert({
          user_id: userId,
          template_id: result.templateId,
          attempts: newAttempts,
          best_score: newBestScore,
          best_time_seconds: newBestTime,
          average_efficiency: avgEfficiency,
        }, { onConflict: 'user_id,template_id' })
      if (statsError) throw statsError
    },
    onSuccess: () => {
      if (userId) queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  const recordResult = useCallback((result: ChallengeResult) => {
    recordMutation.mutate(result)
  }, [recordMutation])

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

  return { stats, recordResult, getStats, getBestScore, isLoading }
}
