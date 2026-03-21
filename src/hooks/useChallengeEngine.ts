import { useState, useEffect, useRef, useCallback } from 'react'
import { ChallengeEngine } from '@/engine/ChallengeEngine'
import { ChallengeGenerator, SeededRandom } from '@/engine/ChallengeGenerator'
import { ProceduralSnippetGenerator } from '@/engine/ProceduralSnippetGenerator'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import { ALL_SNIPPETS } from '@/data/snippets'
import { useChallengeStats } from '@/hooks/useChallengeStats'
import { useEloRating } from '@/hooks/useEloRating'
import type { GeneratedChallenge, ChallengeResult } from '@/types/challenge'
import type { EditorState } from '@/types/editor'

export type ChallengePhase = 'idle' | 'countdown' | 'active' | 'complete'

export function useChallengeEngine() {
  const [challenge, setChallenge] = useState<GeneratedChallenge | null>(null)
  const [phase, setPhase] = useState<ChallengePhase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [keystrokes, setKeystrokes] = useState(0)
  const [result, setResult] = useState<ChallengeResult | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [practiceMode, setPracticeMode] = useState(false)

  const engineRef = useRef<ChallengeEngine | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const practiceModeRef = useRef(false)
  const { recordResult } = useChallengeStats()
  const { recordChallengeResult: recordElo } = useEloRating()

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
    setPracticeMode(prev => {
      const next = !prev
      practiceModeRef.current = next
      return next
    })
  }, [])

  const startChallenge = useCallback((diff: 1 | 2 | 3 | 4 | 5) => {
    cleanup()
    setDifficulty(diff)
    
    const seed = Date.now()
    const rng = new SeededRandom(seed)

    const proceduralGen = new ProceduralSnippetGenerator(new SeededRandom(seed + 1))
    const proceduralSnippets = proceduralGen.generateBatch(8)
    const allSnippets = [...ALL_SNIPPETS, ...proceduralSnippets]

    const generator = new ChallengeGenerator(CHALLENGE_TEMPLATES, allSnippets, rng)
    const newChallenge = generator.generate({ difficulty: diff })
    
    setChallenge(newChallenge)
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
        
        const engine = new ChallengeEngine(newChallenge, (time) => {
          setElapsed(time)
          if (time >= newChallenge.timeLimit) {
            const res = engine.forceComplete()
            setResult(res)
            setPhase('complete')
            if (!practiceModeRef.current) {
              recordResult(res)
              recordElo(diff, res.totalScore, true)
            }
          }
        })
        engineRef.current = engine
        engine.start()
        setPhase('active')
      }
    }, 1000)
  }, [cleanup, recordResult, recordElo])

  const retry = useCallback(() => {
    startChallenge(difficulty)
  }, [startChallenge, difficulty])

  const nextChallenge = useCallback(() => {
    startChallenge(difficulty)
  }, [startChallenge, difficulty])

  const handleEditorStateChange = useCallback((state: EditorState) => {
    if (phase !== 'active' || !engineRef.current) return
    if (engineRef.current.getKeystrokeCount() === 0) return
    
    const res = engineRef.current.validateCompletion(state)
    if (res) {
      setResult(res)
      setPhase('complete')
      if (!practiceModeRef.current) {
        recordResult(res)
        recordElo(difficulty, res.totalScore, false)
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
    togglePracticeMode,
    startChallenge,
    retry,
    nextChallenge,
    handleEditorStateChange,
    handleKeystroke
  }
}
