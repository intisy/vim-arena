import { useState, useCallback } from 'react'
import { storageProvider } from '@/storage/LocalStorageProvider'
import { STORAGE_KEYS } from '@/storage/keys'
import type { ChallengeStats } from '@/types/stats'
import type { ChallengeResult } from '@/types/challenge'

type StatsMap = Record<string, ChallengeStats>

export function useChallengeStats() {
  const [stats, setStats] = useState<StatsMap>(() => {
    return storageProvider.get<StatsMap>(STORAGE_KEYS.CHALLENGE_STATS) ?? {}
  })

  const recordResult = useCallback((result: ChallengeResult) => {
    setStats(prev => {
      const existing: ChallengeStats = prev[result.templateId] ?? {
        templateId: result.templateId,
        attempts: 0,
        bestScore: 0,
        bestTimeSeconds: Infinity,
        averageEfficiency: 0,
        recentResults: [],
      }
      const newResults = [result, ...existing.recentResults].slice(0, 20)
      const avgEfficiency =
        newResults.reduce((sum, r) => sum + r.efficiencyScore, 0) / newResults.length
      const updated: StatsMap = {
        ...prev,
        [result.templateId]: {
          ...existing,
          attempts: existing.attempts + 1,
          bestScore: Math.max(existing.bestScore, result.totalScore),
          bestTimeSeconds: Math.min(
            existing.bestTimeSeconds === Infinity ? result.timeSeconds : existing.bestTimeSeconds,
            result.timeSeconds,
          ),
          averageEfficiency: Math.round(avgEfficiency),
          recentResults: newResults,
        },
      }
      storageProvider.set(STORAGE_KEYS.CHALLENGE_STATS, updated)
      return updated
    })
  }, [])

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

  return { stats, recordResult, getStats, getBestScore }
}
