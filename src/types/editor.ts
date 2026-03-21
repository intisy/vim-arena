export interface EditorState {
  content: string
  cursorLine: number    // 0-based line number
  cursorColumn: number  // 0-based column
}

export type VimMode = 'normal' | 'insert' | 'visual' | 'visual-line' | 'replace'

export interface VimEditorProps {
  initialContent: string
  initialCursor?: { line: number; column: number }
  targetCursor?: { line: number; column: number }
  language?: 'javascript' | 'typescript' | 'python' | 'plaintext'
  readOnly?: boolean
  height?: string
  onStateChange?: (state: EditorState) => void
  onModeChange?: (mode: VimMode) => void
  onKeystroke?: () => void
  className?: string
}
