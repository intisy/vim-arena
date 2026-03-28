import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Loader2, Trophy, User, Timer, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ChallengeGenerator, SeededRandom } from '@/engine/ChallengeGenerator'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import { ALL_SNIPPETS } from '@/data/snippets'
import type { MatchReplayData, ReplaySnapshot } from '@vim-arena/shared'

type LoadState = 'loading' | 'loaded' | 'error'

/** Interpolate content at a given time from snapshots */
function getSnapshotAtTime(snapshots: ReplaySnapshot[], time: number, initialContent: string): { content: string; line: number; col: number } {
  if (snapshots.length === 0) return { content: initialContent, line: 0, col: 0 }
  if (time <= 0) return { content: initialContent, line: 0, col: 0 }

  // Find last snapshot <= time
  let best = { content: initialContent, line: 0, col: 0 }
  for (const snap of snapshots) {
    if (snap.t <= time) {
      best = { content: snap.c, line: snap.l, col: snap.col }
    } else {
      break
    }
  }
  return best
}

export function PvPReplay() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [replay, setReplay] = useState<MatchReplayData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Playback state
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const animFrameRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)

  // Load replay data
  useEffect(() => {
    if (!matchId || !session?.user?.id) return

    async function load() {
      setLoadState('loading')
      try {
        const { data, error } = await supabase.rpc('get_match_replay', { p_match_id: matchId! })
        if (error) throw new Error(error.message)

        const result = data as { status: string; match?: MatchReplayData; error?: string } | null
        if (!result || result.status === 'error') {
          throw new Error(result?.error ?? 'Failed to load replay')
        }
        if (!result.match) throw new Error('No replay data')

        // Parse replay JSONB (may be string or already parsed)
        const match = result.match
        if (typeof match.player1.replay === 'string') {
          match.player1.replay = JSON.parse(match.player1.replay as unknown as string) as ReplaySnapshot[]
        }
        if (typeof match.player2.replay === 'string') {
          match.player2.replay = JSON.parse(match.player2.replay as unknown as string) as ReplaySnapshot[]
        }

        setReplay(match)
        setLoadState('loaded')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load')
        setLoadState('error')
      }
    }

    void load()
  }, [matchId, session?.user?.id])

  // Generate challenge from seed
  const challenge = useMemo(() => {
    if (!replay) return null
    const rng = new SeededRandom(replay.challengeSeed)
    const gen = new ChallengeGenerator(CHALLENGE_TEMPLATES, ALL_SNIPPETS, rng)
    return gen.generate({
      templateId: replay.challengeTemplateId,
      difficulty: replay.challengeDifficulty,
    })
  }, [replay])

  // Total duration = max of both players' last snapshot time, or time limit
  const totalDuration = useMemo(() => {
    if (!replay) return 60
    const p1Max = replay.player1.replay?.length ? replay.player1.replay[replay.player1.replay.length - 1].t : 0
    const p2Max = replay.player2.replay?.length ? replay.player2.replay[replay.player2.replay.length - 1].t : 0
    return Math.max(p1Max, p2Max, 1)
  }, [replay])

  // Animation loop
  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      return
    }

    lastTickRef.current = performance.now()

    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000
      lastTickRef.current = now

      setCurrentTime(prev => {
        const next = prev + dt * speed
        if (next >= totalDuration) {
          setPlaying(false)
          return totalDuration
        }
        return next
      })

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [playing, speed, totalDuration])

  // Get current content for both players
  const p1State = useMemo(() => {
    if (!replay?.player1.replay || !challenge) return { content: challenge?.initialContent ?? '', line: 0, col: 0 }
    return getSnapshotAtTime(replay.player1.replay, currentTime, challenge.initialContent)
  }, [replay, challenge, currentTime])

  const p2State = useMemo(() => {
    if (!replay?.player2.replay || !challenge) return { content: challenge?.initialContent ?? '', line: 0, col: 0 }
    return getSnapshotAtTime(replay.player2.replay, currentTime, challenge.initialContent)
  }, [replay, challenge, currentTime])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value))
  }, [])

  const handleRestart = useCallback(() => {
    setCurrentTime(0)
    setPlaying(true)
  }, [])

  const handleSkipEnd = useCallback(() => {
    setCurrentTime(totalDuration)
    setPlaying(false)
  }, [totalDuration])

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    const tenths = Math.floor((t * 10) % 10)
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`
  }

  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-[var(--theme-primary)]" />
      </div>
    )
  }

  if (loadState === 'error' || !replay || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[var(--theme-error)] font-medium">{errorMsg || 'Replay not available'}</p>
        <button
          onClick={() => navigate('/pvp')}
          className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-background)] font-bold rounded-lg"
        >
          Back to PvP
        </button>
      </div>
    )
  }

  const userId = session?.user?.id
  const p1IsMe = replay.player1.id === userId
  const iWon = replay.winnerId === userId
  const isDraw = replay.winnerId === null

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/pvp')}
          className="flex items-center gap-2 text-sm text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to PvP
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-black ${iWon ? 'text-[var(--theme-success)]' : isDraw ? 'text-[var(--theme-warning)]' : 'text-[var(--theme-error)]'}`}>
            {iWon ? '🏆 Victory' : isDraw ? '🤝 Draw' : '💀 Defeat'}
          </span>
          <span className="text-xs text-[var(--theme-muted-foreground)]">
            {replay.status === 'forfeit' ? 'Forfeit' : replay.status === 'timeout' ? 'Timeout' : 'Completed'}
          </span>
        </div>
      </div>

      {/* Player Headers */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${replay.winnerId === replay.player1.id ? 'border-[var(--theme-success)]' : 'border-[var(--theme-border)]'} bg-[var(--theme-muted)]`}>
          <div className="flex items-center gap-2">
            {replay.winnerId === replay.player1.id && <Trophy size={16} className="text-[var(--theme-success)]" />}
            <User size={16} className="text-[var(--theme-primary)]" />
            <span className="font-bold text-[var(--theme-foreground)]">{replay.player1.username}</span>
            {p1IsMe && <span className="text-xs text-[var(--theme-muted-foreground)]">(You)</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--theme-muted-foreground)]">
            {replay.player1.timeSeconds !== null && (
              <span className="font-mono">{replay.player1.timeSeconds.toFixed(1)}s</span>
            )}
            <span className="font-mono">{replay.player1.eloBefore} → {replay.player1.eloAfter ?? '?'}</span>
          </div>
        </div>

        {/* Player 2 */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${replay.winnerId === replay.player2.id ? 'border-[var(--theme-success)]' : 'border-[var(--theme-border)]'} bg-[var(--theme-muted)]`}>
          <div className="flex items-center gap-2">
            {replay.winnerId === replay.player2.id && <Trophy size={16} className="text-[var(--theme-success)]" />}
            <User size={16} className="text-[var(--theme-error)]" />
            <span className="font-bold text-[var(--theme-foreground)]">{replay.player2.username}</span>
            {!p1IsMe && <span className="text-xs text-[var(--theme-muted-foreground)]">(You)</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--theme-muted-foreground)]">
            {replay.player2.timeSeconds !== null && (
              <span className="font-mono">{replay.player2.timeSeconds.toFixed(1)}s</span>
            )}
            <span className="font-mono">{replay.player2.eloBefore} → {replay.player2.eloAfter ?? '?'}</span>
          </div>
        </div>
      </div>

      {/* Side-by-side editors */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Player 1 Editor */}
        <div className="flex flex-col rounded-xl overflow-hidden border border-[var(--theme-border)]">
          <pre
            className="flex-1 p-4 overflow-auto font-mono text-sm leading-relaxed whitespace-pre"
            style={{ backgroundColor: '#1e1f29', color: '#f8f8f2', minHeight: '300px' }}
          >
            {p1State.content || '\n'}
          </pre>
          <div className="px-3 py-1 text-xs font-mono bg-[#1e1f29] text-[#6272a4] border-t border-[#333]">
            Ln {p1State.line + 1}, Col {p1State.col + 1}
          </div>
        </div>

        {/* Player 2 Editor */}
        <div className="flex flex-col rounded-xl overflow-hidden border border-[var(--theme-border)]">
          <pre
            className="flex-1 p-4 overflow-auto font-mono text-sm leading-relaxed whitespace-pre"
            style={{ backgroundColor: '#1e1f29', color: '#f8f8f2', minHeight: '300px' }}
          >
            {p2State.content || '\n'}
          </pre>
          <div className="px-3 py-1 text-xs font-mono bg-[#1e1f29] text-[#6272a4] border-t border-[#333]">
            Ln {p2State.line + 1}, Col {p2State.col + 1}
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-muted)]">
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--theme-muted-foreground)] w-16 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--theme-primary) ${(currentTime / totalDuration) * 100}%, var(--theme-border) ${(currentTime / totalDuration) * 100}%)`,
            }}
          />
          <span className="text-xs font-mono text-[var(--theme-muted-foreground)] w-16">
            {formatTime(totalDuration)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleRestart}
            className="p-2 rounded-lg hover:bg-[var(--theme-background)] transition-colors text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)]"
            title="Restart"
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={() => setPlaying(p => !p)}
            className="p-3 rounded-full bg-[var(--theme-primary)] text-[var(--theme-background)] hover:opacity-90 transition-opacity"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button
            onClick={handleSkipEnd}
            className="p-2 rounded-lg hover:bg-[var(--theme-background)] transition-colors text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)]"
            title="Skip to End"
          >
            <SkipForward size={18} />
          </button>

          {/* Speed Control */}
          <div className="flex items-center gap-1 ml-6 border-l border-[var(--theme-border)] pl-6">
            <Timer size={14} className="text-[var(--theme-muted-foreground)]" />
            {[0.5, 1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-xs font-mono rounded ${speed === s
                  ? 'bg-[var(--theme-primary)] text-[var(--theme-background)] font-bold'
                  : 'text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)]'
                } transition-colors`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PvPReplay
