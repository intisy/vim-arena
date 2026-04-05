import { Flame } from 'lucide-react'
import { useUserStats } from '@/hooks/useUserStats'
import { useLessonProgress } from '@/hooks/useLessonProgress'

export function StatsOverview() {
  const { userStats } = useUserStats()
  const { completedCount } = useLessonProgress()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full stagger">
      <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-black font-mono text-[var(--theme-primary)] mb-1">
          {completedCount}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">
          Lessons Done
        </div>
      </div>

      <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-black font-mono text-[var(--theme-accent)] mb-1">
          {userStats.challengesAttempted}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">
          Challenges
        </div>
      </div>

      <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-black font-mono text-[var(--theme-warning)] mb-1">
          {userStats.averageChallengeScore}%
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">
          Avg Score
        </div>
      </div>

      <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-black font-mono text-[var(--theme-success)] mb-1 flex items-center gap-2">
          <Flame size={28} className="text-orange-500" /> {userStats.streakDays}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">
          Day Streak
        </div>
      </div>
    </div>
  )
}
