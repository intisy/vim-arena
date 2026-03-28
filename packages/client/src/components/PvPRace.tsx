import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Timer, User, Trophy, Loader2 } from 'lucide-react'
import { VimEditor } from '@/components/VimEditor'
import type { VimEditorRef } from '@/components/VimEditor'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ChallengeGenerator, SeededRandom } from '@/engine/ChallengeGenerator'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import { ALL_SNIPPETS } from '@/data/snippets'
import type { PvpRaceConfig, RaceProgressMessage, RaceResultMessage } from '@vim-arena/shared'
import type { GeneratedChallenge } from '@/types/challenge'
import type { EditorState } from '@/types/editor'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

type RacePhase = 'loading' | 'countdown' | 'racing' | 'finished'

interface OpponentProgress {
  keystrokeCount: number
  completionPercent: number
}

export function PvPRace() {
  const { matchId } = useParams<{ matchId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()

  const config = (location.state as { config?: PvpRaceConfig } | null)?.config ?? null
  const userId = session?.user?.id

  const [phase, setPhase] = useState<RacePhase>('loading')
  const [countdown, setCountdown] = useState(3)
  const [challenge, setChallenge] = useState<GeneratedChallenge | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [keystrokes, setKeystrokes] = useState(0)
  const [opponentProgress, setOpponentProgress] = useState<OpponentProgress>({ keystrokeCount: 0, completionPercent: 0 })
  const [raceResult, setRaceResult] = useState<RaceResultMessage | null>(null)
  const [completionPercent, setCompletionPercent] = useState(0)

  const editorRef = useRef<VimEditorRef>(null)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const broadcastThrottleRef = useRef<number>(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const completedRef = useRef(false)

  // Determine who I am in the match
  const isPlayer1 = config ? userId === config.player1Id : false
  const myUsername = config
    ? (isPlayer1 ? config.player1Username : config.player2Username)
    : 'You'
  const opponentUsername = config
    ? (isPlayer1 ? config.player2Username : config.player1Username)
    : 'Opponent'
  const myElo = config ? (isPlayer1 ? config.player1Elo : config.player2Elo) : 0
  const opponentElo = config ? (isPlayer1 ? config.player2Elo : config.player1Elo) : 0

  // Generate challenge deterministically from seed
  useEffect(() => {
    if (!config) return

    const rng = new SeededRandom(config.challengeSeed)
    const gen = new ChallengeGenerator(CHALLENGE_TEMPLATES, ALL_SNIPPETS, rng)
    const ch = gen.generate({
      templateId: config.challengeTemplateId,
      difficulty: config.challengeDifficulty,
    })
    setChallenge(ch)
    setPhase('countdown')
  }, [config])

  // Countdown → racing
  useEffect(() => {
    if (phase !== 'countdown') return

    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setPhase('racing')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  // Start timer when racing begins
  useEffect(() => {
    if (phase !== 'racing') return

    startTimeRef.current = Date.now()
    if (editorRef.current) {
      editorRef.current.exitInsertMode()
      editorRef.current.reset()
      editorRef.current.focus()
    }

    timerRef.current = setInterval(() => {
      const now = Date.now()
      const secs = (now - startTimeRef.current) / 1000
      setElapsed(secs)

      // Auto-timeout
      if (config && secs >= config.timeLimit) {
        handleRaceComplete(true)
      }
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Subscribe to Realtime for opponent progress + race results
  useEffect(() => {
    if (!matchId || !userId) return

    const channel = supabase.channel(`race:${matchId}`)

    channel
      .on('broadcast', { event: 'progress' }, (payload) => {
        const msg = payload.payload as RaceProgressMessage
        if (msg.playerId !== userId) {
          setOpponentProgress({
            keystrokeCount: msg.keystrokeCount,
            completionPercent: msg.completionPercent,
          })
        }
      })
      .on('broadcast', { event: 'race_result' }, (payload) => {
        const msg = payload.payload as RaceResultMessage
        setRaceResult(msg)
        setPhase('finished')
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [matchId, userId])

  // Calculate completion percentage based on editor content vs expected
  const calcCompletionPercent = useCallback((currentContent: string): number => {
    if (!challenge) return 0
    const expected = challenge.expectedContent
    if (currentContent === expected) return 100

    // Character-level similarity
    const maxLen = Math.max(currentContent.length, expected.length)
    if (maxLen === 0) return 100

    let matching = 0
    const minLen = Math.min(currentContent.length, expected.length)
    for (let i = 0; i < minLen; i++) {
      if (currentContent[i] === expected[i]) matching++
    }

    return Math.min(99, Math.round((matching / maxLen) * 100))
  }, [challenge])

  // Broadcast progress to opponent (throttled to 5/sec = 200ms)
  const broadcastProgress = useCallback((ks: number, pct: number) => {
    const now = Date.now()
    if (now - broadcastThrottleRef.current < 200) return
    broadcastThrottleRef.current = now

    if (!channelRef.current || !matchId || !userId) return

    const msg: RaceProgressMessage = {
      type: 'progress',
      matchId,
      playerId: userId,
      keystrokeCount: ks,
      completionPercent: pct,
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'progress',
      payload: msg,
    })
  }, [matchId, userId])

  // Handle race completion (success or timeout)
  const handleRaceComplete = useCallback(async (timedOut = false) => {
    if (completedRef.current || !session?.access_token || !matchId) return
    completedRef.current = true

    if (timerRef.current) clearInterval(timerRef.current)

    const timeSeconds = (Date.now() - startTimeRef.current) / 1000

    try {
      const res = await fetch(`${API_BASE}/api/race/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          timeSeconds: timedOut ? null : timeSeconds,
          keystrokeCount: keystrokes,
          completed: !timedOut,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.result) {
          setRaceResult(data.result)
          setPhase('finished')
        }
        // If no result yet, opponent hasn't finished — wait for broadcast
      }
    } catch {
      // If the request fails, we'll still get the result via Realtime
    }
  }, [session?.access_token, matchId, keystrokes])

  // Editor state change handler — check for completion
  const handleEditorStateChange = useCallback((state: EditorState) => {
    if (phase !== 'racing' || !challenge || completedRef.current) return

    const pct = calcCompletionPercent(state.content)
    setCompletionPercent(pct)
    broadcastProgress(keystrokes, pct)

    // Check if challenge is complete
    if (state.content === challenge.expectedContent) {
      handleRaceComplete(false)
    }
  }, [phase, challenge, keystrokes, calcCompletionPercent, broadcastProgress, handleRaceComplete])

  // Keystroke counter
  const handleKeystroke = useCallback(() => {
    setKeystrokes(prev => {
      const next = prev + 1
      broadcastProgress(next, completionPercent)
      return next
    })
  }, [broadcastProgress, completionPercent])

  // Time display
  const timeDisplay = useMemo(() => {
    const mins = Math.floor(elapsed / 60)
    const secs = Math.floor(elapsed % 60)
    const tenths = Math.floor((elapsed * 10) % 10)
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`
  }, [elapsed])

  const timeLimit = config?.timeLimit ?? 60
  const timePercent = Math.min(100, (elapsed / timeLimit) * 100)
  const timeWarning = timePercent > 75

  // No config — redirect back
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[var(--theme-muted-foreground)]">Match not found.</p>
        <button
          onClick={() => navigate('/pvp')}
          className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-background)] font-bold rounded-lg"
        >
          Back to PvP
        </button>
      </div>
    )
  }

  if (phase === 'loading' || !challenge) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-[var(--theme-primary)]" />
      </div>
    )
  }

  // Results screen
  if (phase === 'finished' && raceResult) {
    const myResult = isPlayer1 ? raceResult.player1 : raceResult.player2
    const oppResult = isPlayer1 ? raceResult.player2 : raceResult.player1
    const iWon = raceResult.winnerId === userId
    const isDraw = raceResult.winnerId === null

    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-8 py-12">
        {/* Result Header */}
        <div className="text-center">
          <div className={`text-5xl font-black mb-2 ${iWon ? 'text-[var(--theme-success)]' : isDraw ? 'text-[var(--theme-warning)]' : 'text-[var(--theme-error)]'}`}>
            {iWon ? '🏆 Victory!' : isDraw ? '🤝 Draw' : '💀 Defeat'}
          </div>
          <p className="text-[var(--theme-muted-foreground)]">
            {raceResult.status === 'timeout' ? 'Time ran out' : raceResult.status === 'forfeit' ? 'Opponent disconnected' : 'Race complete'}
          </p>
        </div>

        {/* Player Cards */}
        <div className="w-full grid grid-cols-2 gap-4">
          {/* My result */}
          <div className={`p-6 rounded-xl border ${iWon ? 'border-[var(--theme-success)]' : 'border-[var(--theme-border)]'} bg-[var(--theme-background)]`}>
            <div className="flex items-center gap-2 mb-4">
              {iWon && <Trophy size={18} className="text-[var(--theme-success)]" />}
              <span className="font-bold text-[var(--theme-foreground)]">{myResult.username}</span>
              <span className="text-xs text-[var(--theme-muted-foreground)]">(You)</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--theme-muted-foreground)]">Completed</span>
                <span className={myResult.completed ? 'text-[var(--theme-success)]' : 'text-[var(--theme-error)]'}>
                  {myResult.completed ? '✓' : '✗'}
                </span>
              </div>
              {myResult.timeSeconds !== null && (
                <div className="flex justify-between">
                  <span className="text-[var(--theme-muted-foreground)]">Time</span>
                  <span className="font-mono text-[var(--theme-foreground)]">{myResult.timeSeconds.toFixed(1)}s</span>
                </div>
              )}
              {myResult.keystrokeCount !== null && (
                <div className="flex justify-between">
                  <span className="text-[var(--theme-muted-foreground)]">Keystrokes</span>
                  <span className="font-mono text-[var(--theme-foreground)]">{myResult.keystrokeCount}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[var(--theme-border)]">
                <span className="text-[var(--theme-muted-foreground)]">Elo</span>
                <span className="font-bold">
                  <span className="text-[var(--theme-muted-foreground)]">{myResult.eloBefore}</span>
                  {' → '}
                  <span className={myResult.eloAfter > myResult.eloBefore ? 'text-[var(--theme-success)]' : myResult.eloAfter < myResult.eloBefore ? 'text-[var(--theme-error)]' : 'text-[var(--theme-foreground)]'}>
                    {myResult.eloAfter}
                  </span>
                  <span className={`ml-1 text-xs ${myResult.eloAfter - myResult.eloBefore >= 0 ? 'text-[var(--theme-success)]' : 'text-[var(--theme-error)]'}`}>
                    ({myResult.eloAfter - myResult.eloBefore >= 0 ? '+' : ''}{myResult.eloAfter - myResult.eloBefore})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Opponent result */}
          <div className={`p-6 rounded-xl border ${!iWon && !isDraw ? 'border-[var(--theme-success)]' : 'border-[var(--theme-border)]'} bg-[var(--theme-background)]`}>
            <div className="flex items-center gap-2 mb-4">
              {!iWon && !isDraw && <Trophy size={18} className="text-[var(--theme-success)]" />}
              <span className="font-bold text-[var(--theme-foreground)]">{oppResult.username}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--theme-muted-foreground)]">Completed</span>
                <span className={oppResult.completed ? 'text-[var(--theme-success)]' : 'text-[var(--theme-error)]'}>
                  {oppResult.completed ? '✓' : '✗'}
                </span>
              </div>
              {oppResult.timeSeconds !== null && (
                <div className="flex justify-between">
                  <span className="text-[var(--theme-muted-foreground)]">Time</span>
                  <span className="font-mono text-[var(--theme-foreground)]">{oppResult.timeSeconds.toFixed(1)}s</span>
                </div>
              )}
              {oppResult.keystrokeCount !== null && (
                <div className="flex justify-between">
                  <span className="text-[var(--theme-muted-foreground)]">Keystrokes</span>
                  <span className="font-mono text-[var(--theme-foreground)]">{oppResult.keystrokeCount}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[var(--theme-border)]">
                <span className="text-[var(--theme-muted-foreground)]">Elo</span>
                <span className="font-bold">
                  <span className="text-[var(--theme-muted-foreground)]">{oppResult.eloBefore}</span>
                  {' → '}
                  <span className={oppResult.eloAfter > oppResult.eloBefore ? 'text-[var(--theme-success)]' : oppResult.eloAfter < oppResult.eloBefore ? 'text-[var(--theme-error)]' : 'text-[var(--theme-foreground)]'}>
                    {oppResult.eloAfter}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/pvp')}
            className="px-6 py-3 bg-[var(--theme-warning)] text-[var(--theme-background)] font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-[var(--theme-border)] text-[var(--theme-muted-foreground)] font-medium rounded-lg hover:border-[var(--theme-foreground)] transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    )
  }

  // Racing / Countdown view
  return (
    <div className="max-w-5xl mx-auto p-6 h-full flex flex-col relative">
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-4 bg-[var(--theme-muted)] p-4 rounded-xl border border-[var(--theme-border)]">
        {/* My Info */}
        <div className="flex items-center gap-3">
          <User size={18} className="text-[var(--theme-primary)]" />
          <span className="font-bold text-[var(--theme-foreground)]">{myUsername}</span>
          <span className="text-xs text-[var(--theme-muted-foreground)] font-mono">{myElo}</span>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeWarning ? 'text-[var(--theme-error)]' : 'text-[var(--theme-foreground)]'}`}>
          <Timer size={18} />
          {timeDisplay}
        </div>

        {/* Opponent Info */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--theme-muted-foreground)] font-mono">{opponentElo}</span>
          <span className="font-bold text-[var(--theme-foreground)]">{opponentUsername}</span>
          <User size={18} className="text-[var(--theme-error)]" />
        </div>
      </div>

      {/* Progress Bars */}
      <div className="flex gap-4 mb-4">
        {/* My progress */}
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--theme-primary)] font-bold">You</span>
            <span className="text-[var(--theme-muted-foreground)] font-mono">{completionPercent}%</span>
          </div>
          <div className="h-2 bg-[var(--theme-muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--theme-primary)] rounded-full transition-all duration-200"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Opponent progress */}
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--theme-error)] font-bold">{opponentUsername}</span>
            <span className="text-[var(--theme-muted-foreground)] font-mono">{opponentProgress.completionPercent}%</span>
          </div>
          <div className="h-2 bg-[var(--theme-muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--theme-error)] rounded-full transition-all duration-200"
              style={{ width: `${opponentProgress.completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Time Bar */}
      <div className="h-1 bg-[var(--theme-muted)] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-100 ${timeWarning ? 'bg-[var(--theme-error)]' : 'bg-[var(--theme-accent)]'}`}
          style={{ width: `${100 - timePercent}%` }}
        />
      </div>

      {/* Challenge Info */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs font-bold rounded-full border border-green-800 mr-2">
            Level {challenge.difficulty}
          </span>
          <span className="text-[var(--theme-foreground)] font-bold">{challenge.description}</span>
        </div>
        <div className="text-sm text-[var(--theme-muted-foreground)] font-mono">
          Keystrokes: <span className="text-[var(--theme-foreground)]">{keystrokes}</span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative min-h-[400px]">
        <VimEditor
          ref={editorRef}
          initialContent={challenge.initialContent}
          initialCursor={challenge.initialCursor}
          targetRange={challenge.targetHighlight ? {
            fromLine: challenge.targetHighlight.fromLine,
            fromCol: challenge.targetHighlight.fromCol,
            toLine: challenge.targetHighlight.toLine,
            toCol: challenge.targetHighlight.toCol,
          } : undefined}
          language="javascript"
          readOnly={phase !== 'racing'}
          trapFocus={phase === 'racing'}
          onStateChange={handleEditorStateChange}
          onKeystroke={handleKeystroke}
          height="500px"
          className="rounded-xl overflow-hidden shadow-2xl"
        />

        {/* Countdown Overlay */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-10">
            <div className="text-center">
              <div className="text-sm text-[var(--theme-muted-foreground)] mb-4 uppercase tracking-widest font-bold">
                {myUsername} vs {opponentUsername}
              </div>
              <div className="text-9xl font-black text-white animate-bounce drop-shadow-[0_0_30px_rgba(0,255,65,0.5)]">
                {countdown > 0 ? countdown : 'GO!'}
              </div>
            </div>
          </div>
        )}

        {/* Waiting for opponent finish */}
        {phase === 'finished' && !raceResult && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-10">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={32} className="animate-spin text-[var(--theme-primary)]" />
              <p className="text-[var(--theme-foreground)] font-bold">Waiting for results...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PvPRace
