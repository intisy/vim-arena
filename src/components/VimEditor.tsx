import { forwardRef, useImperativeHandle, useRef, useCallback, useState, useMemo, useEffect } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
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

const setTargetPos = StateEffect.define<number | null>()

const targetMark = Decoration.mark({ class: 'cm-target-cursor' })

const targetField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decos, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTargetPos)) {
        if (effect.value === null) return Decoration.none
        const pos = effect.value
        if (pos < 0 || pos >= tr.state.doc.length) return Decoration.none
        return Decoration.set([targetMark.range(pos, pos + 1)])
      }
    }
    return decos
  },
  provide: (f) => EditorView.decorations.from(f),
})

const preventMouseSelection = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (!view.hasFocus) {
      view.focus()
    }
    event.preventDefault()
    return true
  },
})

export const VimEditor = forwardRef<VimEditorRef, VimEditorProps>(function VimEditor(
  {
    initialContent,
    initialCursor,
    targetCursor,
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

  useEffect(() => {
    const view = cmRef.current?.view
    if (!view) return

    if (!targetCursor) {
      view.dispatch({ effects: setTargetPos.of(null) })
      return
    }

    const lineCount = view.state.doc.lines
    const lineNum = Math.min(targetCursor.line + 1, lineCount)
    const line = view.state.doc.line(lineNum)
    const pos = Math.min(line.from + targetCursor.column, line.to)
    view.dispatch({ effects: setTargetPos.of(pos) })
  }, [targetCursor])

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
    () => [vim(), getLangExtension(language), stateTracker, targetField, preventMouseSelection],
    [language, stateTracker],
  )

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', fontFamily: 'monospace' }}
      onKeyDown={handleKeyDown}
    >
      <style>{`
        .cm-target-cursor {
          background-color: rgba(80, 250, 123, 0.35);
          border: 1px solid #50fa7b;
          border-radius: 2px;
          position: relative;
        }
        .cm-editor {
          background-color: #1e1f29 !important;
        }
        .cm-editor .cm-gutters {
          background-color: #1e1f29 !important;
          border-right: 1px solid #333 !important;
          color: #6272a4 !important;
        }
        .cm-editor .cm-activeLineGutter {
          background-color: #282a36 !important;
        }
        .cm-editor .cm-activeLine {
          background-color: rgba(68, 71, 90, 0.3) !important;
        }
        .cm-editor .cm-content {
          caret-color: #f8f8f2 !important;
        }
        .cm-editor .cm-cursor {
          border-left-color: #f8f8f2 !important;
        }
        .cm-editor .cm-selectionBackground {
          background-color: rgba(98, 114, 164, 0.4) !important;
        }
        .cm-fat-cursor .cm-cursor {
          background-color: rgba(248, 248, 242, 0.7) !important;
          border: none !important;
        }
      `}</style>
      <ReactCodeMirror
        ref={cmRef}
        value={initialContent}
        height={height}
        extensions={extensions}
        onCreateEditor={handleEditorCreate}
        readOnly={readOnly}
        theme="dark"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
        }}
        style={{
          fontSize: '14px',
        }}
      />
      <div
        aria-label={`Vim mode: ${mode}`}
        data-testid="vim-mode-indicator"
        style={{
          padding: '4px 12px',
          fontSize: '12px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          backgroundColor: '#1e1f29',
          color:
            mode === 'insert'
              ? '#ffb86c'
              : mode.startsWith('visual')
                ? '#bd93f9'
                : '#50fa7b',
          borderTop: '1px solid #333',
          userSelect: 'none',
        }}
      >
        {MODE_LABELS[mode]}
      </div>
    </div>
  )
})
