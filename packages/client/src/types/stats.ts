import type { ChallengeResult } from './challenge'

export interface LessonProgress {
  lessonId: string
  completed: boolean
  completedAt?: number
  attempts: number
  stepsCompleted: number
}

export interface ChallengeStats {
  templateId: string
  attempts: number
  bestScore: number
  bestTimeSeconds: number
  averageEfficiency: number
  recentResults: ChallengeResult[]
}

export interface EloRating {
  rating: number
  gamesPlayed: number
  wins: number
  losses: number
  peakRating: number
  history: Array<{ rating: number; timestamp: number; difficulty: number; score: number }>
}

export interface UserStats {
  lessonsCompleted: number
  totalLessons: number
  challengesAttempted: number
  challengesCompleted: number
  totalPracticeTimeSeconds: number
  averageChallengeScore: number
  bestChallengeScore: number
  streakDays: number
  lastActiveDate: string
  joinedDate: string
}
