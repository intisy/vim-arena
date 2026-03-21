type CursorPosition = { line: number; column: number }

export interface CodeSnippet {
  id: string
  content: string
  language: 'javascript' | 'typescript' | 'python' | 'plaintext'
  lineCount: number
  tags: string[]               // e.g. ['function', 'arrow', 'class'] for filtering
}

export interface GeneratedChallenge {
  templateId: string
  snippetId: string
  initialContent: string
  initialCursor: CursorPosition
  expectedContent: string
  expectedCursor?: CursorPosition
  referenceKeystrokeCount: number  // optimal keystroke count for the reference solution
  description: string              // human-readable task, e.g. "Delete the word at the cursor"
  timeLimit: number                // seconds allowed to complete
  difficulty: 1 | 2 | 3 | 4 | 5
}

export interface ChallengeResult {
  templateId: string
  snippetId: string
  completedAt: number              // Unix timestamp
  timeSeconds: number              // actual time taken
  keystrokeCount: number           // actual keystrokes used
  referenceKeystrokeCount: number
  efficiencyScore: number          // 0-100
  speedScore: number               // 0-100
  totalScore: number               // 0-100 (weighted combination)
  timedOut: boolean
}

export interface ChallengeTemplate {
  id: string
  type: 'delete' | 'change' | 'move' | 'yank-paste' | 'search' | 'multi-step'
  title: string
  description: string
  difficulty: 1 | 2 | 3 | 4 | 5
  requiredCommands: string[]
  timeLimitSeconds: number
  /**
   * Generates a concrete challenge from a code snippet.
   * Returns null if the snippet is not suitable for this template.
   */
  generateChallenge: (snippet: CodeSnippet, seed: number) => GeneratedChallenge | null
}
