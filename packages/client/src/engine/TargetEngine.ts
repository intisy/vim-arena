import type { TargetConfig } from '@/types/lesson'

export interface TargetPosition {
  line: number
  column: number
}

export interface TargetEngineState {
  target: TargetPosition
  completed: number
  total: number
  startTime: number | null
  elapsedMs: number
}

export class TargetEngine {
  private config: TargetConfig
  private lines: string[]
  private target: TargetPosition
  private completed = 0
  private startTime: number | null = null

  constructor(config: TargetConfig) {
    this.config = config
    this.lines = config.editorContent.split('\n')
    this.target = this.generateTarget()
  }

  getTarget(): TargetPosition {
    return this.target
  }

  getCompleted(): number {
    return this.completed
  }

  getTotal(): number {
    return this.config.targetCount
  }

  isComplete(): boolean {
    return this.completed >= this.config.targetCount
  }

  getElapsedMs(): number {
    if (!this.startTime) return 0
    return Date.now() - this.startTime
  }

  getState(): TargetEngineState {
    return {
      target: this.target,
      completed: this.completed,
      total: this.config.targetCount,
      startTime: this.startTime,
      elapsedMs: this.getElapsedMs(),
    }
  }

  validate(cursorLine: number, cursorColumn: number): boolean {
    if (this.isComplete()) return false

    if (!this.startTime) {
      this.startTime = Date.now()
    }

    return cursorLine === this.target.line && cursorColumn === this.target.column
  }

  advance(): TargetPosition | null {
    if (this.isComplete()) return null

    this.completed += 1

    if (this.isComplete()) return null

    this.target = this.generateTarget()
    return this.target
  }

  reset(): void {
    this.completed = 0
    this.startTime = null
    this.target = this.generateTarget()
  }

  private generateTarget(): TargetPosition {
    const validPositions: TargetPosition[] = []

    for (let line = 0; line < this.lines.length; line++) {
      const lineText = this.lines[line]
      for (let col = 0; col < lineText.length; col++) {
        if (lineText[col] !== ' ' && lineText[col] !== '\t') {
          validPositions.push({ line, column: col })
        }
      }
    }

    if (validPositions.length === 0) {
      return { line: 0, column: 0 }
    }

    let candidate = validPositions[Math.floor(Math.random() * validPositions.length)]

    let attempts = 0
    while (
      candidate.line === this.target?.line &&
      candidate.column === this.target?.column &&
      validPositions.length > 1 &&
      attempts < 10
    ) {
      candidate = validPositions[Math.floor(Math.random() * validPositions.length)]
      attempts++
    }

    return candidate
  }
}
