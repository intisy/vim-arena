export type CursorPosition = { line: number; column: number }

export interface SolutionStep {
  keys: string
  description: string
}

export interface ChallengeSolution {
  label: string
  steps: SolutionStep[]
  totalKeystrokes: number
}

export interface CodeSnippet {
  id: string
  content: string
  language: 'javascript' | 'typescript' | 'python' | 'plaintext'
  lineCount: number
  tags: string[]
}

export interface TargetHighlight {
  fromLine: number
  fromCol: number
  toLine: number
  toCol: number
}

export interface GeneratedChallenge {
  templateId: string
  snippetId: string
  initialContent: string
  initialCursor: CursorPosition
  targetCursor?: CursorPosition
  expectedContent: string
  expectedCursor?: CursorPosition
  referenceKeystrokeCount: number
  description: string
  timeLimit: number
  difficulty: 1 | 2 | 3 | 4 | 5
  targetHighlight?: TargetHighlight
  requiredCommands?: string[]
  optimalSolutions?: ChallengeSolution[]
}

export interface ChallengeResult {
  templateId: string
  snippetId: string
  completedAt: number
  timeSeconds: number
  keystrokeCount: number
  referenceKeystrokeCount: number
  efficiencyScore: number
  speedScore: number
  totalScore: number
  timedOut: boolean
  keyLog?: string[]
}

export interface ChallengeTemplate {
  id: string
  type: 'delete' | 'change' | 'move' | 'yank-paste' | 'search' | 'multi-step'
  title: string
  description: string
  difficulty: 1 | 2 | 3 | 4 | 5
  requiredCommands: string[]
  timeLimitSeconds: number
  generateChallenge: (snippet: CodeSnippet, seed: number) => GeneratedChallenge | null
}
