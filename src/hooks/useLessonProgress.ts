import { useState, useCallback } from 'react'
import { storageProvider } from '@/storage/LocalStorageProvider'
import { STORAGE_KEYS } from '@/storage/keys'
import type { LessonProgress } from '@/types/stats'

type ProgressMap = Record<string, LessonProgress>

export function useLessonProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => {
    return storageProvider.get<ProgressMap>(STORAGE_KEYS.LESSON_PROGRESS) ?? {}
  })

  const getLessonProgress = useCallback((lessonId: string): LessonProgress | null => {
    return progress[lessonId] ?? null
  }, [progress])

  const markLessonComplete = useCallback((lessonId: string) => {
    setProgress(prev => {
      const existing = prev[lessonId] ?? { lessonId, completed: false, attempts: 0, stepsCompleted: 0 }
      const updated: ProgressMap = {
        ...prev,
        [lessonId]: {
          ...existing,
          completed: true,
          completedAt: Date.now(),
          attempts: existing.attempts + 1,
        },
      }
      storageProvider.set(STORAGE_KEYS.LESSON_PROGRESS, updated)
      return updated
    })
  }, [])

  const incrementAttempt = useCallback((lessonId: string) => {
    setProgress(prev => {
      const existing = prev[lessonId] ?? { lessonId, completed: false, attempts: 0, stepsCompleted: 0 }
      const updated: ProgressMap = {
        ...prev,
        [lessonId]: { ...existing, attempts: existing.attempts + 1 },
      }
      storageProvider.set(STORAGE_KEYS.LESSON_PROGRESS, updated)
      return updated
    })
  }, [])

  const isCompleted = useCallback((lessonId: string): boolean => {
    return progress[lessonId]?.completed ?? false
  }, [progress])

  const completedCount = Object.values(progress).filter(p => p.completed).length

  return { progress, getLessonProgress, markLessonComplete, incrementAttempt, isCompleted, completedCount }
}
