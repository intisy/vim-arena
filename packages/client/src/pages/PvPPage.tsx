import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swords, Loader2, X, Clock, Zap, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useEloRating } from '@/hooks/useEloRating'
import type { MatchFoundMessage, PvpRaceConfig } from '@vim-arena/shared'

type QueueState = 'idle' | 'joining' | 'queued' | 'matched' | 'error'

export function PvPPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { elo } = useEloRating()
  const [queueState, setQueueState] = useState<QueueState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [queuedAt, setQueuedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [matchConfig, setMatchConfig] = useState<PvpRaceConfig | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    document.title = 'PvP Arena | vim-arena'
  }, [])

  // Elapsed time counter while queued
  useEffect(() => {
    if (queueState !== 'queued' || !queuedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - queuedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [queueState, queuedAt])

  // Subscribe to Realtime for match_found (opponent's client broadcasts this)
  useEffect(() => {
    if (!session?.user?.id || queueState !== 'queued') return

    const channel = supabase.channel(`matchmaking:${session.user.id}`)

    channel
      .on('broadcast', { event: 'match_found' }, (payload) => {
        const message = payload.payload as MatchFoundMessage
        setMatchConfig(message.config)
        setQueueState('matched')
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [session?.user?.id, queueState])

  // Poll for match as fallback via RPC (in case Realtime misses)
  useEffect(() => {
    if (queueState !== 'queued') return

    const poll = setInterval(async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_matchmaking_status')
        if (rpcError) return

        const result = data as { inQueue: boolean; match: PvpRaceConfig | null; justMatched: boolean } | null
        if (!result) return

        if (result.match) {
          setMatchConfig(result.match)
          setQueueState('matched')
        } else if (!result.inQueue) {
          // Removed from queue without a match (edge case)
          setQueueState('idle')
        }
      } catch {
        // Polling failure is non-fatal
      }
    }, 5000)

    return () => clearInterval(poll)
  }, [queueState])

  // Navigate to race screen after match found (brief delay for UX)
  useEffect(() => {
    if (queueState !== 'matched' || !matchConfig) return
    const timer = setTimeout(() => {
      navigate(`/pvp/race/${matchConfig.matchId}`, { state: { config: matchConfig } })
    }, 1500)
    return () => clearTimeout(timer)
  }, [queueState, matchConfig, navigate])

  const joinQueue = useCallback(async () => {
    if (!session?.user?.id) return
    setError(null)
    setQueueState('joining')

    try {
      const { data, error: rpcError } = await supabase.rpc('join_matchmaking_queue')

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to join queue')
      }

      const result = data as { matched: boolean; config?: PvpRaceConfig & { opponentUserId?: string }; error?: string } | null
      if (!result) throw new Error('Empty response from matchmaking')

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.matched && result.config) {
        // Instant match found — broadcast to opponent via Realtime
        const opponentId = result.config.opponentUserId
        if (opponentId) {
          const message: MatchFoundMessage = {
            type: 'match_found',
            matchId: result.config.matchId,
            config: result.config,
          }
          const ch = supabase.channel(`matchmaking:${opponentId}`)
          await ch.send({
            type: 'broadcast',
            event: 'match_found',
            payload: message,
          })
          supabase.removeChannel(ch)
        }

        setMatchConfig(result.config)
        setQueueState('matched')
      } else {
        // No instant match — wait in queue
        setQueuedAt(Date.now())
        setElapsed(0)
        setQueueState('queued')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join queue')
      setQueueState('error')
    }
  }, [session?.user?.id])

  const leaveQueue = useCallback(async () => {
    try {
      await supabase.rpc('leave_matchmaking_queue')
    } catch {
      // Best-effort
    }

    setQueueState('idle')
    setQueuedAt(null)
    setElapsed(0)
  }, [])

  // Cleanup on unmount — leave queue (fire-and-forget, no .catch on PostgrestFilterBuilder)
  useEffect(() => {
    return () => {
      if (queueState === 'queued') {
        void supabase.rpc('leave_matchmaking_queue')
      }
    }
  }, [queueState])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center gap-8 py-12">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-[var(--theme-warning)]/10 flex items-center justify-center">
          <Swords size={36} className="text-[var(--theme-warning)]" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-[var(--theme-foreground)]">
          PvP Arena
        </h1>
        <p className="text-[var(--theme-muted-foreground)] max-w-md">
          Race against another player — same challenge, first to complete wins. Elo rated.
        </p>
      </div>

      {/* Your Rating Card */}
      <div className="w-full max-w-md p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-muted)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-[var(--theme-warning)]" />
          <span className="font-bold text-[var(--theme-foreground)]">Your Rating</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-[var(--theme-warning)]">{elo.rating}</div>
          </div>
          <div className="text-xs text-[var(--theme-muted-foreground)] text-right leading-tight">
            <div>{elo.gamesPlayed} games</div>
            <div className="text-[var(--theme-success)]">{elo.wins}W</div>
            <div className="text-[var(--theme-error)]">{elo.losses}L</div>
          </div>
        </div>
      </div>

      {/* Queue Card */}
      <div className="w-full max-w-md p-8 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center gap-6">
        {queueState === 'idle' && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <Zap size={24} className="text-[var(--theme-accent)]" />
              <p className="text-sm text-[var(--theme-muted-foreground)]">
                You'll be matched with a player of similar skill level.
                Both players receive the same challenge — first to finish wins!
              </p>
            </div>
            <button
              onClick={joinQueue}
              className="w-full px-6 py-4 bg-[var(--theme-warning)] text-[var(--theme-background)] font-bold rounded-lg text-lg hover:opacity-90 transition-opacity shadow-[0_0_15px_var(--theme-warning)]"
            >
              Find Match
            </button>
          </>
        )}

        {queueState === 'joining' && (
          <div className="flex items-center gap-3 text-[var(--theme-muted-foreground)]">
            <Loader2 size={24} className="animate-spin" />
            <span>Joining queue...</span>
          </div>
        )}

        {queueState === 'queued' && (
          <>
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={40} className="animate-spin text-[var(--theme-warning)]" />
              <p className="text-lg font-bold text-[var(--theme-foreground)]">
                Searching for opponent...
              </p>
              <div className="flex items-center gap-2 text-[var(--theme-muted-foreground)]">
                <Clock size={16} />
                <span className="font-mono text-sm">{formatTime(elapsed)}</span>
              </div>
              <p className="text-xs text-[var(--theme-muted-foreground)] text-center">
                Elo range expands over time to find a match faster
              </p>
            </div>
            <button
              onClick={leaveQueue}
              className="flex items-center gap-2 px-5 py-2.5 border border-[var(--theme-border)] text-[var(--theme-muted-foreground)] font-medium rounded-lg hover:border-[var(--theme-error)] hover:text-[var(--theme-error)] transition-colors"
            >
              <X size={16} />
              Cancel
            </button>
          </>
        )}

        {queueState === 'matched' && matchConfig && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-3xl font-black text-[var(--theme-success)]">
              Match Found!
            </div>
            <p className="text-[var(--theme-foreground)]">
              <span className="font-bold">{matchConfig.player1Username}</span>
              {' vs '}
              <span className="font-bold">{matchConfig.player2Username}</span>
            </p>
            <p className="text-sm text-[var(--theme-muted-foreground)]">
              Entering race...
            </p>
            <Loader2 size={24} className="animate-spin text-[var(--theme-primary)]" />
          </div>
        )}

        {queueState === 'error' && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-[var(--theme-error)] font-medium">{error}</p>
            </div>
            <button
              onClick={joinQueue}
              className="px-6 py-3 bg-[var(--theme-warning)] text-[var(--theme-background)] font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </>
        )}
      </div>

      {/* Info */}
      <div className="w-full max-w-md grid grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-lg border border-[var(--theme-border)]">
          <div className="text-2xl font-bold text-[var(--theme-primary)]">60s</div>
          <div className="text-xs text-[var(--theme-muted-foreground)] mt-1">Time Limit</div>
        </div>
        <div className="p-4 rounded-lg border border-[var(--theme-border)]">
          <div className="text-2xl font-bold text-[var(--theme-accent)]">1v1</div>
          <div className="text-xs text-[var(--theme-muted-foreground)] mt-1">Head to Head</div>
        </div>
        <div className="p-4 rounded-lg border border-[var(--theme-border)]">
          <div className="text-2xl font-bold text-[var(--theme-warning)]">{elo.peakRating}</div>
          <div className="text-xs text-[var(--theme-muted-foreground)] mt-1">Peak Elo</div>
        </div>
      </div>
    </div>
  )
}

export default PvPPage
