import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEloRating } from '@/hooks/useEloRating'
import { useChallengeStats } from '@/hooks/useChallengeStats'
import { getRatingLabel, getRatingColor } from '@/engine/EloRating'

const DIFFICULTY_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: 'Beginner', desc: 'delete/replace single characters' },
  2: { label: 'Easy', desc: 'delete or change a word/line' },
  3: { label: 'Medium', desc: 'find + operator, delete to end' },
  4: { label: 'Hard', desc: 'text object operations' },
  5: { label: 'Expert', desc: 'multi-step combinations' },
}

export default function ChallengesPage() {
  useEffect(() => {
    document.title = 'Challenges | vim-arena'
  }, [])

  const navigate = useNavigate()
  const { elo, getMatchedDifficulty, resetElo } = useEloRating()
  const { stats } = useChallengeStats()

  const matchedDiff = getMatchedDifficulty()
  const ratingLabel = getRatingLabel(elo.rating)
  const ratingColor = getRatingColor(elo.rating)
  const diffInfo = DIFFICULTY_LABELS[matchedDiff]

  const handleStart = () => {
    navigate('/challenges/active', { state: { difficulty: matchedDiff } })
  }

  const winRate = elo.gamesPlayed > 0
    ? Math.round((elo.wins / elo.gamesPlayed) * 100)
    : 0

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-white mb-4">Vim Challenges</h1>
      <p className="text-gray-400 mb-12 text-lg">
        Test your vim skills against the clock. Difficulty adapts to your skill level.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="p-8 rounded-2xl border-2 border-gray-700 bg-gray-800/50 mb-8">
            <div className="text-center mb-6">
              <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Your Rating</div>
              <div className="text-6xl font-black mb-2" style={{ color: ratingColor }}>
                {elo.rating}
              </div>
              <div className="text-lg font-semibold" style={{ color: ratingColor }}>
                {ratingLabel}
              </div>
              {elo.peakRating > elo.rating && (
                <div className="text-xs text-gray-500 mt-1">Peak: {elo.peakRating}</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center border-t border-gray-700 pt-4">
              <div>
                <div className="text-xl font-bold text-white">{elo.gamesPlayed}</div>
                <div className="text-xs text-gray-500">Played</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-400">{elo.wins}</div>
                <div className="text-xs text-gray-500">Wins</div>
              </div>
              <div>
                <div className="text-xl font-bold text-white">{winRate}%</div>
                <div className="text-xs text-gray-500">Win Rate</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-gray-700 bg-gray-800/30 mb-6">
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Matched Difficulty</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-white">
                  Level {matchedDiff}: {diffInfo.label}
                </span>
                <p className="text-gray-400 text-sm mt-1">{diffInfo.desc}</p>
              </div>
              <span className="text-yellow-500 text-xl">
                {'★'.repeat(matchedDiff)}{'☆'.repeat(5 - matchedDiff)}
              </span>
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-xl transition-colors shadow-lg shadow-green-900/20"
          >
            Start Challenge
          </button>

          {elo.gamesPlayed > 0 && (
            <button
              onClick={resetElo}
              className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset Rating
            </button>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-white mb-6">Recent History</h2>
          {elo.history.length === 0 ? (
            <div className="p-8 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
              <p className="text-gray-400">No challenges completed yet.</p>
              <p className="text-gray-500 text-sm mt-2">Complete a challenge to see your history here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {elo.history.slice(0, 20).map((entry, i) => {
                const diff = entry.rating - (i < elo.history.length - 1 ? elo.history[i + 1].rating : 1000)
                const isGain = diff >= 0
                return (
                  <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-mono w-8">L{entry.difficulty}</span>
                      <span className="text-white font-mono">{entry.rating}</span>
                      <span className={`text-sm font-bold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                        {isGain ? '+' : ''}{diff}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-sm">Score: {entry.score}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {Object.keys(stats).length > 0 && (
            <>
              <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Best Scores</h2>
              <div className="space-y-2">
                {Object.values(stats).map((stat) => (
                  <div key={stat.templateId} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium text-sm">{stat.templateId}</div>
                      <div className="text-gray-500 text-xs">{stat.attempts} attempts</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-mono font-bold">{stat.bestScore}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
