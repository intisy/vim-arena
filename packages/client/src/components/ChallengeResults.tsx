import { useState, useEffect, useCallback } from 'react'
import { Trophy, Star } from 'lucide-react'
import type { ChallengeResult, ChallengeSolution } from '@/types/challenge'

interface ChallengeResultsProps {
  result: ChallengeResult
  onRetry: () => void
  onNext: () => void
  onBack: () => void
  isPersonalBest: boolean
  isPractice?: boolean
  isRetry?: boolean
  keyLog?: string[]
  optimalSolutions?: ChallengeSolution[]
}

export function ChallengeResults({
  result,
  onRetry,
  onNext,
  onBack,
  isPersonalBest,
  isPractice = false,
  isRetry = false,
  keyLog,
  optimalSolutions,
}: ChallengeResultsProps) {
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    const duration = 1000
    const steps = 30
    const stepTime = duration / steps
    const increment = result.totalScore / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= result.totalScore) {
        setDisplayScore(result.totalScore)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.floor(current))
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [result.totalScore])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'n') { e.preventDefault(); onNext() }
    else if (e.key === 'r') { e.preventDefault(); onRetry() }
    else if (e.key === 'b' || e.key === 'Escape') { e.preventDefault(); onBack() }
  }, [onNext, onRetry, onBack])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const getStarCount = (score: number) => {
    if (score >= 90) return 3
    if (score >= 70) return 2
    if (score >= 50) return 1
    return 0
  }

  const starCount = getStarCount(result.totalScore)

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-white mb-2">
        {result.timedOut ? 'Time\'s Up!' : 'Challenge Complete!'}
      </h2>

      {isPractice && (
        <div className="bg-amber-500/20 text-amber-400 px-4 py-1 rounded-full text-sm font-bold mb-4">
          Practice Mode — No elo change
        </div>
      )}

      {isRetry && !isPractice && (
        <div className="bg-blue-500/20 text-blue-400 px-4 py-1 rounded-full text-sm font-bold mb-4">
          Retry — No elo change
        </div>
      )}
      
      {isPersonalBest && !result.timedOut && !isPractice && (
        <div className="bg-yellow-500/20 text-yellow-400 px-4 py-1 rounded-full text-sm font-bold mb-6 animate-bounce flex items-center gap-1.5">
          Personal Best! <Trophy size={16} className="fill-yellow-400" />
        </div>
      )}

      <div className="text-6xl font-black text-green-400 mb-2 font-mono">
        {displayScore}
      </div>
      
      <div className="flex gap-1 mb-8">
        {Array.from({ length: 3 }, (_, i) => (
          <Star
            key={i}
            size={28}
            className={i < starCount ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
          />
        ))}
      </div>

      <div className="w-full space-y-4 mb-8">
        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
          <span className="text-gray-400">Time</span>
          <span className="text-white font-mono">{result.timeSeconds.toFixed(1)}s</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
          <span className="text-gray-400">Keystrokes</span>
          <span className="text-white font-mono">
            {result.keystrokeCount} <span className="text-gray-500 text-sm">(ref: {result.referenceKeystrokeCount})</span>
          </span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
          <span className="text-gray-400">Speed Score</span>
          <span className="text-white font-mono">{Math.round(result.speedScore)}</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
          <span className="text-gray-400">Efficiency Score</span>
          <span className="text-white font-mono">{Math.round(result.efficiencyScore)}</span>
        </div>
      </div>


      {keyLog && keyLog.length > 0 && (
        <div className="w-full mb-6">
          <div className="border-b border-gray-800 pb-2 mb-3">
            <span className="text-gray-400 text-sm font-bold uppercase tracking-wider">Your Keystrokes</span>
            <span className="text-gray-500 text-xs ml-2">({keyLog.length})</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-4">
            {keyLog.map((key, i) => (
              <kbd
                key={i}
                className="inline-flex items-center justify-center min-w-[1.5rem] h-7 px-1.5 bg-gray-800 border border-gray-600 rounded text-xs font-mono font-bold text-gray-200 shadow-[0_1px_0_rgba(0,0,0,0.4)]"
              >
                {key === ' ' ? '␣' : key === 'Escape' ? 'Esc' : key === 'Enter' ? '↵' : key === 'Backspace' ? '⌫' : key === 'Tab' ? '⇥' : key}
              </kbd>
            ))}
          </div>
          {optimalSolutions && optimalSolutions.length > 0 && keyLog.length > optimalSolutions[0].totalKeystrokes && (
            <div>
              <div className="border-b border-gray-800 pb-2 mb-3">
                <span className="text-green-400 text-sm font-bold uppercase tracking-wider">Optimal Solution</span>
                <span className="text-gray-500 text-xs ml-2">({optimalSolutions[0].totalKeystrokes} keys)</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {optimalSolutions[0].steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-600 text-xs">→</span>}
                    <span className="inline-flex items-center gap-1 bg-green-900/20 border border-green-800/40 rounded px-1.5 py-0.5">
                      <kbd className="font-mono font-bold text-green-300 text-xs">{step.keys}</kbd>
                      <span className="text-green-500/70 text-[11px]">{step.description}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {optimalSolutions && optimalSolutions.length > 0 && keyLog.length <= optimalSolutions[0].totalKeystrokes && (
            <div className="text-center py-2">
              <span className="text-green-400 text-sm font-bold">✨ Optimal solution!</span>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col w-full gap-3">
        <button
          onClick={onNext}
          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Next Challenge
          <kbd className="text-xs bg-green-700 px-1.5 py-0.5 rounded font-mono">n</kbd>
        </button>
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Retry
            <kbd className="text-xs bg-gray-600 px-1.5 py-0.5 rounded font-mono">r</kbd>
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Back
            <kbd className="text-xs bg-gray-700 px-1.5 py-0.5 rounded font-mono">b</kbd>
          </button>
        </div>
      </div>
    </div>
  )
}
