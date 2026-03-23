import type { Lesson, LessonStep } from '@/types/lesson'
import type { EditorState } from '@/types/editor'
import { UNSUPPORTED_VIM_COMMANDS } from '@/data/supported-commands'

export class LessonEngine {
  private lesson: Lesson
  private currentStepIndex = 0
  private stepAttempts: Map<string, number> = new Map()

  constructor(lesson: Lesson) {
    this.validateLesson(lesson)
    this.lesson = lesson

    for (const step of lesson.steps) {
      this.stepAttempts.set(step.id, 0)
    }
  }

  getCurrentStep(): LessonStep {
    return this.lesson.steps[this.currentStepIndex]
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex
  }

  getStepCount(): number {
    return this.lesson.steps.length
  }

  getLesson(): Lesson {
    return this.lesson
  }

  isComplete(): boolean {
    return this.currentStepIndex >= this.lesson.steps.length
  }

  validateStep(currentState: EditorState): boolean {
    if (this.isComplete()) {
      return false
    }

    const step = this.getCurrentStep()

    const contentMatch =
      step.expectedContent === undefined ||
      currentState.content === step.expectedContent

    const cursorMatch =
      step.expectedCursor === undefined ||
      (currentState.cursorLine === step.expectedCursor.line &&
        currentState.cursorColumn === step.expectedCursor.column)

    return contentMatch && cursorMatch
  }

  advanceStep(): LessonStep | null {
    if (this.isComplete()) {
      return null
    }

    this.currentStepIndex += 1

    if (this.isComplete()) {
      return null
    }

    return this.getCurrentStep()
  }

  recordAttempt(): void {
    if (this.isComplete()) {
      return
    }

    const step = this.getCurrentStep()
    const current = this.stepAttempts.get(step.id) ?? 0
    this.stepAttempts.set(step.id, current + 1)
  }

  getAttemptCount(): number {
    if (this.isComplete()) {
      return 0
    }

    const step = this.getCurrentStep()
    return this.stepAttempts.get(step.id) ?? 0
  }

  getHint(): string | null {
    if (this.isComplete()) {
      return null
    }

    const step = this.getCurrentStep()
    const attempts = this.stepAttempts.get(step.id) ?? 0

    if (attempts < 3 || step.hints.length === 0) {
      return null
    }

    const hintIndex = Math.min(
      Math.floor(attempts / 3) - 1,
      step.hints.length - 1,
    )

    return step.hints[hintIndex]
  }

  reset(): void {
    this.currentStepIndex = 0

    for (const step of this.lesson.steps) {
      this.stepAttempts.set(step.id, 0)
    }
  }

  resetCurrentStep(): void {
    if (this.isComplete()) {
      return
    }

    const step = this.getCurrentStep()
    this.stepAttempts.set(step.id, 0)
  }

  private validateLesson(lesson: Lesson): void {
    const unsupported = new Set<string>(UNSUPPORTED_VIM_COMMANDS)
    const errors: string[] = []

    for (const step of lesson.steps) {
      for (const command of step.requiredCommands) {
        if (unsupported.has(command)) {
          errors.push(`Step "${step.id}": unsupported command "${command}"`)
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `LessonEngine: Lesson "${lesson.id}" contains unsupported vim commands:\n${errors.join('\n')}`,
      )
    }
  }
}
