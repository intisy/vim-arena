import { forwardRef, useImperativeHandle, useRef, useCallback, useState } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import type { EditorView } from '@codemirror/view'
import { vim } from '@replit/codemirror-vim'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import type { VimEditorProps, VimMode, EditorState as VimEditorState } from '@/types/editor'

// Language extension map
function getLangExtension(lang: VimEditorProps['language']) {
  switch (lang) {
    case 'javascript': return javascript()
    case 'typescript': return javascript({ typescript: true })
    case 'python': return python()
    default: return []
  }
}

// Mode display strings
const MODE_LABELS: Record<VimMode, string> = {
  normal: '-- NORMAL --',
  insert: '-- INSERT --',
  visual: '-- VISUAL --',
  'visual-line': '-- VISUAL LINE --',
  replace: '-- REPLACE --',
}

export interface VimEditorRef {
  reset: () => void
  getState: () => VimEditorState
}

export const VimEditor = forwardRef<VimEditorRef, VimEditorProps>(function VimEditor(
  {
    initialContent,
    language = 'javascript',
    readOnly = false,
    height = '400px',
    onStateChange,
    onModeChange,
    onKeystroke,
    className,
  },
  ref
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null)
  const modeRef = useRef<VimMode>('normal')
  const [mode, setMode] = useState<VimMode>('normal')

  // Listen for vim-mode-change events emitted by @replit/codemirror-vim
  const handleEditorCreate = useCallback((view: EditorView) => {
    view.dom.addEventListener('vim-mode-change', (e: Event) => {
      const detail = (e as CustomEvent<{ mode: string; subMode?: string }>).detail
      const rawMode = detail?.mode ?? 'normal'
      const vimMode: VimMode =
        rawMode === 'visual'
          ? detail?.subMode === 'linewise'
            ? 'visual-line'
            : 'visual'
          : rawMode === 'insert'
          ? 'insert'
          : rawMode === 'replace'
          ? 'replace'
          : 'normal'
      modeRef.current = vimMode
      setMode(vimMode)
      onModeChange?.(vimMode)
    })
  }, [onModeChange])

  // Handle state changes from CodeMirror
  const handleChange = useCallback((value: string) => {
    const view = cmRef.current?.view
    if (!view) return
    const cmState = view.state
    const selection = cmState.selection.main
    const line = cmState.doc.lineAt(selection.head)
    const editorState: VimEditorState = {
      content: value,
      cursorLine: line.number - 1,  // 0-based
      cursorColumn: selection.head - line.from,
    }
    onStateChange?.(editorState)
  }, [onStateChange])

  // Keystroke tracking via keydown on the editor wrapper
  const handleKeyDown = useCallback(() => {
    onKeystroke?.()
  }, [onKeystroke])

  useImperativeHandle(ref, () => ({
    reset: () => {
      const view = cmRef.current?.view
      if (!view) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: initialContent }
      })
    },
    getState: () => {
      const view = cmRef.current?.view
      if (!view) return { content: initialContent, cursorLine: 0, cursorColumn: 0 }
      const cmState = view.state
      const selection = cmState.selection.main
      const line = cmState.doc.lineAt(selection.head)
      return {
        content: view.state.doc.toString(),
        cursorLine: line.number - 1,
        cursorColumn: selection.head - line.from,
      }
    }
  }), [initialContent])

  const extensions = [vim(), getLangExtension(language)]

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', fontFamily: 'monospace' }}
      onKeyDown={handleKeyDown}
    >
      <ReactCodeMirror
        ref={cmRef}
        value={initialContent}
        height={height}
        extensions={extensions}
        readOnly={readOnly}
        onChange={handleChange}
        onCreateEditor={handleEditorCreate}
        theme="dark"
        style={{
          fontSize: '14px',
          border: '1px solid var(--theme-border, #333)',
        }}
      />
      {/* Mode indicator */}
      <div
        aria-label={`Vim mode: ${mode}`}
        data-testid="vim-mode-indicator"
        style={{
          padding: '2px 8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          backgroundColor: 'var(--theme-editor-gutter, #0a1a0a)',
          color: mode === 'insert' ? 'var(--theme-warning, #ffaa00)'
            : mode.startsWith('visual') ? 'var(--theme-accent, #39ff14)'
            : 'var(--theme-primary, #00ff41)',
          borderTop: '1px solid var(--theme-border, #333)',
          userSelect: 'none',
        }}
      >
        {MODE_LABELS[mode]}
      </div>
    </div>
  )
})
