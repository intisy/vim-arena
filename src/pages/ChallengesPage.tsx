import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChallengeStats } from '@/hooks/useChallengeStats'

const DIFFICULTIES = [
  { level: 1, label: 'Beginner', desc: 'delete/replace single characters' },
  { level: 2, label: 'Easy', desc: 'delete or change a word/line' },
  { level: 3, label: 'Medium', desc: 'find + operator, delete to end' },
  { level: 4, label: 'Hard', desc: 'text object operations' },
  { level: 5, label: 'Expert', desc: 'multi-step combinations' },
]

export default function ChallengesPage() {
  useEffect(() => {
    document.title = 'Challenges | vim-arena'
  }, [])

  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(1)
  const navigate = useNavigate()
  const { stats } = useChallengeStats()

  const handleStart = () => {
    navigate('/challenges/active', { state: { difficulty: selectedDifficulty } })
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-white mb-4">Vim Challenges</h1>
      <p className="text-gray-400 mb-12 text-lg">
        Test your vim skills against the clock. Choose a difficulty level to begin.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6">Select Difficulty</h2>
          <div className="space-y-4">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.level}
                onClick={() => setSelectedDifficulty(diff.level)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedDifficulty === diff.level
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl font-bold text-white">
                    Level {diff.level}: {diff.label}
                  </span>
                  <span className="text-yellow-500">
                    {'★'.repeat(diff.level)}{'☆'.repeat(5 - diff.level)}
                  </span>
                </div>
                <p className="text-gray-400">{diff.desc}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleStart}
            className="w-full mt-8 py-4 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-xl transition-colors shadow-lg shadow-green-900/20"
          >
            Start Challenge
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-white mb-6">Your Stats</h2>
          {Object.keys(stats).length === 0 ? (
            <div className="p-8 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
              <p className="text-gray-400">No challenges completed yet.</p>
              <p className="text-gray-500 text-sm mt-2">Complete a challenge to see your stats here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(stats).map((stat) => (
                <div key={stat.templateId} className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">{stat.templateId}</div>
                    <div className="text-gray-400 text-sm">{stat.attempts} attempts</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-mono font-bold text-xl">{stat.bestScore}</div>
                    <div className="text-gray-500 text-sm">Best Score</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
