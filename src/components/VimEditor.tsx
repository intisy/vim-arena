import { forwardRef, useImperativeHandle, useRef, useCallback, useState, useMemo } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { vim } from '@replit/codemirror-vim'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import type { VimEditorProps, VimMode, EditorState as VimEditorState } from '@/types/editor'

function getLangExtension(lang: VimEditorProps['language']) {
  switch (lang) {
    case 'javascript': return javascript()
    case 'typescript': return javascript({ typescript: true })
    case 'python': return python()
    default: return []
  }
}

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
  focus: () => void
}

function getEditorState(view: EditorView): VimEditorState {
  const sel = view.state.selection.main
  const line = view.state.doc.lineAt(sel.head)
  return {
    content: view.state.doc.toString(),
    cursorLine: line.number - 1,
    cursorColumn: sel.head - line.from,
  }
}

function applyCursor(view: EditorView, cursor?: { line: number; column: number }) {
  if (!cursor) return
  const lineCount = view.state.doc.lines
  const lineNum = Math.min(cursor.line + 1, lineCount)
  const line = view.state.doc.line(lineNum)
  const pos = Math.min(line.from + cursor.column, line.to)
  view.dispatch({ selection: { anchor: pos } })
}

export const VimEditor = forwardRef<VimEditorRef, VimEditorProps>(function VimEditor(
  {
    initialContent,
    initialCursor,
    language = 'javascript',
    readOnly = false,
    height = '400px',
    onStateChange,
    onModeChange,
    onKeystroke,
    className,
  },
  ref,
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null)
  const [mode, setMode] = useState<VimMode>('normal')
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange

  const stateTracker = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) {
          onStateChangeRef.current?.(getEditorState(update.view))
        }
      }),
    [],
  )

  const handleEditorCreate = useCallback(
    (view: EditorView) => {
      requestAnimationFrame(() => {
        applyCursor(view, initialCursor)
        view.focus()
      })

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
        setMode(vimMode)
        onModeChange?.(vimMode)
      })
    },
    [onModeChange, initialCursor],
  )

  const handleKeyDown = useCallback(() => {
    onKeystroke?.()
  }, [onKeystroke])

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        const view = cmRef.current?.view
        if (!view) return
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: initialContent },
        })
        requestAnimationFrame(() => applyCursor(view, initialCursor))
      },
      focus: () => {
        const view = cmRef.current?.view
        if (view) requestAnimationFrame(() => view.focus())
      },
      getState: () => {
        const view = cmRef.current?.view
        if (!view) return { content: initialContent, cursorLine: 0, cursorColumn: 0 }
        return getEditorState(view)
      },
    }),
    [initialContent, initialCursor],
  )

  const extensions = useMemo(
    () => [vim(), getLangExtension(language), stateTracker],
    [language, stateTracker],
  )

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
        theme="dark"
        style={{
          fontSize: '14px',
          border: '1px solid var(--theme-border, #333)',
        }}
      />
      <div
        aria-label={`Vim mode: ${mode}`}
        data-testid="vim-mode-indicator"
        style={{
          padding: '2px 8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          backgroundColor: 'var(--theme-editor-gutter, #0a1a0a)',
          color:
            mode === 'insert'
              ? 'var(--theme-warning, #ffaa00)'
              : mode.startsWith('visual')
                ? 'var(--theme-accent, #39ff14)'
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
