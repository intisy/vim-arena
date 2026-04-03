import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { USER_STATS_QUERY_KEY } from '@/hooks/useUserStats'
import type { LessonProgress } from '@/types/stats'

type ProgressMap = Record<string, LessonProgress>

const QUERY_KEY = ['lesson-progress']

async function fetchProgress(userId: string): Promise<ProgressMap> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error

  const map: ProgressMap = {}
  for (const row of data ?? []) {
    map[row.lesson_id] = {
      lessonId: row.lesson_id,
      completed: row.completed,
      completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
      attempts: row.attempts,
      stepsCompleted: row.steps_completed,
    }
  }
  return map
}

export function useLessonProgress() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  const { data: progress = {}, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchProgress(userId!),
    enabled: !!userId,
  })

  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase.rpc('record_lesson_completed', {
        p_lesson_id: lessonId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: USER_STATS_QUERY_KEY })
    },
  })

  const getLessonProgress = useCallback((lessonId: string): LessonProgress | null => {
    return progress[lessonId] ?? null
  }, [progress])

  const markLessonComplete = useCallback((lessonId: string) => {
    markCompleteMutation.mutate(lessonId)
  }, [markCompleteMutation])

  const isCompleted = useCallback((lessonId: string): boolean => {
    return progress[lessonId]?.completed ?? false
  }, [progress])

  const completedCount = Object.values(progress).filter(p => p.completed).length

  return { progress, getLessonProgress, markLessonComplete, isCompleted, completedCount, isLoading }
}
