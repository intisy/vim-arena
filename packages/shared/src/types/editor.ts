export interface EditorState {
  content: string
  cursorLine: number
  cursorColumn: number
}

export type VimMode = 'normal' | 'insert' | 'visual' | 'visual-line' | 'replace'

export interface TargetRange {
  fromLine: number
  fromCol: number
  toLine: number
  toCol: number
}

export interface VimEditorProps {
  initialContent: string
  initialCursor?: { line: number; column: number }
  targetCursor?: { line: number; column: number }
  targetRange?: TargetRange
  language?: 'javascript' | 'typescript' | 'python' | 'plaintext'
  readOnly?: boolean
  height?: string
  trapFocus?: boolean
  strictFilter?: boolean
  allowedKeys?: string[]
  onStateChange?: (state: EditorState) => void
  onModeChange?: (mode: VimMode) => void
  onKeystroke?: () => void
  className?: string
  fontSize?: number
  showLineNumbers?: boolean
  relativeLineNumbers?: boolean
}
