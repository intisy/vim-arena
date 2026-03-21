import type { GeneratedChallenge, ChallengeResult } from '@/types/challenge'
import type { EditorState } from '@/types/editor'
import { calculateEfficiency, calculateSpeedScore, calculateTotalScore } from './Scoring'

export class ChallengeEngine {
  private challenge: GeneratedChallenge
  private startTime: number = 0
  private keystrokeCount: number = 0
  private isActive: boolean = false
  private timerInterval: ReturnType<typeof setInterval> | null = null
  private onTick?: (elapsed: number) => void

  constructor(challenge: GeneratedChallenge, onTick?: (elapsed: number) => void) {
    this.challenge = challenge
    this.onTick = onTick
  }

  start(): void {
    if (this.isActive) return
    this.startTime = Date.now()
    this.isActive = true
    this.keystrokeCount = 0
    if (this.onTick) {
      this.timerInterval = setInterval(() => {
        this.onTick?.(this.getElapsedSeconds())
      }, 100)
    }
  }

  recordKeystroke(): void {
    if (!this.isActive) return
    this.keystrokeCount++
  }

  getElapsedSeconds(): number {
    if (!this.isActive || this.startTime === 0) return 0
    return (Date.now() - this.startTime) / 1000
  }

  getKeystrokeCount(): number {
    return this.keystrokeCount
  }

  getChallenge(): GeneratedChallenge {
    return this.challenge
  }

  getIsActive(): boolean {
    return this.isActive
  }

  validateCompletion(currentState: EditorState): ChallengeResult | null {
    if (!this.isActive) return null
    const ch = this.challenge
    if (currentState.content !== ch.expectedContent) return null
    return this._buildResult(false)
  }

  forceComplete(): ChallengeResult {
    return this._buildResult(true)
  }

  private _buildResult(timedOut: boolean): ChallengeResult {
    const timeSeconds = this.getElapsedSeconds()
    this.destroy()

    if (timedOut) {
      return {
        templateId: this.challenge.templateId,
        snippetId: this.challenge.snippetId,
        completedAt: Date.now(),
        timeSeconds,
        keystrokeCount: this.keystrokeCount,
        referenceKeystrokeCount: this.challenge.referenceKeystrokeCount,
        efficiencyScore: 0,
        speedScore: 0,
        totalScore: 0,
        timedOut: true,
      }
    }

    const efficiency = calculateEfficiency(this.keystrokeCount, this.challenge.referenceKeystrokeCount)
    const speed = calculateSpeedScore(timeSeconds, this.challenge.timeLimit)
    const total = calculateTotalScore(efficiency, speed)
    return {
      templateId: this.challenge.templateId,
      snippetId: this.challenge.snippetId,
      completedAt: Date.now(),
      timeSeconds,
      keystrokeCount: this.keystrokeCount,
      referenceKeystrokeCount: this.challenge.referenceKeystrokeCount,
      efficiencyScore: efficiency,
      speedScore: speed,
      totalScore: total,
      timedOut: false,
    }
  }

  reset(): void {
    this.destroy()
    this.startTime = 0
    this.keystrokeCount = 0
    this.isActive = false
  }

  destroy(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    this.isActive = false
  }
}
