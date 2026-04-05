import { useEffect } from 'react'
import {
  BarChart3, TrendingUp, Award, BookOpen,
  Target, Pencil, Move, Zap, ChevronsUp, Search,
  Braces, Quote, Type, AlignLeft, Trophy, Eye,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEloRating } from '@/hooks/useEloRating'
import { useUserStats } from '@/hooks/useUserStats'
import { useLessonProgress } from '@/hooks/useLessonProgress'
import { LESSON_CATEGORIES } from '@/data/categories'
import { ALL_LESSONS } from '@/data/lessons/index'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Target, Pencil, Move, Zap, ChevronsUp, Search,
  Braces, Quote, Type, AlignLeft, Trophy, Eye,
}

const CATEGORY_COLORS: Record<string, string> = {
  Target: '#f87171',
  Pencil: '#fbbf24',
  Move: '#60a5fa',
  Zap: '#facc15',
  ChevronsUp: '#a78bfa',
  Search: '#22d3ee',
  Braces: '#2dd4bf',
  Quote: '#f472b6',
  Type: '#818cf8',
  AlignLeft: '#34d399',
  Trophy: '#fb923c',
  Eye: '#8b5cf6',
}

function RatingHistoryChart({ history }: { history: Array<{ rating: number; timestamp: number; difficulty: number; score: number }> }) {
  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--theme-muted-foreground)] font-mono text-sm">
        Complete at least 2 challenges to see your rating graph
      </div>
    )
  }

  const W = 600
  const H = 200
  const PAD_L = 50
  const PAD_R = 20
  const PAD_T = 20
  const PAD_B = 30

  const ratings = history.map(h => h.rating)
  const minR = Math.min(...ratings) - 50
  const maxR = Math.max(...ratings) + 50
  const rangeR = maxR - minR || 1

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const points = history.map((h, i) => {
    const x = PAD_L + (i / (history.length - 1)) * chartW
    const y = PAD_T + chartH - ((h.rating - minR) / rangeR) * chartH
    return { x, y, rating: h.rating, score: h.score, difficulty: h.difficulty }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  const areaPath = linePath + ` L${points[points.length - 1].x},${PAD_T + chartH} L${points[0].x},${PAD_T + chartH} Z`

  const gridLines = 5
  const yLabels = Array.from({ length: gridLines }, (_, i) => {
    const val = minR + (i / (gridLines - 1)) * rangeR
    const y = PAD_T + chartH - (i / (gridLines - 1)) * chartH
    return { val: Math.round(val), y }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {yLabels.map((label, i) => (
        <g key={i}>
          <line
            x1={PAD_L} y1={label.y} x2={W - PAD_R} y2={label.y}
            stroke="var(--theme-border, #333)" strokeWidth="0.5" strokeDasharray="4,4"
          />
          <text
            x={PAD_L - 8} y={label.y + 4}
            textAnchor="end" fontSize="10" fontFamily="monospace"
            fill="var(--theme-muted-foreground, #666)"
          >
            {label.val}
          </text>
        </g>
      ))}

      <defs>
        <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--theme-primary, #00ff41)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--theme-primary, #00ff41)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#ratingGrad)" />

      <path d={linePath} fill="none" stroke="var(--theme-primary, #00ff41)" strokeWidth="2" strokeLinejoin="round" />

      {points.map((p, i) => (
        <circle
          key={i} cx={p.x} cy={p.y} r="3"
          fill="var(--theme-background, #0d1117)"
          stroke="var(--theme-primary, #00ff41)" strokeWidth="1.5"
        >
          <title>Rating: {p.rating} | Score: {p.score}% | Difficulty: {p.difficulty}</title>
        </circle>
      ))}
    </svg>
  )
}

function WinLossRing({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--theme-muted-foreground)] font-mono text-sm">
        No challenge data yet
      </div>
    )
  }

  const winPct = wins / total
  const R = 55
  const STROKE = 12
  const SIZE = 140
  const C = SIZE / 2
  const circumference = 2 * Math.PI * R

  return (
    <div className="flex items-center gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={C} cy={C} r={R}
          fill="none" stroke="var(--theme-border, #333)" strokeWidth={STROKE}
        />
        <circle
          cx={C} cy={C} r={R}
          fill="none" stroke="var(--theme-primary, #00ff41)" strokeWidth={STROKE}
          strokeDasharray={`${circumference * winPct} ${circumference * (1 - winPct)}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text
          x={C} y={C - 6}
          textAnchor="middle" fontSize="22" fontWeight="bold" fontFamily="monospace"
          fill="var(--theme-foreground, #ccc)"
        >
          {Math.round(winPct * 100)}%
        </text>
        <text
          x={C} y={C + 12}
          textAnchor="middle" fontSize="10" fontFamily="monospace"
          fill="var(--theme-muted-foreground, #666)"
        >
          win rate
        </text>
      </svg>

      <div className="flex flex-col gap-2 font-mono text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--theme-primary)]" />
          <span className="text-[var(--theme-foreground)]">Wins: {wins}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--theme-border)]" />
          <span className="text-[var(--theme-foreground)]">Losses: {losses}</span>
        </div>
        <div className="text-[var(--theme-muted-foreground)] text-xs mt-1">
          {total} total games
        </div>
      </div>
    </div>
  )
}

function DifficultyBars({ history }: { history: Array<{ difficulty: number }> }) {
  const counts = [0, 0, 0, 0, 0]
  for (const h of history) {
    if (h.difficulty >= 1 && h.difficulty <= 5) {
      counts[h.difficulty - 1]++
    }
  }

  const max = Math.max(...counts, 1)
  const labels = ['Easy', 'Normal', 'Hard', 'Expert', 'Master']
  const colors = ['#34d399', '#60a5fa', '#fbbf24', '#f97316', '#ef4444']

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--theme-muted-foreground)] font-mono text-sm">
        No challenge data yet
      </div>
    )
  }

  return (
    <div className="flex items-end gap-3 h-36">
      {counts.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-mono font-bold text-[var(--theme-foreground)]">{count}</span>
          <div className="w-full rounded-t-md" style={{
            height: `${Math.max((count / max) * 100, 4)}%`,
            backgroundColor: colors[i],
            transition: 'height 0.3s ease',
            minHeight: '4px',
          }} />
          <span className="text-[10px] font-mono text-[var(--theme-muted-foreground)] whitespace-nowrap">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

function LessonProgressBars({ isCompleted }: { isCompleted: (id: string) => boolean }) {
  const data = LESSON_CATEGORIES.map(cat => {
    const lessons = ALL_LESSONS.filter(l => l.categoryId === cat.id)
    const completed = lessons.filter(l => isCompleted(l.id)).length
    return { category: cat, total: lessons.length, completed }
  }).filter(d => d.total > 0)

  return (
    <div className="flex flex-col gap-3">
      {data.map(d => {
        const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
        const Icon = CATEGORY_ICONS[d.category.icon]
        const color = CATEGORY_COLORS[d.category.icon] ?? 'var(--theme-primary)'

        return (
          <div key={d.category.id} className="flex items-center gap-3">
            <div className="w-5 flex-shrink-0">
              {Icon && <Icon size={14} color={color} />}
            </div>
            <span className="text-xs font-mono text-[var(--theme-muted-foreground)] w-32 truncate flex-shrink-0">
              {d.category.title}
            </span>
            <div className="flex-1 h-2.5 rounded-full bg-[var(--theme-muted)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs font-mono text-[var(--theme-muted-foreground)] w-10 text-right flex-shrink-0">
              {d.completed}/{d.total}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function StatsPage() {
  const { elo } = useEloRating()
  const { userStats } = useUserStats()
  const { isCompleted, completedCount } = useLessonProgress()

  useEffect(() => {
    document.title = 'Stats | vim-arena'
  }, [])

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center">
            <BarChart3 size={22} className="text-[var(--theme-primary)]" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--theme-foreground)]">Stats</h1>
        </div>
        <p className="text-lg text-[var(--theme-muted-foreground)]">
          Track your Vim mastery progress
        </p>
      </div>

      <div className="divider-glow mb-8" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center text-center">
          <div className="text-3xl font-black font-mono text-[var(--theme-primary)] mb-1">{elo.rating}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">Rating</div>
        </div>
        <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center text-center">
          <div className="text-3xl font-black font-mono text-[var(--theme-accent)] mb-1">{elo.peakRating}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">Peak Rating</div>
        </div>
        <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center text-center">
          <div className="text-3xl font-black font-mono text-[var(--theme-warning)] mb-1">{completedCount}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">Lessons Done</div>
        </div>
        <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center text-center">
          <div className="text-3xl font-black font-mono text-[var(--theme-success)] mb-1">{userStats.bestChallengeScore}%</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">Best Score</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card glow-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-[var(--theme-foreground)] mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-[var(--theme-primary)]" />
            </div>
            Rating History
          </h2>
          <RatingHistoryChart history={elo.history} />
        </div>

        <div className="glass-card glow-border-accent rounded-xl p-6">
          <h2 className="text-lg font-bold text-[var(--theme-foreground)] mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-accent)]/10 flex items-center justify-center">
              <Award size={16} className="text-[var(--theme-accent)]" />
            </div>
            Win Rate
          </h2>
          <WinLossRing wins={elo.wins} losses={elo.losses} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card glow-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-[var(--theme-foreground)] mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-400/10 flex items-center justify-center">
              <Target size={16} className="text-red-400" />
            </div>
            Difficulty Distribution
          </h2>
          <DifficultyBars history={elo.history} />
        </div>

        <div className="glass-card glow-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-[var(--theme-foreground)] mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
              <BookOpen size={16} className="text-amber-400" />
            </div>
            Lesson Progress
          </h2>
          <LessonProgressBars isCompleted={isCompleted} />
        </div>
      </div>
    </div>
  )
}
