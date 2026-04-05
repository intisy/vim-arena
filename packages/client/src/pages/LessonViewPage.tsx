import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { LESSONS_BY_ID, ALL_LESSONS } from '@/data/lessons/index'
import { useLessonEngine } from '@/hooks/useLessonEngine'
import { useLessonProgress } from '@/hooks/useLessonProgress'
import { LessonStepper } from '@/components/LessonStepper'
import { VimEditor } from '@/components/VimEditor'
import { LessonSidebar } from '@/components/LessonSidebar'
import { KeyCardGrid } from '@/components/KeyCardGrid'
import { buildAllowedKeys } from '@/engine/KeyFilter'
import { Search, PartyPopper, Check, Lightbulb, ArrowLeft, ArrowRight } from 'lucide-react'
import type { VimEditorRef } from '@/components/VimEditor'
import type { EditorState } from '@/types/editor'
import { useSettings } from '@/hooks/useSettings'

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

function computeEditorHeight(content: string): string {
  const lineCount = content.split('\n').length
  const lineHeight = 22
  const padding = 16
  const modeBar = 28
  const minHeight = 60
  const maxHeight = 400
  const computed = lineCount * lineHeight + padding + modeBar
  return `${Math.max(minHeight, Math.min(computed, maxHeight))}px`
}

export default function LessonViewPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const lesson = lessonId ? LESSONS_BY_ID.get(lessonId) : undefined
  const { settings } = useSettings()
  
  useEffect(() => {
    if (lesson) {
      document.title = `${lesson.title} | vim-arena`
    } else {
      document.title = 'Lesson | vim-arena'
    }
  }, [lesson])

  const editorRef = useRef<VimEditorRef>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const initialStateRef = useRef<EditorState | null>(null)

  const dummyLesson = ALL_LESSONS[0]
  const engine = useLessonEngine(lesson || dummyLesson)
  const { markLessonComplete } = useLessonProgress()

  const currentIndex = lesson ? ALL_LESSONS.findIndex(l => l.id === lesson.id) : -1
  const prevLesson = currentIndex > 0 ? ALL_LESSONS[currentIndex - 1] : null
  const nextLesson = currentIndex >= 0 && currentIndex < ALL_LESSONS.length - 1 
    ? ALL_LESSONS[currentIndex + 1] 
    : null

  useEffect(() => {
    if (engine.isComplete && lesson) {
      markLessonComplete(lesson.id)
    }
  }, [engine.isComplete, lesson, markLessonComplete])

  useEffect(() => {
    if (!engine.isComplete || !lesson) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'Enter') {
        e.preventDefault()
        if (nextLesson) {
          navigate(`/lessons/${nextLesson.id}`)
        } else {
          navigate('/')
        }
      } else if (e.key === 'b') {
        e.preventDefault()
        navigate('/lessons')
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [engine.isComplete, lesson, nextLesson, navigate])

  useEffect(() => {
    if (engine.currentStep) {
      const step = engine.currentStep
      initialStateRef.current = {
        content: step.initialContent,
        cursorLine: step.initialCursor.line,
        cursorColumn: step.initialCursor.column,
      }
      editorRef.current?.reset()
      editorRef.current?.focus()
    }
  }, [engine.stepIndex, engine.currentStep])

  const allowedKeys = useMemo(() => {
    if (!engine.currentStep?.requiredCommands) return undefined
    return buildAllowedKeys(engine.currentStep.requiredCommands)
  }, [engine.currentStep])

  if (!lesson) {
    return (
      <div className="flex h-screen overflow-hidden bg-[var(--theme-background)]">
        <LessonSidebar />
        <main className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <div className="text-6xl mb-6"><Search size={64} className="text-[var(--theme-muted-foreground)]" /></div>
          <h1 className="text-3xl font-bold mb-4 text-[var(--theme-foreground)]">Lesson not found</h1>
          <p className="text-[var(--theme-muted-foreground)] mb-8">The lesson you're looking for doesn't exist or has been moved.</p>
          <Link 
            to="/lessons" 
            className="px-6 py-2 rounded bg-[var(--theme-primary)] text-black font-medium hover:bg-opacity-90 transition-colors"
          >
            Back to Lessons
          </Link>
        </main>
      </div>
    )
  }

  const handleStateChange = (state: EditorState) => {
    if (showSuccess || engine.isComplete) return

    const init = initialStateRef.current
    if (
      init &&
      state.content === init.content &&
      state.cursorLine === init.cursorLine &&
      state.cursorColumn === init.cursorColumn
    ) {
      return
    }

    const isValid = engine.validateAndAdvance(state)
    if (isValid) {
      editorRef.current?.exitInsertMode()
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 800)
    }
  }

  const handleResetStep = () => {
    if (engine.currentStep) {
      initialStateRef.current = {
        content: engine.currentStep.initialContent,
        cursorLine: engine.currentStep.initialCursor.line,
        cursorColumn: engine.currentStep.initialCursor.column,
      }
    }
    engine.resetStep()
    editorRef.current?.reset()
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  const handleEditorContainerClick = useCallback(() => {
    editorRef.current?.focus()
  }, [])

  const targetCursor = engine.currentStep?.expectedCursor ?? undefined
  const editorHeight = engine.currentStep
    ? computeEditorHeight(engine.currentStep.initialContent)
    : '120px'

  const renderCompletionScreen = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
      <div className="text-6xl mb-6 animate-bounce"><PartyPopper size={64} className="text-[var(--theme-primary)]" /></div>
      <h1 className="text-4xl font-bold text-[var(--theme-foreground)] mb-4">Lesson Complete!</h1>
      <p className="text-lg text-[var(--theme-muted-foreground)] mb-12 max-w-md">
        You've successfully completed <span className="font-semibold text-[var(--theme-foreground)]">"{lesson.title}"</span>.
      </p>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md">
        {nextLesson ? (
          <Link 
            to={`/lessons/${nextLesson.id}`}
            className="relative flex-1 px-6 py-3 rounded-lg bg-[var(--theme-primary)] text-black font-bold hover:bg-opacity-90 transition-colors shadow-lg shadow-primary/20"
          >
            Next Lesson →
            <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">n</kbd>
          </Link>
        ) : (
          <Link 
            to="/" 
            className="relative flex-1 px-6 py-3 rounded-lg bg-[var(--theme-primary)] text-black font-bold hover:bg-opacity-90 transition-colors shadow-lg shadow-primary/20"
          >
            Back to Home
            <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">n</kbd>
          </Link>
        )}
        <button
          onClick={() => navigate('/lessons')}
          className="relative flex-1 px-6 py-3 rounded-lg border border-[var(--theme-border)] text-[var(--theme-muted-foreground)] font-bold hover:bg-[var(--theme-muted)] transition-colors"
        >
          All Lessons
          <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">b</kbd>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--theme-background)]">
      <LessonSidebar />
      
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-3xl mx-auto pb-20">
          {engine.isComplete ? (
            renderCompletionScreen()
          ) : (
            <>
              <h1 className="text-3xl font-bold text-[var(--theme-foreground)] mb-6">{lesson.title}</h1>
              
              {lesson.explanation && (
                <div className="text-lg text-[var(--theme-foreground)] leading-relaxed mb-8">
                  {formatInstruction(lesson.explanation)}
                </div>
              )}

              {lesson.keyCards && lesson.keyCards.length > 0 && (
                <KeyCardGrid keyCards={lesson.keyCards} />
              )}

              {lesson.type !== 'theory' && (
                <>
                  <div className="relative flex py-8 items-center">
                    <div className="flex-grow border-t border-[var(--theme-border)]"></div>
                    <span className="flex-shrink-0 mx-4 text-[var(--theme-muted-foreground)] text-sm font-bold uppercase tracking-widest">Now it's your turn</span>
                    <div className="flex-grow border-t border-[var(--theme-border)]"></div>
                  </div>

                  {lesson.type === 'step-based' && (
                    <div className="mb-8">
                      <LessonStepper totalSteps={engine.totalSteps} currentStep={engine.stepIndex} />
                    </div>
                  )}

                  {lesson.type === 'target-based' && lesson.targetConfig && (
                    <div className="mb-6 flex items-center justify-between bg-[var(--theme-muted)] p-4 rounded-lg border border-[var(--theme-border)]">
                      <div>
                        <span className="text-sm font-bold text-[var(--theme-muted-foreground)] uppercase tracking-wider block mb-1">Target</span>
                        <span className="text-xl font-bold text-[var(--theme-foreground)]">{lesson.targetConfig.targetCount} keystrokes</span>
                      </div>
                      {lesson.targetConfig.allowedKeys && (
                        <div className="text-right">
                          <span className="text-sm font-bold text-[var(--theme-muted-foreground)] uppercase tracking-wider block mb-1">Allowed Keys</span>
                          <div className="flex gap-1">
                            {lesson.targetConfig.allowedKeys.map(k => (
                              <kbd key={k} className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--theme-background)] border border-[var(--theme-border)] text-[var(--theme-foreground)]">{k}</kbd>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {engine.currentStep && (
                    <>
                      <div className="mb-6">
                        <div className="text-lg text-[var(--theme-foreground)] leading-relaxed">
                          {formatInstruction(engine.currentStep.instruction)}
                        </div>
                      </div>

                      {engine.currentStep.requiredCommands && engine.currentStep.requiredCommands.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-xs font-bold text-[var(--theme-muted-foreground)] mb-3 uppercase tracking-wider">Required Commands</h3>
                          <div className="flex flex-wrap gap-2">
                            {engine.currentStep.requiredCommands.map((cmd, i) => (
                              <kbd key={i} className="inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2 bg-[var(--theme-muted)] border-2 border-[var(--theme-border)] rounded-md text-lg font-mono font-bold text-[var(--theme-foreground)] shadow-[0_2px_0_var(--theme-border)]">
                                {cmd}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="relative w-full rounded-lg overflow-hidden border border-[#44475a] shadow-lg mb-6 cursor-text"
                        onClick={handleEditorContainerClick}
                      >
                        <VimEditor 
                          ref={editorRef}
                          initialContent={engine.currentStep.initialContent}
                          initialCursor={engine.currentStep.initialCursor}
                          targetCursor={targetCursor}
                          trapFocus={true}
                          allowedKeys={allowedKeys}
                          onStateChange={handleStateChange}
                          className="h-full"
                          height={editorHeight}
                          fontSize={settings.editorFontSize}
                          showLineNumbers={settings.editorShowLineNumbers}
                        />
                        
                        {showSuccess && (
                          <div className="absolute inset-0 bg-green-500/10 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-300">
                            <div className="bg-green-500 text-white px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-3 transform scale-110 animate-in zoom-in duration-200">
                              <Check size={20} className="text-white" /> 
                              <span className="text-lg">Correct!</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {engine.hint && (
                        <div className="mb-6 flex items-start gap-3 text-amber-500 bg-amber-500/10 p-4 rounded-md border border-amber-500/20">
                          <Lightbulb size={20} className="text-amber-500 flex-shrink-0" />
                          <div className="text-sm">
                            <span className="font-semibold block mb-1 text-amber-600">Hint (Attempt {engine.attempts})</span>
                            <span className="text-amber-700/90">{engine.hint}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center mb-12">
                        <button 
                          onClick={handleResetStep}
                          className="px-6 py-2 text-sm font-medium rounded-md border border-[var(--theme-border)] text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] hover:border-[var(--theme-muted-foreground)] hover:bg-[var(--theme-muted)] transition-all whitespace-nowrap"
                        >
                          Reset Step
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {lesson.additionalNotes && (
                <div className="mt-12 p-6 bg-[var(--theme-muted)] rounded-lg border border-[var(--theme-border)]">
                  <h3 className="text-sm font-bold text-[var(--theme-foreground)] mb-3 uppercase tracking-wider">Additional Notes</h3>
                  <div className="text-sm text-[var(--theme-muted-foreground)] leading-relaxed">
                    {formatInstruction(lesson.additionalNotes)}
                  </div>
                </div>
              )}

              <div className="mt-16 pt-8 border-t border-[var(--theme-border)] flex items-center justify-between">
                {prevLesson ? (
                  <Link 
                    to={`/lessons/${prevLesson.id}`}
                    className="flex flex-col items-start group"
                  >
                    <span className="text-xs font-bold text-[var(--theme-muted-foreground)] uppercase tracking-wider mb-1 group-hover:text-[var(--theme-foreground)] transition-colors">Previous</span>
                    <span className="text-[var(--theme-primary)] font-medium group-hover:underline flex items-center gap-1"><ArrowLeft size={14} /> {prevLesson.title}</span>
                  </Link>
                ) : (
                  <div />
                )}

                {nextLesson ? (
                  <Link 
                    to={`/lessons/${nextLesson.id}`}
                    className="flex flex-col items-end group"
                  >
                    <span className="text-xs font-bold text-[var(--theme-muted-foreground)] uppercase tracking-wider mb-1 group-hover:text-[var(--theme-foreground)] transition-colors">Next</span>
                    <span className="text-[var(--theme-primary)] font-medium group-hover:underline flex items-center gap-1">{nextLesson.title} <ArrowRight size={14} /></span>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
