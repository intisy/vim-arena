import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { LESSON_CATEGORIES } from '@/data/categories'
import { ALL_LESSONS } from '@/data/lessons/index'

export function LessonSidebar() {
  const location = useLocation()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const currentLessonId = location.pathname.split('/').pop()
    const currentLesson = ALL_LESSONS.find(l => l.id === currentLessonId)
    return new Set(currentLesson ? [currentLesson.categoryId] : [LESSON_CATEGORIES[0]?.id])
  })

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col h-screen overflow-y-auto">
      <div className="p-4 border-b border-[var(--theme-border)] sticky top-0 bg-[var(--theme-background)] z-10 flex items-center justify-between">
        <Link to="/lessons" className="font-mono font-bold text-lg text-[var(--theme-foreground)] hover:text-[var(--theme-primary)] transition-colors flex items-center gap-1">
          <ArrowLeft size={16} /> Lessons
        </Link>
      </div>
      
      <div className="p-3 flex flex-col gap-2">
        {LESSON_CATEGORIES.map(category => {
          const isExpanded = expandedCategories.has(category.id)
          const categoryLessons = ALL_LESSONS.filter(l => l.categoryId === category.id)
          
          if (categoryLessons.length === 0) return null

          return (
            <div key={category.id} className="flex flex-col">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center justify-between p-2 w-full text-left hover:bg-[var(--theme-muted)] rounded-md transition-colors group"
              >
                <span className="font-bold text-[var(--theme-primary)] text-sm uppercase tracking-wider">
                  {category.title}
                </span>
                <ChevronDown
                  size={14}
                  className="text-[var(--theme-muted-foreground)] transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              
              {isExpanded && (
                <div className="flex flex-col mt-1 mb-2">
                  {categoryLessons.map(lesson => {
                    const isActive = location.pathname === `/lessons/${lesson.id}`
                    
                    return (
                      <Link
                        key={lesson.id}
                        to={`/lessons/${lesson.id}`}
                        className={`
                          flex flex-col py-2 px-3 ml-2 border-l-2 transition-colors
                          ${isActive 
                            ? 'border-[var(--theme-primary)] bg-[var(--theme-muted)] text-[var(--theme-foreground)]' 
                            : 'border-[var(--theme-border)] text-[var(--theme-muted-foreground)] hover:border-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)]'
                          }
                        `}
                      >
                        <span className="text-sm font-medium mb-1">{lesson.title}</span>
                        {lesson.keyCards && lesson.keyCards.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {lesson.keyCards.map((card, idx) => (
                              <kbd 
                                key={idx} 
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-background)] border border-[var(--theme-border)] text-[var(--theme-foreground)]"
                              >
                                {card.key}
                              </kbd>
                            ))}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
