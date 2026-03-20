import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LESSON_CATEGORIES } from '@/data/categories'
import { ALL_LESSONS } from '@/data/lessons/index'
import { useLessonProgress } from '@/hooks/useLessonProgress'

export default function LessonsPage() {
  const { isCompleted } = useLessonProgress()
  
  useEffect(() => {
    document.title = 'Lessons | vim-arena'
  }, [])

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4 text-[var(--color-foreground)]">Vim Lessons</h1>
        <p className="text-lg text-[var(--color-muted)] max-w-2xl">
          Master Vim from the ground up. Choose a category below to start your journey, 
          or pick up where you left off.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {LESSON_CATEGORIES.map(category => {
          const categoryLessons = ALL_LESSONS.filter(l => l.categoryId === category.id)
          const lessonCount = categoryLessons.length
          const completedInCategory = categoryLessons.filter(l => isCompleted(l.id)).length
          const firstLesson = categoryLessons[0]
          
          if (!firstLesson) return null

          return (
            <Link 
              key={category.id} 
              to={`/lessons/${firstLesson.id}`}
              className="flex flex-col p-6 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)] transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-4xl mb-4">{category.icon}</div>
              <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                {category.title}
              </h2>
              <p className="text-[var(--color-muted)] text-sm mb-6 flex-grow leading-relaxed">
                {category.description}
              </p>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--color-border)]">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[var(--color-muted)] bg-[var(--color-border)] px-2.5 py-1 rounded-full w-fit">
                    {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                  </span>
                  <span className="text-[10px] font-medium text-[var(--color-muted)] ml-1">
                    {completedInCategory} / {lessonCount} completed
                  </span>
                </div>
                <span className="text-sm font-medium text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Start <span aria-hidden="true">&rarr;</span>
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
