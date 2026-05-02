import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChallengeEngine } from '@/engine/ChallengeEngine'
import { ChallengeGenerator, SeededRandom } from '@/engine/ChallengeGenerator'
import { ProceduralSnippetGenerator } from '@/engine/ProceduralSnippetGenerator'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import { ALL_SNIPPETS } from '@/data/snippets'
import { CHALLENGE_STATS_QUERY_KEY } from '@/hooks/useChallengeStats'
import { useEloRating, ELO_QUERY_KEY } from '@/hooks/useEloRating'
import { USER_STATS_QUERY_KEY } from '@/hooks/useUserStats'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getDifficultyWeights, getTimeMultiplier } from '@/engine/EloRating'
import type { GeneratedChallenge, ChallengeResult } from '@/types/challenge'
import type { EditorState } from '@/types/editor'

export type ChallengePhase = 'idle' | 'countdown' | 'active' | 'paused' | 'complete'

export function useChallengeEngine(initialPracticeMode = false, countdownDuration = 3) {
  const [challenge, setChallenge] = useState<GeneratedChallenge | null>(null)
  const [phase, setPhase] = useState<ChallengePhase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [keystrokes, setKeystrokes] = useState(0)
  const [result, setResult] = useState<ChallengeResult | null>(null)
  const [countdown, setCountdown] = useState(countdownDuration)
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [practiceMode, setPracticeMode] = useState(initialPracticeMode)
  const [isRetry, setIsRetry] = useState(false)
  const [replaySnapshots, setReplaySnapshots] = useState<any[]>([])

  const engineRef = useRef<ChallengeEngine | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const practiceModeRef = useRef(initialPracticeMode)
  const isRetryRef = useRef(false)
  const lastChallengeRef = useRef<GeneratedChallenge | null>(null)
  const challengeIdRef = useRef<string | null>(null)
  const phaseRef = useRef<ChallengePhase>('idle')
  const countdownDurationRef = useRef(countdownDuration)
  const replaySnapshotsRef = useRef<any[]>([])
  const startTimeRef = useRef<number>(0)
  countdownDurationRef.current = countdownDuration
  const { elo } = useEloRating()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const eloRatingRef = useRef(elo.rating)
  eloRatingRef.current = elo.rating

  const cleanup = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (engineRef.current) {
      engineRef.current.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const togglePracticeMode = useCallback(() => {
    if (phase === 'active' || phase === 'countdown') return
    setPracticeMode(prev => {
      const next = !prev
      practiceModeRef.current = next
      return next
    })
  }, [phase])

  const togglePause = useCallback(() => {
    if (!practiceModeRef.current || !engineRef.current) return
    if (phaseRef.current === 'active') {
      engineRef.current.pause()
      phaseRef.current = 'paused'
      setPhase('paused')
    } else if (phaseRef.current === 'paused') {
      engineRef.current.resume()
      phaseRef.current = 'active'
      setPhase('active')
    }
  }, [])

  const registerChallenge = useCallback(async (ch: GeneratedChallenge) => {
    if (!user) return
    try {
      const { data } = await supabase.rpc('start_solo_challenge', {
        p_template_id: ch.templateId,
        p_snippet_id: ch.snippetId,
        p_difficulty: ch.difficulty,
        p_reference_keystroke_count: ch.referenceKeystrokeCount,
        p_time_limit: ch.timeLimit,
        p_countdown_duration: countdownDurationRef.current,
      })
      const parsed = data as Record<string, unknown> | null
      if (parsed?.challengeId && typeof parsed.challengeId === 'string') {
        challengeIdRef.current = parsed.challengeId
      }
    } catch (_) {
      challengeIdRef.current = null
    }
  }, [user])

  const submitToServer = useCallback(async (ch: GeneratedChallenge, res: ChallengeResult, isPractice: boolean, isRetryAttempt: boolean) => {
    sessionStorage.removeItem('vim_arena_challenge')
    if (!user) return
    try {
      await supabase.rpc('submit_solo_result', {
        p_template_id: ch.templateId,
        p_snippet_id: ch.snippetId,
        p_time_seconds: res.timeSeconds,
        p_keystroke_count: res.keystrokeCount,
        p_reference_keystroke_count: ch.referenceKeystrokeCount,
        p_difficulty: ch.difficulty,
        p_timed_out: res.timedOut,
        p_time_limit: ch.timeLimit,
        p_is_practice: isPractice,
        p_is_retry: isRetryAttempt,
        p_challenge_id: challengeIdRef.current,
        p_replay_data: replaySnapshotsRef.current.length > 0 ? JSON.stringify(replaySnapshotsRef.current) : null,
      })
      challengeIdRef.current = null
      queryClient.invalidateQueries({ queryKey: CHALLENGE_STATS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ELO_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: USER_STATS_QUERY_KEY })
    } catch (_) {
      // Server errors should not break UI
    }
  }, [user, queryClient])

  const launchChallenge = useCallback((ch: GeneratedChallenge, retrying: boolean) => {
    cleanup()
    challengeIdRef.current = null
    setIsRetry(retrying)
    isRetryRef.current = retrying
    setChallenge(ch)
    lastChallengeRef.current = ch
    setResult(null)
    setElapsed(0)
    setKeystrokes(0)
    replaySnapshotsRef.current = []
    setReplaySnapshots([])
    startTimeRef.current = 0
    const cdDuration = countdownDurationRef.current
    setCountdown(cdDuration)
    phaseRef.current = 'countdown'
    setPhase('countdown')

    void registerChallenge(ch)

    let currentCountdown = cdDuration
    countdownIntervalRef.current = setInterval(() => {
      currentCountdown -= 1
      setCountdown(currentCountdown)
      
      if (currentCountdown <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        
        const engine = new ChallengeEngine(ch, (time) => {
          setElapsed(time)
          if (time >= ch.timeLimit) {
            const res = engine.forceComplete()
            setResult(res)
            phaseRef.current = 'complete'
            setPhase('complete')
            setReplaySnapshots([...replaySnapshotsRef.current])
            void submitToServer(ch, res, practiceModeRef.current, isRetryRef.current)
          }
        })
        engineRef.current = engine
        engine.start()
        startTimeRef.current = Date.now()
        phaseRef.current = 'active'
        setPhase('active')
      }
    }, 1000)
  }, [cleanup, submitToServer, registerChallenge])

  const startChallenge = useCallback((diff: 1 | 2 | 3 | 4 | 5) => {
    setDifficulty(diff)
    
    let seed: number
    const stored = sessionStorage.getItem('vim_arena_challenge')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { seed: number; difficulty: number }
        if (parsed.difficulty === diff && Date.now() - parsed.seed < 10 * 60 * 1000) {
          seed = parsed.seed
        } else {
          seed = Date.now()
        }
      } catch {
        seed = Date.now()
      }
    } else {
      seed = Date.now()
    }
    sessionStorage.setItem('vim_arena_challenge', JSON.stringify({ seed, difficulty: diff }))

    const rng = new SeededRandom(seed)

    const proceduralGen = new ProceduralSnippetGenerator(new SeededRandom(seed + 1))
    const proceduralSnippets = proceduralGen.generateBatch(8)
    const allSnippets = [...ALL_SNIPPETS, ...proceduralSnippets]

    const rating = eloRatingRef.current
    const weights = getDifficultyWeights(rating)
    const generator = new ChallengeGenerator(CHALLENGE_TEMPLATES, allSnippets, rng)
    const newChallenge = generator.generate({
      weights,
      timeMultiplierFn: (challengeDiff) => getTimeMultiplier(diff, challengeDiff),
    })
    
    launchChallenge(newChallenge, false)
  }, [launchChallenge])

  const retry = useCallback(() => {
    if (lastChallengeRef.current) {
      launchChallenge(lastChallengeRef.current, !practiceModeRef.current)
    } else {
      startChallenge(difficulty)
    }
  }, [launchChallenge, startChallenge, difficulty])

  const nextChallenge = useCallback(() => {
    startChallenge(difficulty)
  }, [startChallenge, difficulty])

  const handleEditorStateChange = useCallback((state: EditorState) => {
    if (phaseRef.current !== 'active' || !engineRef.current) return
    
    const now = Date.now()
    if (startTimeRef.current > 0) {
      const elapsedSec = (now - startTimeRef.current) / 1000
      const lastSnap = replaySnapshotsRef.current[replaySnapshotsRef.current.length - 1]
      if (!lastSnap || lastSnap.c !== state.content || lastSnap.l !== state.cursorLine || lastSnap.col !== state.cursorColumn) {
        replaySnapshotsRef.current.push({
          t: parseFloat(elapsedSec.toFixed(2)),
          c: state.content,
          l: state.cursorLine,
          col: state.cursorColumn
        })
      }
    }
    const res = engineRef.current.validateCompletion(state)
    if (res) {
      setResult(res)
      phaseRef.current = 'complete'
      setPhase('complete')
      setReplaySnapshots([...replaySnapshotsRef.current])
      const ch = engineRef.current.getChallenge()
      void submitToServer(ch, res, practiceModeRef.current, isRetryRef.current)
    }
  }, [submitToServer])

  const handleKeystroke = useCallback((key: string) => {
    if (phaseRef.current !== 'active' || !engineRef.current) return
    engineRef.current.recordKeystroke(key)
    setKeystrokes(engineRef.current.getKeystrokeCount())
  }, [])

  const showSolutionAndLose = useCallback(() => {
    if (phaseRef.current !== 'active' && phaseRef.current !== 'paused') return
    const ch = lastChallengeRef.current
    if (!ch) return
    const elapsedTime = elapsed
    const keyCount = engineRef.current?.getKeystrokeCount() ?? keystrokes
    const log = engineRef.current?.getKeyLog() ?? []
    cleanup()
    const res: ChallengeResult = {
      templateId: ch.templateId,
      snippetId: ch.snippetId,
      completedAt: Date.now(),
      timeSeconds: elapsedTime,
      keystrokeCount: keyCount,
      referenceKeystrokeCount: ch.referenceKeystrokeCount,
      speedScore: 0,
      efficiencyScore: 0,
      totalScore: 0,
      timedOut: true,
      keyLog: log,
    }
    setResult(res)
    phaseRef.current = 'complete'
    setPhase('complete')
    setReplaySnapshots([...replaySnapshotsRef.current])
    void submitToServer(ch, res, true, true)
  }, [cleanup, elapsed, keystrokes, submitToServer])

  const skipChallenge = useCallback(() => {
    if (phaseRef.current !== 'active' && phaseRef.current !== 'paused') return
    const ch = lastChallengeRef.current
    if (!ch) return
    const elapsedTime = elapsed
    const keyCount = engineRef.current?.getKeystrokeCount() ?? keystrokes
    const log = engineRef.current?.getKeyLog() ?? []
    cleanup()
    const res: ChallengeResult = {
      templateId: ch.templateId,
      snippetId: ch.snippetId,
      completedAt: Date.now(),
      timeSeconds: elapsedTime,
      keystrokeCount: keyCount,
      referenceKeystrokeCount: ch.referenceKeystrokeCount,
      speedScore: 0,
      efficiencyScore: 0,
      totalScore: 0,
      timedOut: true,
      keyLog: log,
    }
    void submitToServer(ch, res, true, true)
    sessionStorage.removeItem('vim_arena_challenge')
    startChallenge(difficulty)
  }, [cleanup, elapsed, keystrokes, submitToServer, startChallenge, difficulty])

  return {
    challenge,
    phase,
    elapsed,
    keystrokes,
    result,
    countdown,
    difficulty,
    practiceMode,
    isRetry,
    replaySnapshots,
    togglePracticeMode,
    togglePause,
    startChallenge,
    retry,
    nextChallenge,
    handleEditorStateChange,
    handleKeystroke,
    showSolutionAndLose,
    skipChallenge,
  }
}
