import { useState, useEffect, useRef, useCallback } from 'react'
import { ChallengeEngine } from '@/engine/ChallengeEngine'
import { ChallengeGenerator, SeededRandom } from '@/engine/ChallengeGenerator'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import { ALL_SNIPPETS } from '@/data/snippets'
import { useChallengeStats } from '@/hooks/useChallengeStats'
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

  const engineRef = useRef<ChallengeEngine | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { recordResult } = useChallengeStats()

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

  const startChallenge = useCallback((diff: 1 | 2 | 3 | 4 | 5) => {
    cleanup()
    setDifficulty(diff)
    
    const rng = new SeededRandom(Date.now())
    const generator = new ChallengeGenerator(CHALLENGE_TEMPLATES, ALL_SNIPPETS, rng)
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
        
        // Start engine
        const engine = new ChallengeEngine(newChallenge, (time) => {
          setElapsed(time)
          if (time >= newChallenge.timeLimit) {
            const res = engine.forceComplete()
            setResult(res)
            setPhase('complete')
            recordResult(res)
          }
        })
        engineRef.current = engine
        engine.start()
        setPhase('active')
      }
    }, 1000)
  }, [cleanup, recordResult])

  const retry = useCallback(() => {
    startChallenge(difficulty)
  }, [startChallenge, difficulty])

  const nextChallenge = useCallback(() => {
    const nextDiff = Math.min(difficulty + 1, 5) as 1 | 2 | 3 | 4 | 5
    startChallenge(nextDiff)
  }, [startChallenge, difficulty])

  const handleEditorStateChange = useCallback((state: EditorState) => {
    if (phase !== 'active' || !engineRef.current) return
    
    const res = engineRef.current.validateCompletion(state)
    if (res) {
      setResult(res)
      setPhase('complete')
      recordResult(res)
    }
  }, [phase, recordResult])

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
    startChallenge,
    retry,
    nextChallenge,
    handleEditorStateChange,
    handleKeystroke
  }
}
