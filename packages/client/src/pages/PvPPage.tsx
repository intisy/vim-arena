import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swords, Loader2, X, Clock, Zap, Trophy, History, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useEloRating } from '@/hooks/useEloRating'
import type { MatchFoundMessage, PvpRaceConfig, MatchHistoryEntry } from '@vim-arena/shared'

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
  const [history, setHistory] = useState<MatchHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    document.title = 'PvP Arena | vim-arena'
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    async function loadHistory() {
      setHistoryLoading(true)
      try {
        const { data, error } = await supabase.rpc('get_pvp_history', { p_limit: 20 })
        if (error) {
          console.error('[pvp/history]', error.message)
          return
        }
        const entries = (data as MatchHistoryEntry[] | null) ?? []
        setHistory(entries)
      } catch {
      } finally {
        setHistoryLoading(false)
      }
    }

    void loadHistory()
  }, [session?.user?.id])

  useEffect(() => {
    if (queueState !== 'queued' || !queuedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - queuedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [queueState, queuedAt])

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
          setQueueState('idle')
        }
      } catch {
      }
    }, 5000)

    return () => clearInterval(poll)
  }, [queueState])

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
    }

    setQueueState('idle')
    setQueuedAt(null)
    setElapsed(0)
  }, [])

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
    <div className="max-w-2xl mx-auto flex flex-col items-center gap-8 py-12 animate-fade-in-up">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--theme-warning)]/10 flex items-center justify-center animate-pulse-glow">
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
      <div className="w-full max-w-md stat-card p-5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-muted)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--theme-warning)]/10 flex items-center justify-center">
            <Trophy size={18} className="text-[var(--theme-warning)]" />
          </div>
          <span className="font-bold text-[var(--theme-foreground)]">Your Rating</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-[var(--theme-warning)]">{elo.rating}</div>
          </div>
          <div className="text-xs text-[var(--theme-muted-foreground)] text-right leading-tight font-mono">
            <div>{elo.gamesPlayed} games</div>
            <div className="text-[var(--theme-success)]">{elo.wins}W</div>
            <div className="text-[var(--theme-error)]">{elo.losses}L</div>
          </div>
        </div>
      </div>

      {/* Queue Card */}
      <div className="w-full max-w-md p-8 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col items-center gap-6 glow-border-warning">
        {queueState === 'idle' && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 rounded-lg bg-[var(--theme-accent)]/10 flex items-center justify-center">
                <Zap size={22} className="text-[var(--theme-accent)]" />
              </div>
              <p className="text-sm text-[var(--theme-muted-foreground)] leading-relaxed">
                You'll be matched with a player of similar skill level.
                Both players receive the same challenge — first to finish wins!
              </p>
            </div>
            <button
              onClick={joinQueue}
              className="w-full px-6 py-4 bg-[var(--theme-warning)] text-[var(--theme-background)] font-black rounded-xl text-lg hover:opacity-90 transition-all duration-200 hover:-translate-y-0.5 shadow-lg"
            >
              Find Match
            </button>
          </>
        )}

        {queueState === 'joining' && (
          <div className="flex items-center gap-3 text-[var(--theme-muted-foreground)] py-4">
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
          <div className="flex flex-col items-center gap-4 text-center py-4">
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

      {/* Info cards */}
      <div className="w-full max-w-md grid grid-cols-3 gap-3 stagger">
        <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] text-center animate-fade-in-up">
          <div className="text-2xl font-black text-[var(--theme-primary)] font-mono">60s</div>
          <div className="text-[10px] text-[var(--theme-muted-foreground)] mt-1 uppercase tracking-wider">Time Limit</div>
        </div>
        <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] text-center animate-fade-in-up">
          <div className="text-2xl font-black text-[var(--theme-accent)] font-mono">1v1</div>
          <div className="text-[10px] text-[var(--theme-muted-foreground)] mt-1 uppercase tracking-wider">Head to Head</div>
        </div>
        <div className="stat-card p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] text-center animate-fade-in-up">
          <div className="text-2xl font-black text-[var(--theme-warning)] font-mono">{elo.peakRating}</div>
          <div className="text-[10px] text-[var(--theme-muted-foreground)] mt-1 uppercase tracking-wider">Peak Elo</div>
        </div>
      </div>

      {/* Match History */}
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-4">
          <History size={18} className="text-[var(--theme-muted-foreground)]" />
          <h2 className="text-lg font-bold text-[var(--theme-foreground)]">Match History</h2>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[var(--theme-muted-foreground)]" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--theme-muted-foreground)] glass-card rounded-xl">
            No matches yet. Find a match to get started!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map(match => {
              const won = match.winnerId === match.myId
              const draw = match.winnerId === null
              const eloDelta = (match.myEloAfter ?? match.myEloBefore) - match.myEloBefore

              return (
                <div
                  key={match.matchId}
                  className={`p-4 rounded-xl border bg-[var(--theme-background)] transition-all duration-200 hover:-translate-y-0.5 ${won ? 'border-[var(--theme-success)]/30 hover:border-[var(--theme-success)]/50' : draw ? 'border-[var(--theme-warning)]/30 hover:border-[var(--theme-warning)]/50' : 'border-[var(--theme-error)]/30 hover:border-[var(--theme-error)]/50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${won ? 'bg-[var(--theme-success)]/10 text-[var(--theme-success)]' : draw ? 'bg-[var(--theme-warning)]/10 text-[var(--theme-warning)]' : 'bg-[var(--theme-error)]/10 text-[var(--theme-error)]'}`}>
                        {won ? 'WIN' : draw ? 'DRAW' : 'LOSS'}
                      </span>
                      <span className="text-sm text-[var(--theme-foreground)]">
                        vs <span className="font-bold">{match.opponentUsername}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold ${eloDelta >= 0 ? 'text-[var(--theme-success)]' : 'text-[var(--theme-error)]'}`}>
                        {eloDelta >= 0 ? '+' : ''}{eloDelta}
                      </span>
                      {match.hasReplay && (
                        <button
                          onClick={() => navigate(`/pvp/replay/${match.matchId}`)}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-[var(--theme-muted)] text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] transition-colors border border-[var(--theme-border)]"
                          title="Watch Replay"
                        >
                          <Eye size={12} />
                          Replay
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--theme-muted-foreground)]">
                    <div className="flex items-center gap-3 font-mono">
                      {match.myTimeSeconds !== null && (
                        <span>{match.myTimeSeconds.toFixed(1)}s</span>
                      )}
                      {match.myKeystrokes !== null && (
                        <span>{match.myKeystrokes} keys</span>
                      )}
                      <span className="capitalize">{match.status}</span>
                    </div>
                    <span>{new Date(match.startedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PvPPage
