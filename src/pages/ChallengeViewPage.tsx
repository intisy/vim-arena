import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useChallengeEngine } from '@/hooks/useChallengeEngine'
import { ChallengeTimer } from '@/components/ChallengeTimer'
import { ChallengeResults } from '@/components/ChallengeResults'
import { VimEditor } from '@/components/VimEditor'
import type { VimEditorRef } from '@/components/VimEditor'
import { useChallengeStats } from '@/hooks/useChallengeStats'

export default function ChallengeViewPage() {
  useEffect(() => {
    document.title = 'Challenge | vim-arena'
  }, [])

  const location = useLocation()
  const navigate = useNavigate()
  const difficulty = location.state?.difficulty || 1
  const editorRef = useRef<VimEditorRef>(null)
  const { getBestScore } = useChallengeStats()

  const {
    challenge,
    phase,
    elapsed,
    keystrokes,
    result,
    countdown,
    startChallenge,
    retry,
    nextChallenge,
    handleEditorStateChange,
    handleKeystroke,
  } = useChallengeEngine()

  useEffect(() => {
    startChallenge(difficulty as 1 | 2 | 3 | 4 | 5)
  }, [difficulty, startChallenge])

  useEffect(() => {
    if (phase === 'countdown' && editorRef.current) {
      editorRef.current.reset()
    }
    if (phase === 'active' && editorRef.current) {
      editorRef.current.focus()
    }
  }, [phase, challenge])

  const handleBack = () => {
    navigate('/challenges')
  }

  if (!challenge) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-gray-400 animate-pulse">Loading challenge...</div>
      </div>
    )
  }

  const isPersonalBest = result ? result.totalScore >= getBestScore(challenge.templateId) && result.totalScore > 0 : false

  return (
    <div className="max-w-5xl mx-auto p-6 h-full flex flex-col relative">
      {/* Top Bar */}
      <div className="flex justify-between items-start mb-6 bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <div className="flex-1 pr-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-green-900/50 text-green-400 text-sm font-bold rounded-full border border-green-800">
              Level {challenge.difficulty}
            </span>
            <h2 className="text-2xl font-bold text-white">{challenge.description}</h2>
          </div>
          <p className="text-gray-400">
            Complete the task using the fewest keystrokes possible.
          </p>
        </div>
        <ChallengeTimer
          timeLimit={challenge.timeLimit}
          elapsed={elapsed}
          isActive={phase === 'active'}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative min-h-[400px]">
        {/* Editor */}
        <div className={`transition-opacity duration-300 ${phase === 'complete' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <VimEditor
            ref={editorRef}
            initialContent={challenge.initialContent}
            language="javascript"
            readOnly={phase !== 'active'}
            onStateChange={handleEditorStateChange}
            onKeystroke={handleKeystroke}
            height="500px"
            className="rounded-xl overflow-hidden shadow-2xl"
          />
          
          {/* Live Stats Footer */}
          <div className="mt-4 flex justify-between text-sm text-gray-500 font-mono px-2">
            <div>Keystrokes: <span className="text-white">{keystrokes}</span> / {challenge.referenceKeystrokeCount}</div>
            <div>Target: {challenge.expectedContent.split('\n').length} lines</div>
          </div>
        </div>

        {/* Overlays */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-10">
            <div className="text-9xl font-black text-white animate-bounce drop-shadow-[0_0_30px_rgba(0,255,65,0.5)]">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        )}

        {phase === 'complete' && result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-xl z-20 p-6">
            <ChallengeResults
              result={result}
              onRetry={retry}
              onNext={nextChallenge}
              onBack={handleBack}
              isPersonalBest={isPersonalBest}
            />
          </div>
        )}
      </div>
    </div>
  )
}
