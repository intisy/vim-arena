export type LessonType = 'theory' | 'step-based' | 'target-based'

export interface KeyCard {
  key: string
  description: string
  example?: {
    before: string
    after: string
    cursorBefore: { line: number; column: number }
    cursorAfter: { line: number; column: number }
  }
}

export interface TargetConfig {
  targetCount: number
  editorContent: string
  allowedKeys: string[]
}

export interface LessonStep {
  id: string
  instruction: string
  initialContent: string
  initialCursor: { line: number; column: number }
  expectedContent?: string
  expectedCursor?: { line: number; column: number }
  hints: string[]
  requiredCommands: string[]
  successMessage?: string
}

export interface Lesson {
  id: string
  categoryId: string
  title: string
  description: string
  order: number
  type: LessonType
  keyCards: KeyCard[]
  explanation: string
  additionalNotes?: string
  steps: LessonStep[]
  targetConfig?: TargetConfig
  prerequisiteIds: string[]
}

export interface LessonCategory {
  id: string
  title: string
  description: string
  icon: string
  order: number
}
