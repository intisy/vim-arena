import { useUserStats } from '@/hooks/useUserStats'
import { useLessonProgress } from '@/hooks/useLessonProgress'

export function StatsOverview() {
  const { userStats } = useUserStats()
  const { completedCount } = useLessonProgress()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <div className="p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-muted)] flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-bold text-[var(--theme-primary)] mb-1">
          {completedCount}
        </div>
        <div className="text-sm text-[var(--theme-muted-foreground)] uppercase tracking-wider">
          Lessons Done
        </div>
      </div>

      <div className="p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-muted)] flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-bold text-[var(--theme-accent)] mb-1">
          {userStats.challengesAttempted}
        </div>
        <div className="text-sm text-[var(--theme-muted-foreground)] uppercase tracking-wider">
          Challenges
        </div>
      </div>

      <div className="p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-muted)] flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-bold text-[var(--theme-warning)] mb-1">
          {userStats.averageChallengeScore}%
        </div>
        <div className="text-sm text-[var(--theme-muted-foreground)] uppercase tracking-wider">
          Avg Score
        </div>
      </div>

      <div className="p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-muted)] flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-bold text-[var(--theme-success)] mb-1 flex items-center gap-2">
          🔥 {userStats.streakDays}
        </div>
        <div className="text-sm text-[var(--theme-muted-foreground)] uppercase tracking-wider">
          Day Streak
        </div>
      </div>
    </div>
  )
}
