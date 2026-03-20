import type { ChallengeResult } from './challenge'

export interface LessonProgress {
  lessonId: string
  completed: boolean
  completedAt?: number         // Unix timestamp
  attempts: number             // total attempts across all sessions
  stepsCompleted: number       // highest step index reached (0-based)
}

export interface ChallengeStats {
  templateId: string
  attempts: number
  bestScore: number            // 0-100
  bestTimeSeconds: number
  averageEfficiency: number    // 0-100 average across last 20 attempts
  recentResults: ChallengeResult[]  // last 20 results, newest first
}

export interface UserStats {
  lessonsCompleted: number
  totalLessons: number
  challengesAttempted: number
  challengesCompleted: number  // completed = score ≥ 50
  totalPracticeTimeSeconds: number
  averageChallengeScore: number
  bestChallengeScore: number
  streakDays: number           // consecutive days with at least 1 activity
  lastActiveDate: string       // ISO date string 'YYYY-MM-DD'
  joinedDate: string           // ISO date string
}
