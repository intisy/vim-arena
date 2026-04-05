import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useEloRating } from '@/hooks/useEloRating'
import { useChallengeStats } from '@/hooks/useChallengeStats'
import { getRatingLabel, getRatingColor } from '@/engine/EloRating'
import { Target, GraduationCap, Star, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/hooks/useSettings'

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
  const { user } = useAuth()
  const { elo, getMatchedDifficulty } = useEloRating()
  const { stats } = useChallengeStats()
  const { settings } = useSettings()
  const [practiceMode, setPracticeMode] = useState(settings.challengeDefaultPractice)

  const matchedDiff = getMatchedDifficulty()
  const ratingLabel = getRatingLabel(elo.rating)
  const ratingColor = getRatingColor(elo.rating)
  const diffInfo = DIFFICULTY_LABELS[matchedDiff]

  const handleStart = useCallback(() => {
    navigate('/challenges/active', { state: { difficulty: matchedDiff, practiceMode } })
  }, [navigate, matchedDiff, practiceMode])

  const handleTogglePractice = useCallback(() => {
    setPracticeMode(prev => !prev)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) return

      if (e.key === 'Enter') { e.preventDefault(); handleStart() }
      else if (e.key === 'p') { e.preventDefault(); handleTogglePractice() }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleStart, handleTogglePractice])

  const winRate = elo.gamesPlayed > 0
    ? Math.round((elo.wins / elo.gamesPlayed) * 100)
    : 0

  const showKbd = settings.challengeShowKeyboardHints

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {!user && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-muted)] flex items-center gap-3">
          <LogIn size={18} className="text-[var(--theme-primary)] shrink-0" />
          <p className="text-sm text-[var(--theme-muted-foreground)] flex-1">
            <Link to="/" className="text-[var(--theme-primary)] font-bold hover:underline">Sign in</Link> to save your progress, track Elo rating, and compete on leaderboards.
          </p>
        </div>
      )}

      <div className="mb-10">
        <h1 className="text-4xl font-black text-[var(--theme-foreground)] mb-3 tracking-tight">Vim Challenges</h1>
        <p className="text-[var(--theme-muted-foreground)] text-lg">
          Test your vim skills against the clock. Difficulty adapts to your skill level.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          {/* Rating card */}
          <div className="stat-card rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-muted)] p-8">
            <div className="text-center mb-6">
              <div className="text-[10px] font-bold text-[var(--theme-muted-foreground)] uppercase tracking-widest mb-3">Your Rating</div>
              <div className="text-6xl font-black mb-2 tracking-tight" style={{ color: ratingColor }}>
                {elo.rating}
              </div>
              <div className="text-lg font-semibold" style={{ color: ratingColor }}>
                {ratingLabel}
              </div>
              {elo.peakRating > elo.rating && (
                <div className="text-xs text-[var(--theme-muted-foreground)] mt-1">Peak: {elo.peakRating}</div>
              )}
            </div>

            <div className="divider-glow mb-4" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-[var(--theme-foreground)]">{elo.gamesPlayed}</div>
                <div className="text-[10px] text-[var(--theme-muted-foreground)] uppercase tracking-wider">Played</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[var(--theme-success)]">{elo.wins}</div>
                <div className="text-[10px] text-[var(--theme-muted-foreground)] uppercase tracking-wider">Wins</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[var(--theme-foreground)]">{winRate}%</div>
                <div className="text-[10px] text-[var(--theme-muted-foreground)] uppercase tracking-wider">Win Rate</div>
              </div>
            </div>
          </div>

          {/* Matched difficulty */}
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-6 glow-border">
            <div className="text-[10px] font-bold text-[var(--theme-muted-foreground)] uppercase tracking-widest mb-3">Matched Difficulty</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-[var(--theme-foreground)]">
                  Level {matchedDiff}: {diffInfo.label}
                </span>
                <p className="text-[var(--theme-muted-foreground)] text-sm mt-1">{diffInfo.desc}</p>
              </div>
              <span className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={i < matchedDiff ? 'text-[var(--theme-warning)] fill-[var(--theme-warning)]' : 'text-[var(--theme-border)]'}
                  />
                ))}
              </span>
            </div>
          </div>

          {/* Practice mode toggle */}
          <button
            onClick={handleTogglePractice}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-xl text-sm font-bold transition-all duration-200 border ${
              practiceMode
                ? 'bg-[var(--theme-warning)]/10 border-[var(--theme-warning)]/30'
                : 'bg-[var(--theme-muted)] border-[var(--theme-border)] hover:border-[var(--theme-muted-foreground)]'
            }`}
          >
            <div className="flex items-center gap-3">
              {practiceMode ? <Target size={18} className="text-[var(--theme-warning)]" /> : <GraduationCap size={18} className="text-[var(--theme-muted-foreground)]" />}
              <div className="text-left">
                <div className={practiceMode ? 'text-[var(--theme-warning)]' : 'text-[var(--theme-foreground)]'}>
                  Practice Mode
                </div>
                <div className={`text-xs font-normal mt-0.5 ${practiceMode ? 'text-[var(--theme-warning)]/70' : 'text-[var(--theme-muted-foreground)]'}`}>
                  {practiceMode ? 'Shows optimal steps. No elo change.' : 'Only correct keys allowed'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {showKbd && (
                <kbd className="text-[10px] bg-[var(--theme-background)] border border-[var(--theme-border)] px-1.5 py-0.5 rounded font-mono text-[var(--theme-muted-foreground)]">p</kbd>
              )}
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                practiceMode ? 'bg-[var(--theme-warning)]' : 'bg-[var(--theme-border)]'
              }`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  practiceMode ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`} />
              </div>
            </div>
          </button>

          {/* Start button */}
          <button
            onClick={handleStart}
            className="w-full py-4 bg-[var(--theme-primary)] hover:opacity-90 text-[var(--theme-background)] text-xl font-black rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            Start Challenge
            {showKbd && (
              <kbd className="text-sm bg-[var(--theme-primary)]/80 px-2 py-0.5 rounded font-mono">Enter</kbd>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-8">
          {/* Recent History */}
          <div>
            <h2 className="section-heading text-xl font-bold text-[var(--theme-foreground)] mb-6">Recent History</h2>
            {elo.history.length === 0 ? (
              <div className="p-8 glass-card rounded-xl text-center">
                <p className="text-[var(--theme-muted-foreground)]">No challenges completed yet.</p>
                <p className="text-[var(--theme-muted-foreground)]/60 text-sm mt-2">Complete a challenge to see your history here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {elo.history.slice(0, 20).map((entry, i) => {
                  const diff = entry.rating - (i < elo.history.length - 1 ? elo.history[i + 1].rating : 1000)
                  const isGain = diff >= 0
                  return (
                    <div key={i} className="p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] flex justify-between items-center glow-border transition-all duration-150">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--theme-muted-foreground)] font-mono w-8">L{entry.difficulty}</span>
                        <span className="text-[var(--theme-foreground)] font-mono">{entry.rating}</span>
                        <span className={`text-sm font-bold ${isGain ? 'text-[var(--theme-success)]' : 'text-[var(--theme-error)]'}`}>
                          {isGain ? '+' : ''}{diff}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--theme-muted-foreground)] text-sm">Score: {entry.score}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Best Scores */}
          {Object.keys(stats).length > 0 && (
            <div>
              <h2 className="section-heading text-xl font-bold text-[var(--theme-foreground)] mb-6">Best Scores</h2>
              <div className="space-y-2">
                {Object.values(stats).map((stat) => (
                  <div key={stat.templateId} className="p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] flex justify-between items-center">
                    <div>
                      <div className="text-[var(--theme-foreground)] font-medium text-sm">{stat.templateId}</div>
                      <div className="text-[var(--theme-muted-foreground)] text-xs">{stat.attempts} attempts</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[var(--theme-success)] font-mono font-bold">{stat.bestScore}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
