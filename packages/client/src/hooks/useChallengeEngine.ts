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

  const engineRef = useRef<ChallengeEngine | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const practiceModeRef = useRef(initialPracticeMode)
  const isRetryRef = useRef(false)
  const lastChallengeRef = useRef<GeneratedChallenge | null>(null)
  const challengeIdRef = useRef<string | null>(null)
  const countdownDurationRef = useRef(countdownDuration)
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
    if (phase === 'active') {
      engineRef.current.pause()
      setPhase('paused')
    } else if (phase === 'paused') {
      engineRef.current.resume()
      setPhase('active')
    }
  }, [phase])

  const registerChallenge = useCallback(async (ch: GeneratedChallenge) => {
    if (!user) return
    try {
      const { data } = await supabase.rpc('start_solo_challenge', {
        p_template_id: ch.templateId,
        p_snippet_id: ch.snippetId,
        p_difficulty: ch.difficulty,
        p_reference_keystroke_count: ch.referenceKeystrokeCount,
        p_time_limit: ch.timeLimit,
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
    const cdDuration = countdownDurationRef.current
    setCountdown(cdDuration)
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
            setPhase('complete')
            void submitToServer(ch, res, practiceModeRef.current, isRetryRef.current)
          }
        })
        engineRef.current = engine
        engine.start()
        setPhase('active')
      }
    }, 1000)
  }, [cleanup, submitToServer, registerChallenge])

  const startChallenge = useCallback((diff: 1 | 2 | 3 | 4 | 5) => {
    setDifficulty(diff)
    
    const seed = Date.now()
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
    if (phase !== 'active' || !engineRef.current) return
    
    const res = engineRef.current.validateCompletion(state)
    if (res) {
      setResult(res)
      setPhase('complete')
      const ch = engineRef.current.getChallenge()
      void submitToServer(ch, res, practiceModeRef.current, isRetryRef.current)
    }
  }, [phase, submitToServer])

  const handleKeystroke = useCallback(() => {
    if (phase !== 'active' || !engineRef.current) return
    engineRef.current.recordKeystroke()
    setKeystrokes(engineRef.current.getKeystrokeCount())
  }, [phase])

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
    togglePracticeMode,
    togglePause,
    startChallenge,
    retry,
    nextChallenge,
    handleEditorStateChange,
    handleKeystroke
  }
}
