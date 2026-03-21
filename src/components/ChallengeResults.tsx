import { useState, useEffect } from 'react'
import type { ChallengeResult } from '@/types/challenge'

interface ChallengeResultsProps {
  result: ChallengeResult
  onRetry: () => void
  onNext: () => void
  onBack: () => void
  isPersonalBest: boolean
}

export function ChallengeResults({
  result,
  onRetry,
  onNext,
  onBack,
  isPersonalBest,
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

  const getStars = (score: number) => {
    if (score >= 90) return '★★★'
    if (score >= 70) return '★★☆'
    if (score >= 50) return '★☆☆'
    return '☆☆☆'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-white mb-2">
        {result.timedOut ? 'Time\'s Up!' : 'Challenge Complete!'}
      </h2>
      
      {isPersonalBest && !result.timedOut && (
        <div className="bg-yellow-500/20 text-yellow-400 px-4 py-1 rounded-full text-sm font-bold mb-6 animate-bounce">
          Personal Best! 🏆
        </div>
      )}

      <div className="text-6xl font-black text-green-400 mb-2 font-mono">
        {displayScore}
      </div>
      
      <div className="text-3xl text-yellow-400 tracking-widest mb-8">
        {getStars(result.totalScore)}
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

      <div className="flex flex-col w-full gap-3">
        <button
          onClick={onNext}
          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors"
        >
          Next Challenge
        </button>
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
          >
            Retry
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
