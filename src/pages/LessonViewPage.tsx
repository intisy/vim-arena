import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LESSONS_BY_ID, ALL_LESSONS } from '@/data/lessons/index'
import { useLessonEngine } from '@/hooks/useLessonEngine'
import { useLessonProgress } from '@/hooks/useLessonProgress'
import { LessonStepper } from '@/components/LessonStepper'
import { InstructionPanel } from '@/components/InstructionPanel'
import { VimEditor } from '@/components/VimEditor'
import type { VimEditorRef } from '@/components/VimEditor'
import type { EditorState } from '@/types/editor'

export default function LessonViewPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const lesson = lessonId ? LESSONS_BY_ID.get(lessonId) : undefined
  
  useEffect(() => {
    if (lesson) {
      document.title = `${lesson.title} | vim-arena`
    } else {
      document.title = 'Lesson | vim-arena'
    }
  }, [lesson])

  const editorRef = useRef<VimEditorRef>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // We must handle undefined lesson gracefully, but hooks must be called unconditionally
  // We'll use a dummy lesson if not found, and return early below
  const dummyLesson = ALL_LESSONS[0]
  const engine = useLessonEngine(lesson || dummyLesson)
  const { markLessonComplete } = useLessonProgress()

  // Mark lesson as complete when engine finishes
  useEffect(() => {
    if (engine.isComplete && lesson) {
      markLessonComplete(lesson.id)
    }
  }, [engine.isComplete, lesson, markLessonComplete])

  // Reset editor when step changes
  useEffect(() => {
    if (engine.currentStep) {
      editorRef.current?.reset()
    }
  }, [engine.stepIndex, engine.currentStep])

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-8 text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold mb-4 text-[var(--color-foreground)]">Lesson not found</h1>
        <p className="text-[var(--color-muted)] mb-8">The lesson you're looking for doesn't exist or has been moved.</p>
        <Link 
          to="/lessons" 
          className="px-6 py-2 rounded bg-[var(--color-primary)] text-black font-medium hover:bg-opacity-90 transition-colors"
        >
          Back to Lessons
        </Link>
      </div>
    )
  }

  const handleStateChange = (state: EditorState) => {
    if (showSuccess || engine.isComplete) return

    const isValid = engine.validateAndAdvance(state)
    if (isValid) {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 1000)
    }
  }

  const handleResetStep = () => {
    engine.resetStep()
    editorRef.current?.reset()
  }

  if (engine.isComplete) {
    const currentIndex = ALL_LESSONS.findIndex(l => l.id === lesson.id)
    const nextLesson = currentIndex >= 0 && currentIndex < ALL_LESSONS.length - 1 
      ? ALL_LESSONS[currentIndex + 1] 
      : null

    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-8 text-center">
        <div className="text-6xl mb-6 animate-bounce">🎉</div>
        <h1 className="text-4xl font-bold text-[var(--color-foreground)] mb-4">Lesson Complete!</h1>
        <p className="text-lg text-[var(--color-muted)] mb-12 max-w-md">
          You've successfully completed <span className="font-semibold text-[var(--color-foreground)]">"{lesson.title}"</span>.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md">
          <Link 
            to="/lessons" 
            className="flex-1 px-6 py-3 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-colors font-medium"
          >
            Back to Lessons
          </Link>
          {nextLesson && (
            <Link 
              to={`/lessons/${nextLesson.id}`}
              className="flex-1 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-black font-bold hover:bg-opacity-90 transition-colors shadow-lg shadow-primary/20"
            >
              Next Lesson &rarr;
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)] flex flex-col max-w-7xl">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex-1 w-full sm:mr-8">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/lessons" className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors text-sm font-medium">
              &larr; Lessons
            </Link>
            <span className="text-[var(--color-border)]">/</span>
            <h1 className="text-xl font-bold text-[var(--color-foreground)] truncate">{lesson.title}</h1>
          </div>
          <LessonStepper totalSteps={engine.totalSteps} currentStep={engine.stepIndex} />
        </div>
        <button 
          onClick={handleResetStep}
          className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-[var(--color-muted)] hover:bg-[var(--color-border)] transition-all whitespace-nowrap"
        >
          Reset Step
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <div className="w-full lg:w-[35%] flex flex-col min-h-0 relative">
          <InstructionPanel 
            step={engine.currentStep} 
            hint={engine.hint} 
            attempts={engine.attempts} 
          />
          
          {showSuccess && (
            <div className="absolute inset-0 bg-green-500/10 backdrop-blur-[2px] flex items-center justify-center rounded-lg border border-green-500/30 z-10 transition-all duration-300">
              <div className="bg-green-500 text-white px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-3 transform scale-110 animate-in zoom-in duration-200">
                <span className="text-2xl leading-none">✓</span> 
                <span className="text-lg">Correct!</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="w-full lg:w-[65%] flex flex-col min-h-0 rounded-lg overflow-hidden border border-[var(--color-border)] shadow-sm bg-[var(--color-background)]">
          <VimEditor 
            ref={editorRef}
            initialContent={engine.currentStep.initialContent}
            onStateChange={handleStateChange}
            className="h-full"
            height="100%"
          />
        </div>
      </div>
    </div>
  )
}
