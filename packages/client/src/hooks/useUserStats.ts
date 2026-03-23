import { useState, useCallback } from 'react'
import { storageProvider } from '@/storage/LocalStorageProvider'
import { STORAGE_KEYS } from '@/storage/keys'
import type { UserStats } from '@/types/stats'

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

export function useUserStats() {
  const [userStats, setUserStats] = useState<UserStats>(() => {
    return storageProvider.get<UserStats>(STORAGE_KEYS.USER_STATS) ?? DEFAULT_STATS
  })

  const updateStats = useCallback((updates: Partial<UserStats>) => {
    setUserStats(prev => {
      const updated = { ...prev, ...updates }
      storageProvider.set(STORAGE_KEYS.USER_STATS, updated)
      return updated
    })
  }, [])

  const recordChallengeCompleted = useCallback((timeSeconds: number, score: number) => {
    setUserStats(prev => {
      const newTotal = prev.challengesAttempted + 1
      const newAvg = Math.round(
        (prev.averageChallengeScore * prev.challengesAttempted + score) / newTotal,
      )
      const updated: UserStats = {
        ...prev,
        challengesAttempted: newTotal,
        challengesCompleted: score >= 50 ? prev.challengesCompleted + 1 : prev.challengesCompleted,
        totalPracticeTimeSeconds: prev.totalPracticeTimeSeconds + timeSeconds,
        averageChallengeScore: newAvg,
        bestChallengeScore: Math.max(prev.bestChallengeScore, score),
        lastActiveDate: today(),
      }
      storageProvider.set(STORAGE_KEYS.USER_STATS, updated)
      return updated
    })
  }, [])

  const recordLessonCompleted = useCallback(() => {
    setUserStats(prev => {
      const updated: UserStats = {
        ...prev,
        lessonsCompleted: prev.lessonsCompleted + 1,
        lastActiveDate: today(),
      }
      storageProvider.set(STORAGE_KEYS.USER_STATS, updated)
      return updated
    })
  }, [])

  return { userStats, updateStats, recordChallengeCompleted, recordLessonCompleted }
}
