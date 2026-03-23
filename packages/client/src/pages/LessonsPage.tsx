import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Target, Pencil, Move, Zap, ChevronsUp, Search,
  Braces, Quote, Type, AlignLeft, Trophy, Eye, Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LESSON_CATEGORIES } from '@/data/categories'
import { ALL_LESSONS } from '@/data/lessons/index'
import { useLessonProgress } from '@/hooks/useLessonProgress'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Target, Pencil, Move, Zap, ChevronsUp, Search,
  Braces, Quote, Type, AlignLeft, Trophy, Eye,
}

const CATEGORY_COLORS: Record<string, string> = {
  Target: 'text-red-400',
  Pencil: 'text-amber-400',
  Move: 'text-blue-400',
  Zap: 'text-yellow-400',
  ChevronsUp: 'text-purple-400',
  Search: 'text-cyan-400',
  Braces: 'text-teal-400',
  Quote: 'text-pink-400',
  Type: 'text-indigo-400',
  AlignLeft: 'text-emerald-400',
  Trophy: 'text-orange-400',
  Eye: 'text-violet-400',
}

function CategoryIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = CATEGORY_ICONS[name]
  if (!Icon) return null
  const color = CATEGORY_COLORS[name] ?? 'text-[var(--theme-primary)]'
  return <Icon size={size} className={color} />
}

export default function LessonsPage() {
  useEffect(() => {
    document.title = 'Lessons | vim-arena'
  }, [])

  const { isCompleted } = useLessonProgress()

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[var(--theme-foreground)] mb-2">Lessons</h1>
        <p className="text-lg text-[var(--theme-muted-foreground)]">
          Master Vim from the ground up. {ALL_LESSONS.length} lessons across {LESSON_CATEGORIES.length} categories.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {LESSON_CATEGORIES.map(category => {
          const categoryLessons = ALL_LESSONS.filter(l => l.categoryId === category.id)
          if (categoryLessons.length === 0) return null

          const completedCount = categoryLessons.filter(l => isCompleted(l.id)).length
          const totalCount = categoryLessons.length
          const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

          return (
            <div key={category.id} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] overflow-hidden">
              <div className="p-5 border-b border-[var(--theme-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CategoryIcon name={category.icon} />
                  <div>
                    <h2 className="text-lg font-bold text-[var(--theme-foreground)]">{category.title}</h2>
                    <p className="text-sm text-[var(--theme-muted-foreground)]">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-mono text-[var(--theme-muted-foreground)]">
                    {completedCount}/{totalCount}
                  </span>
                  <div className="w-24 h-2 rounded-full bg-[var(--theme-muted)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
                {categoryLessons.map((lesson, idx) => {
                  const completed = isCompleted(lesson.id)
                  const isLast = idx === categoryLessons.length - 1
                  const isLastRow = idx >= categoryLessons.length - (categoryLessons.length % 3 || 3)

                  return (
                    <Link
                      key={lesson.id}
                      to={`/lessons/${lesson.id}`}
                      className={`
                        flex items-start gap-3 p-4 transition-colors hover:bg-[var(--theme-muted)]
                        ${!isLast ? 'border-b border-[var(--theme-border)]' : ''}
                        ${!isLastRow ? 'lg:border-b' : ''}
                        ${(idx + 1) % 3 !== 0 ? 'lg:border-r border-[var(--theme-border)]' : ''}
                        ${(idx + 1) % 2 !== 0 ? 'sm:border-r border-[var(--theme-border)]' : ''}
                      `}
                    >
                      <div className={`
                        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5
                        ${completed
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-[var(--theme-muted)] text-[var(--theme-muted-foreground)] border border-[var(--theme-border)]'
                        }
                      `}>
                        {completed ? <Check size={14} /> : lesson.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--theme-foreground)] mb-1 truncate">
                          {lesson.title}
                        </div>
                        {lesson.keyCards && lesson.keyCards.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {lesson.keyCards.slice(0, 4).map((card, cardIdx) => (
                              <kbd
                                key={cardIdx}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-muted)] border border-[var(--theme-border)] text-[var(--theme-muted-foreground)]"
                              >
                                {card.key}
                              </kbd>
                            ))}
                            {lesson.keyCards.length > 4 && (
                              <span className="text-[10px] text-[var(--theme-muted-foreground)]">
                                +{lesson.keyCards.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {lesson.type === 'theory' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted-foreground)] bg-[var(--theme-muted)] px-2 py-0.5 rounded-full flex-shrink-0">
                          Theory
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
