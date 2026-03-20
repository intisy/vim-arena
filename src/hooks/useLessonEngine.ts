import { useState, useCallback, useEffect, useMemo } from 'react'
import { LessonEngine } from '@/engine/LessonEngine'
import type { Lesson, LessonStep } from '@/types/lesson'
import type { EditorState } from '@/types/editor'

export function useLessonEngine(lesson: Lesson) {
  const engine = useMemo(() => new LessonEngine(lesson), [lesson])

  const [currentStep, setCurrentStep] = useState<LessonStep>(engine.getCurrentStep())
  const [stepIndex, setStepIndex] = useState<number>(engine.getCurrentStepIndex())
  const [isComplete, setIsComplete] = useState<boolean>(engine.isComplete())
  const [hint, setHint] = useState<string | null>(engine.getHint())
  const [attempts, setAttempts] = useState<number>(engine.getAttemptCount())

  const syncState = useCallback(() => {
    setCurrentStep(engine.getCurrentStep())
    setStepIndex(engine.getCurrentStepIndex())
    setIsComplete(engine.isComplete())
    setHint(engine.getHint())
    setAttempts(engine.getAttemptCount())
  }, [engine])

  useEffect(() => {
    syncState()
  }, [syncState])

  const validateAndAdvance = useCallback((editorState: EditorState) => {
    if (engine.isComplete()) return false

    const isValid = engine.validateStep(editorState)
    if (isValid) {
      engine.advanceStep()
    } else {
      engine.recordAttempt()
    }
    syncState()
    return isValid
  }, [engine, syncState])

  const resetStep = useCallback(() => {
    engine.resetCurrentStep()
    syncState()
  }, [engine, syncState])

  const resetLesson = useCallback(() => {
    engine.reset()
    syncState()
  }, [engine, syncState])

  return {
    lesson: engine.getLesson(),
    currentStep,
    stepIndex,
    totalSteps: engine.getStepCount(),
    isComplete,
    hint,
    attempts,
    validateAndAdvance,
    resetStep,
    resetLesson
  }
}
