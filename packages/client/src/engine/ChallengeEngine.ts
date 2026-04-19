import type { GeneratedChallenge, ChallengeResult } from '@/types/challenge'
import type { EditorState } from '@/types/editor'
import { calculateEfficiency, calculateSpeedScore, calculateTotalScore } from './Scoring'

export class ChallengeEngine {
  private challenge: GeneratedChallenge
  private startTime: number = 0
  private keystrokeCount: number = 0
  private keyLog: string[] = []
  private isActive: boolean = false
  private isPaused: boolean = false
  private accumulatedTime: number = 0
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
    this.isPaused = false
    this.accumulatedTime = 0
    this.keystrokeCount = 0
    if (this.onTick) {
      this.timerInterval = setInterval(() => {
        this.onTick?.(this.getElapsedSeconds())
      }, 100)
    }
  }

  pause(): void {
    if (!this.isActive || this.isPaused) return
    this.accumulatedTime += (Date.now() - this.startTime) / 1000
    this.isPaused = true
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  resume(): void {
    if (!this.isActive || !this.isPaused) return
    this.isPaused = false
    this.startTime = Date.now()
    if (this.onTick) {
      this.timerInterval = setInterval(() => {
        this.onTick?.(this.getElapsedSeconds())
      }, 100)
    }
  }

  getIsPaused(): boolean {
    return this.isPaused
  }

  recordKeystroke(key?: string): void {
    if (!this.isActive || this.isPaused) return
    this.keystrokeCount++
    if (key) this.keyLog.push(key)
  }

  getElapsedSeconds(): number {
    if (!this.isActive || this.startTime === 0) return this.accumulatedTime
    if (this.isPaused) return this.accumulatedTime
    return this.accumulatedTime + (Date.now() - this.startTime) / 1000
  }

  getKeystrokeCount(): number {
    return this.keystrokeCount
  }

  getKeyLog(): string[] {
    return [...this.keyLog]
  }

  getChallenge(): GeneratedChallenge {
    return this.challenge
  }

  getIsActive(): boolean {
    return this.isActive
  }

  validateCompletion(currentState: EditorState): ChallengeResult | null {
    if (!this.isActive || this.isPaused) return null
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
        keyLog: [...this.keyLog],
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
      keyLog: [...this.keyLog],
    }
  }

  reset(): void {
    this.destroy()
    this.startTime = 0
    this.keystrokeCount = 0
    this.keyLog = []
    this.isActive = false
    this.isPaused = false
    this.accumulatedTime = 0
  }

  destroy(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    this.isActive = false
  }
}
