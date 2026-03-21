import { useState, useEffect, useRef, useCallback } from 'react'
import { ChallengeEngine } from '@/engine/ChallengeEngine'
import { ChallengeGenerator, SeededRandom } from '@/engine/ChallengeGenerator'
import { ProceduralSnippetGenerator } from '@/engine/ProceduralSnippetGenerator'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import { ALL_SNIPPETS } from '@/data/snippets'
import { useChallengeStats } from '@/hooks/useChallengeStats'
import { useEloRating } from '@/hooks/useEloRating'
import { getDifficultyWeights, getTimeMultiplier } from '@/engine/EloRating'
import type { GeneratedChallenge, ChallengeResult } from '@/types/challenge'
import type { EditorState } from '@/types/editor'

export type ChallengePhase = 'idle' | 'countdown' | 'active' | 'complete'

export function useChallengeEngine(initialPracticeMode = false) {
  const [challenge, setChallenge] = useState<GeneratedChallenge | null>(null)
  const [phase, setPhase] = useState<ChallengePhase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [keystrokes, setKeystrokes] = useState(0)
  const [result, setResult] = useState<ChallengeResult | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [practiceMode, setPracticeMode] = useState(initialPracticeMode)
  const [isRetry, setIsRetry] = useState(false)

  const engineRef = useRef<ChallengeEngine | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const practiceModeRef = useRef(initialPracticeMode)
  const isRetryRef = useRef(false)
  const lastChallengeRef = useRef<GeneratedChallenge | null>(null)
  const { recordResult } = useChallengeStats()
  const { recordChallengeResult: recordElo, elo } = useEloRating()

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

  const launchChallenge = useCallback((ch: GeneratedChallenge, retrying: boolean) => {
    cleanup()
    setIsRetry(retrying)
    isRetryRef.current = retrying
    setChallenge(ch)
    lastChallengeRef.current = ch
    setResult(null)
    setElapsed(0)
    setKeystrokes(0)
    setCountdown(3)
    setPhase('countdown')

    let currentCountdown = 3
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
            if (!practiceModeRef.current && !isRetryRef.current) {
              try {
                recordResult(res)
                recordElo(ch.difficulty, res.totalScore, true)
              } catch (_) { /* storage errors should not break UI */ }
            }
          }
        })
        engineRef.current = engine
        engine.start()
        setPhase('active')
      }
    }, 1000)
  }, [cleanup, recordResult, recordElo])

  const startChallenge = useCallback((diff: 1 | 2 | 3 | 4 | 5) => {
    setDifficulty(diff)
    
    const seed = Date.now()
    const rng = new SeededRandom(seed)

    const proceduralGen = new ProceduralSnippetGenerator(new SeededRandom(seed + 1))
    const proceduralSnippets = proceduralGen.generateBatch(8)
    const allSnippets = [...ALL_SNIPPETS, ...proceduralSnippets]

    const weights = getDifficultyWeights(elo.rating)
    const generator = new ChallengeGenerator(CHALLENGE_TEMPLATES, allSnippets, rng)
    const newChallenge = generator.generate({
      weights,
      timeMultiplierFn: (challengeDiff) => getTimeMultiplier(diff, challengeDiff),
    })
    
    launchChallenge(newChallenge, false)
  }, [launchChallenge, elo.rating])

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
      if (!practiceModeRef.current && !isRetryRef.current) {
        try {
          recordResult(res)
          recordElo(difficulty, res.totalScore, false)
        } catch (_) { /* storage errors should not break UI */ }
      }
    }
  }, [phase, recordResult, recordElo, difficulty])

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
    startChallenge,
    retry,
    nextChallenge,
    handleEditorStateChange,
    handleKeystroke
  }
}
