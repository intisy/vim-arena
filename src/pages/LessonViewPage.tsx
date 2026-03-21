import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LESSONS_BY_ID, ALL_LESSONS } from '@/data/lessons/index'
import { useLessonEngine } from '@/hooks/useLessonEngine'
import { useLessonProgress } from '@/hooks/useLessonProgress'
import { LessonStepper } from '@/components/LessonStepper'
import { VimEditor } from '@/components/VimEditor'
import type { VimEditorRef } from '@/components/VimEditor'
import type { EditorState } from '@/types/editor'

function formatInstruction(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-[var(--theme-foreground)]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-[var(--theme-muted)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--theme-foreground)]">{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}

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
  const hasInteractedRef = useRef(false)

  const dummyLesson = ALL_LESSONS[0]
  const engine = useLessonEngine(lesson || dummyLesson)
  const { markLessonComplete } = useLessonProgress()

  useEffect(() => {
    if (engine.isComplete && lesson) {
      markLessonComplete(lesson.id)
    }
  }, [engine.isComplete, lesson, markLessonComplete])

  useEffect(() => {
    if (engine.currentStep) {
      hasInteractedRef.current = false
      editorRef.current?.reset()
      editorRef.current?.focus()
    }
  }, [engine.stepIndex, engine.currentStep])

  const handleKeystroke = useCallback(() => {
    hasInteractedRef.current = true
  }, [])

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-8 text-center">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold mb-4 text-[var(--theme-foreground)]">Lesson not found</h1>
        <p className="text-[var(--theme-muted-foreground)] mb-8">The lesson you're looking for doesn't exist or has been moved.</p>
        <Link 
          to="/lessons" 
          className="px-6 py-2 rounded bg-[var(--theme-primary)] text-black font-medium hover:bg-opacity-90 transition-colors"
        >
          Back to Lessons
        </Link>
      </div>
    )
  }

  const handleStateChange = (state: EditorState) => {
    if (!hasInteractedRef.current) return
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
    hasInteractedRef.current = false
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
        <h1 className="text-4xl font-bold text-[var(--theme-foreground)] mb-4">Lesson Complete!</h1>
        <p className="text-lg text-[var(--theme-muted-foreground)] mb-12 max-w-md">
          You've successfully completed <span className="font-semibold text-[var(--theme-foreground)]">"{lesson.title}"</span>.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md">
          <Link 
            to="/lessons" 
            className="flex-1 px-6 py-3 rounded-lg border border-[var(--theme-border)] text-[var(--theme-foreground)] hover:bg-[var(--theme-muted)] transition-colors font-medium"
          >
            Back to Lessons
          </Link>
          {nextLesson && (
            <Link 
              to={`/lessons/${nextLesson.id}`}
              className="flex-1 px-6 py-3 rounded-lg bg-[var(--theme-primary)] text-black font-bold hover:bg-opacity-90 transition-colors shadow-lg shadow-primary/20"
            >
              Next Lesson &rarr;
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/lessons" className="text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] transition-colors text-sm font-medium">
          &larr; Lessons
        </Link>
        <span className="text-[var(--theme-border)]">/</span>
        <h1 className="text-xl font-bold text-[var(--theme-foreground)] truncate">{lesson.title}</h1>
      </div>

      <div className="mb-8">
        <LessonStepper totalSteps={engine.totalSteps} currentStep={engine.stepIndex} />
      </div>

      <div className="mb-8">
        <div className="text-lg text-[var(--theme-foreground)] leading-relaxed">
          {formatInstruction(engine.currentStep.instruction)}
        </div>
      </div>

      {engine.currentStep.requiredCommands.length > 0 && (
        <div className="mb-10">
          <h3 className="text-sm font-bold text-[var(--theme-muted-foreground)] mb-4 uppercase tracking-wider">Required Commands</h3>
          <div className="flex flex-wrap gap-3">
            {engine.currentStep.requiredCommands.map((cmd, i) => (
              <kbd key={i} className="inline-flex items-center justify-center w-14 h-14 bg-[var(--theme-muted)] border-2 border-[var(--theme-border)] rounded-lg text-xl font-mono font-bold text-[var(--theme-foreground)] shadow-[0_2px_0_var(--theme-border)]">
                {cmd}
              </kbd>
            ))}
          </div>
        </div>
      )}

      <div className="relative flex py-5 items-center mb-6">
        <div className="flex-grow border-t border-[var(--theme-border)]"></div>
        <span className="flex-shrink-0 mx-4 text-[var(--theme-muted-foreground)] text-sm font-medium">Now it's your turn!</span>
        <div className="flex-grow border-t border-[var(--theme-border)]"></div>
      </div>

      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-[var(--theme-border)] shadow-sm bg-[var(--theme-background)] mb-6">
        <VimEditor 
          ref={editorRef}
          initialContent={engine.currentStep.initialContent}
          initialCursor={engine.currentStep.initialCursor}
          onStateChange={handleStateChange}
          onKeystroke={handleKeystroke}
          className="h-full"
          height="100%"
        />
        
        {showSuccess && (
          <div className="absolute inset-0 bg-green-500/10 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-300">
            <div className="bg-green-500 text-white px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-3 transform scale-110 animate-in zoom-in duration-200">
              <span className="text-2xl leading-none">✓</span> 
              <span className="text-lg">Correct!</span>
            </div>
          </div>
        )}
      </div>

      {engine.hint && (
        <div className="mb-6 flex items-start gap-3 text-amber-500 bg-amber-500/10 p-4 rounded-md border border-amber-500/20">
          <span className="text-xl leading-none">💡</span>
          <div className="text-sm">
            <span className="font-semibold block mb-1 text-amber-600">Hint (Attempt {engine.attempts})</span>
            <span className="text-amber-700/90">{engine.hint}</span>
          </div>
        </div>
      )}

      <div className="mt-auto pt-4 pb-8 flex justify-center">
        <button 
          onClick={handleResetStep}
          className="px-6 py-2 text-sm font-medium rounded-md border border-[var(--theme-border)] text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] hover:border-[var(--theme-muted-foreground)] hover:bg-[var(--theme-muted)] transition-all whitespace-nowrap"
        >
          Reset Step
        </button>
      </div>
    </div>
  )
}
