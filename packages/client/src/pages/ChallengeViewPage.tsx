import { useEffect, useRef, useMemo, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useChallengeEngine } from '@/hooks/useChallengeEngine'
import { ChallengeTimer } from '@/components/ChallengeTimer'
import { ChallengeResults } from '@/components/ChallengeResults'
import { VimEditor } from '@/components/VimEditor'
import type { VimEditorRef } from '@/components/VimEditor'
import { useChallengeStats } from '@/hooks/useChallengeStats'
import { buildPracticeKeys } from '@/engine/KeyFilter'
import { Target, GraduationCap, ArrowRight, LogIn, Pause, Play } from 'lucide-react'
import type { TargetRange } from '@/types/editor'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/hooks/useSettings'

const EDITOR_HEIGHTS: Record<string, string> = {
  compact: '300px',
  default: '400px',
  tall: '550px',
}

export default function ChallengeViewPage() {
  useEffect(() => {
    document.title = 'Challenge | vim-arena'
  }, [])

  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useSettings()
  const difficulty = location.state?.difficulty || 1
  const initialPracticeMode = location.state?.practiceMode ?? false
  const editorRef = useRef<VimEditorRef>(null)
  const { getBestScore } = useChallengeStats()

  const editorHeight = EDITOR_HEIGHTS[settings.editorHeight] ?? '400px'

  const {
    challenge,
    phase,
    elapsed,
    keystrokes,
    result,
    countdown,
    practiceMode,
    isRetry,
    togglePracticeMode,
    togglePause,
    startChallenge,
    retry,
    nextChallenge,
    handleEditorStateChange,
    handleKeystroke,
  } = useChallengeEngine(initialPracticeMode, settings.challengeCountdownDuration)

  useEffect(() => {
    startChallenge(difficulty as 1 | 2 | 3 | 4 | 5)
  }, [difficulty, startChallenge])

  useEffect(() => {
    if (phase === 'countdown' && editorRef.current) {
      editorRef.current.exitInsertMode()
      editorRef.current.reset()
    }
    if (phase === 'active' && editorRef.current) {
      editorRef.current.focus()
    }
    if (phase === 'complete') {
      const editor = document.querySelector('.cm-editor') as HTMLElement | null
      if (editor) {
        const focused = editor.querySelector('.cm-content') as HTMLElement | null
        focused?.blur()
        editor.blur()
      }
    }
  }, [phase, challenge])

  const handleBack = useCallback(() => {
    navigate('/challenges')
  }, [navigate])

  const handleTimeoutKeyDown = useCallback((e: KeyboardEvent) => {
    if (phase !== 'complete' || result) return
    if (e.key === 'n') { e.preventDefault(); nextChallenge() }
    else if (e.key === 'r') { e.preventDefault(); retry() }
    else if (e.key === 'b' || e.key === 'Escape') { e.preventDefault(); handleBack() }
    else if (e.key === 'p') { e.preventDefault(); togglePracticeMode() }
  }, [phase, result, nextChallenge, retry, handleBack, togglePracticeMode])

  useEffect(() => {
    if (phase === 'complete' && !result) {
      window.addEventListener('keydown', handleTimeoutKeyDown)
      return () => window.removeEventListener('keydown', handleTimeoutKeyDown)
    }
  }, [phase, result, handleTimeoutKeyDown])

  useEffect(() => {
    if (phase !== 'complete') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p') { e.preventDefault(); togglePracticeMode() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, togglePracticeMode])

  useEffect(() => {
    if (phase !== 'active' && phase !== 'paused') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); togglePause() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, togglePause])

  // Auto-advance on completion
  useEffect(() => {
    if (phase !== 'complete' || !result || !settings.challengeAutoAdvance) return
    const timer = setTimeout(() => {
      nextChallenge()
    }, 3000)
    return () => clearTimeout(timer)
  }, [phase, result, settings.challengeAutoAdvance, nextChallenge])

  const allowedKeys = useMemo(() => {
    if (!practiceMode || !challenge?.optimalSolutions) return undefined
    return buildPracticeKeys(challenge.optimalSolutions)
  }, [practiceMode, challenge])

  if (!challenge) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-gray-400 animate-pulse">Loading challenge...</div>
      </div>
    )
  }

  const isPersonalBest = result ? result.totalScore >= getBestScore(challenge.templateId) && result.totalScore > 0 : false

  const targetRange: TargetRange | undefined = challenge.targetHighlight
    ? {
        fromLine: challenge.targetHighlight.fromLine,
        fromCol: challenge.targetHighlight.fromCol,
        toLine: challenge.targetHighlight.toLine,
        toCol: challenge.targetHighlight.toCol,
      }
    : undefined

  const editorTargetCursor = challenge.targetCursor ?? undefined

  const bestKeystrokeCount = challenge.optimalSolutions?.[0]?.totalKeystrokes ?? Infinity
  const equalSolutions = challenge.optimalSolutions?.filter(s => s.totalKeystrokes === bestKeystrokeCount) ?? []

  const showKbd = settings.challengeShowKeyboardHints

  return (
    <div className="max-w-5xl mx-auto p-6 h-full flex flex-col relative">
      {!user && phase !== 'active' && phase !== 'countdown' && phase !== 'paused' && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-muted)] flex items-center gap-3">
          <LogIn size={18} className="text-[var(--theme-primary)] shrink-0" />
          <p className="text-sm text-[var(--theme-muted-foreground)] flex-1">
            <Link to="/" className="text-[var(--theme-primary)] font-bold hover:underline">Sign in</Link> to save your scores and track your Elo rating.
          </p>
        </div>
      )}

      <div className="flex justify-between items-start mb-4 bg-gray-800/50 p-5 rounded-xl border border-gray-700">
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="px-3 py-1 bg-green-900/50 text-green-400 text-sm font-bold rounded-full border border-green-800 shrink-0">
              Level {challenge.difficulty}
            </span>
            <h2 className="text-xl font-bold text-white truncate">{challenge.description}</h2>
          </div>
          <p className="text-sm text-gray-400">
            {practiceMode
              ? 'Practice mode — only solution keys are allowed. No elo change.'
              : isRetry
                ? 'Retry — same challenge, no elo change.'
                : 'Navigate to the highlighted area and complete the task.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {practiceMode && (phase === 'active' || phase === 'paused') && (
            <button
              onClick={togglePause}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${
                phase === 'paused'
                  ? 'bg-blue-900/50 text-blue-400 border-blue-700'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              {phase === 'paused' ? <Play size={14} /> : <Pause size={14} />}
              {phase === 'paused' ? 'Resume' : 'Pause'}
              {showKbd && <kbd className="text-xs bg-gray-600 px-1 py-0.5 rounded font-mono ml-0.5">Esc</kbd>}
            </button>
          )}
          <button
            onClick={togglePracticeMode}
            disabled={phase === 'active' || phase === 'countdown' || phase === 'paused'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${
              phase === 'active' || phase === 'countdown' || phase === 'paused'
                ? 'bg-gray-800/50 text-gray-600 border-gray-800 cursor-not-allowed'
                : practiceMode
                  ? 'bg-amber-900/50 text-amber-400 border-amber-700'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-500'
            }`}
          >
            {practiceMode ? <Target size={14} /> : <GraduationCap size={14} />}
            {practiceMode ? 'Practice ON' : 'Practice'}
            {showKbd && <kbd className="text-xs bg-gray-600 px-1 py-0.5 rounded font-mono ml-0.5">p</kbd>}
          </button>
          <ChallengeTimer
            timeLimit={challenge.timeLimit}
            elapsed={elapsed}
            isActive={phase === 'active'}
          />
        </div>
      </div>

      <div className="flex-1 relative min-h-[400px]">
        <div className={`transition-opacity duration-300 ${phase === 'complete' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {practiceMode && equalSolutions.length > 0 && phase !== 'countdown' && (
            <div className="mb-3 bg-gray-800/60 border border-amber-800/40 rounded-lg px-4 py-2.5">
              {equalSolutions.map((sol, si) => (
                <div key={si} className={si > 0 ? 'mt-2 pt-2 border-t border-gray-700/50' : ''}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      {equalSolutions.length === 1 ? 'Solution' : `Option ${si + 1}`}
                    </span>
                    <span className="text-xs text-gray-500">{sol.totalKeystrokes} keys</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sol.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-1">
                        {i > 0 && <ArrowRight size={10} className="text-gray-600 shrink-0" />}
                        <span className="inline-flex items-center gap-1 bg-amber-900/30 border border-amber-800/60 rounded px-1.5 py-0.5">
                          <kbd className="font-mono font-bold text-amber-300 text-xs">{step.keys}</kbd>
                          <span className="text-amber-500/80 text-[11px]">{step.description}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <VimEditor
            ref={editorRef}
            initialContent={challenge.initialContent}
            initialCursor={challenge.initialCursor}
            targetCursor={editorTargetCursor}
            targetRange={targetRange}
            allowedKeys={allowedKeys}
            strictFilter={practiceMode}
            language="javascript"
            readOnly={phase !== 'active'}
            trapFocus={phase === 'active'}
            onStateChange={handleEditorStateChange}
            onKeystroke={handleKeystroke}
            height={editorHeight}
            fontSize={settings.editorFontSize}
            showLineNumbers={settings.editorShowLineNumbers}
            className="rounded-xl overflow-hidden shadow-2xl"
          />
          
          <div className="mt-3 flex justify-between text-sm text-gray-500 font-mono px-1">
            <div>Keystrokes: <span className="text-white">{keystrokes}</span> / {challenge.referenceKeystrokeCount}</div>
            <div>Target: {challenge.expectedContent.split('\n').length} lines</div>
          </div>
        </div>

        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-10">
            <div className="text-9xl font-black text-white animate-bounce drop-shadow-[0_0_30px_rgba(0,255,65,0.5)]">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        )}

        {phase === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl z-10">
            <div className="flex flex-col items-center gap-4">
              <Pause size={64} className="text-blue-400" />
              <h2 className="text-4xl font-bold text-white">Paused</h2>
              <p className="text-gray-400">Press <kbd className="bg-gray-700 px-2 py-1 rounded font-mono text-sm text-white">Esc</kbd> to resume</p>
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-xl z-20 p-6">
            {result ? (
              <div className="flex flex-col items-center gap-4">
                <ChallengeResults
                  result={result}
                  onRetry={retry}
                  onNext={nextChallenge}
                  onBack={handleBack}
                  isPersonalBest={isPersonalBest}
                  isPractice={practiceMode}
                  isRetry={isRetry}
                />
                {settings.challengeAutoAdvance && (
                  <p className="text-xs text-gray-500 animate-pulse">Auto-advancing in 3s...</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl max-w-md mx-auto">
                <h2 className="text-3xl font-bold text-white mb-4">Time&apos;s Up!</h2>
                <p className="text-gray-400 mb-8">Challenge ended without completion.</p>
                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={nextChallenge}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Next Challenge
                    {showKbd && <kbd className="text-xs bg-green-700 px-1.5 py-0.5 rounded font-mono">n</kbd>}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={retry}
                      className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Retry
                      {showKbd && <kbd className="text-xs bg-gray-600 px-1.5 py-0.5 rounded font-mono">r</kbd>}
                    </button>
                    <button
                      onClick={handleBack}
                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Back
                      {showKbd && <kbd className="text-xs bg-gray-700 px-1.5 py-0.5 rounded font-mono">b</kbd>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
