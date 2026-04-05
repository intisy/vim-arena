import { forwardRef, useImperativeHandle, useRef, useCallback, useState, useMemo, useEffect } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { EditorView, Decoration, type DecorationSet, lineNumbers as cmLineNumbers } from '@codemirror/view'
import { StateField, StateEffect, Prec, type Range } from '@codemirror/state'
import { vim, getCM, Vim } from '@replit/codemirror-vim'
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
  exitInsertMode: () => void
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

function readVimMode(view: EditorView): VimMode {
  const cm = getCM(view)
  if (!cm) return 'normal'
  const vs = cm.state.vim
  if (!vs) return 'normal'
  if (vs.insertMode) return 'insert'
  if (vs.visualMode) return vs.visualLine ? 'visual-line' : 'visual'
  if (vs.mode === 'replace') return 'replace'
  return 'normal'
}

function applyCursor(view: EditorView, cursor?: { line: number; column: number }) {
  if (!cursor) return
  const lineCount = view.state.doc.lines
  const lineNum = Math.min(cursor.line + 1, lineCount)
  const line = view.state.doc.line(lineNum)
  const pos = Math.min(line.from + cursor.column, line.to)
  view.dispatch({ selection: { anchor: pos } })
}

function cursorToPos(view: EditorView, cursor: { line: number; column: number }): number {
  const lineCount = view.state.doc.lines
  const lineNum = Math.min(cursor.line + 1, lineCount)
  const line = view.state.doc.line(lineNum)
  return Math.min(line.from + cursor.column, line.to)
}

const setTargetEffect = StateEffect.define<Range<Decoration>[] | null>()

const targetMark = Decoration.mark({ class: 'cm-target-cursor' })
const targetRangeMark = Decoration.mark({ class: 'cm-target-range' })

const targetField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decos, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTargetEffect)) {
        if (effect.value === null) return Decoration.none
        return Decoration.set(effect.value, true)
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
    targetRange,
    language = 'javascript',
    readOnly = false,
    height = '400px',
    trapFocus = false,
    strictFilter = false,
    allowedKeys,
    onStateChange,
    onModeChange,
    onKeystroke,
    className,
    fontSize = 14,
    showLineNumbers = true,
    relativeLineNumbers = false,
  },
  ref,
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null)
  const [mode, setMode] = useState<VimMode>('normal')
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange
  const onKeystrokeRef = useRef(onKeystroke)
  onKeystrokeRef.current = onKeystroke
  const allowedKeysRef = useRef(allowedKeys)
  allowedKeysRef.current = allowedKeys
  const strictFilterRef = useRef(strictFilter)
  strictFilterRef.current = strictFilter
  const lastModeRef = useRef<VimMode>('normal')

  const stateTracker = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) {
          onStateChangeRef.current?.(getEditorState(update.view))
        }

        const currentMode = readVimMode(update.view)
        if (currentMode !== lastModeRef.current) {
          lastModeRef.current = currentMode
          setMode(currentMode)
          onModeChangeRef.current?.(currentMode)
        }
      }),
    [],
  )

  const keyFilterAndTracker = useMemo(
    () =>
      Prec.highest(EditorView.domEventHandlers({
        keydown(event, view) {
          if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') return false
          if (event.ctrlKey || event.altKey || event.metaKey) return false

          if (event.key === '^' || event.key === 'Dead') {
            const currentMode = readVimMode(view)
            if (currentMode !== 'insert' && currentMode !== 'replace') {
              const ak = allowedKeysRef.current
              if (ak && !ak.includes('^')) {
                event.preventDefault()
                event.stopPropagation()
                return true
              }
              event.preventDefault()
              event.stopPropagation()
              const cm = getCM(view)
              if (cm) {
                Vim.handleKey(cm as Parameters<typeof Vim.handleKey>[0], '^', 'user')
              }
              onKeystrokeRef.current?.()
              return true
            }
          }

          const keys = allowedKeysRef.current

          if (keys) {
            const cm = getCM(view)
            const vs = cm?.state?.vim
            if (vs) {
              const inp = vs.inputState as { keyBuffer?: string[]; operator?: string | null }
              if ((inp?.keyBuffer && inp.keyBuffer.length > 0) || inp?.operator) {
                onKeystrokeRef.current?.()
                return false
              }
            }

            if (strictFilterRef.current) {
              if (!keys.includes(event.key)) {
                event.preventDefault()
                event.stopPropagation()
                return true
              }
              onKeystrokeRef.current?.()
              return false
            }

            const currentMode = readVimMode(view)
            if (currentMode === 'insert' || currentMode === 'replace') {
              onKeystrokeRef.current?.()
              return false
            }
            if (currentMode === 'visual' || currentMode === 'visual-line') {
              onKeystrokeRef.current?.()
              return false
            }
            if (event.key === 'Escape' || event.key === 'Enter' || event.key === 'Backspace' || event.key === 'Tab') {
              onKeystrokeRef.current?.()
              return false
            }
            if (event.key.startsWith('Arrow')) {
              onKeystrokeRef.current?.()
              return false
            }
            if (!keys.includes(event.key)) {
              event.preventDefault()
              event.stopPropagation()
              return true
            }
          }

          onKeystrokeRef.current?.()
          return false
        },
      })),
    [],
  )

  const relativeLineNumbersExt = useMemo(() => {
    if (!relativeLineNumbers || !showLineNumbers) return []
    return [cmLineNumbers({
      formatNumber: (lineNo, state) => {
        const cursorLine = state.doc.lineAt(state.selection.main.head).number
        if (lineNo === cursorLine) return String(lineNo)
        return String(Math.abs(lineNo - cursorLine))
      },
    })]
  }, [relativeLineNumbers, showLineNumbers])

  const dispatchTargets = useCallback((view: EditorView) => {
    const decorations: Range<Decoration>[] = []

    if (targetCursor) {
      const pos = cursorToPos(view, targetCursor)
      if (pos >= 0 && pos < view.state.doc.length) {
        decorations.push(targetMark.range(pos, pos + 1))
      }
    }

    if (targetRange) {
      const from = cursorToPos(view, { line: targetRange.fromLine, column: targetRange.fromCol })
      const to = cursorToPos(view, { line: targetRange.toLine, column: targetRange.toCol })
      if (from < to && from >= 0 && to <= view.state.doc.length) {
        decorations.push(targetRangeMark.range(from, to))
      }
    }

    view.dispatch({
      effects: setTargetEffect.of(decorations.length > 0 ? decorations : null),
    })
  }, [targetCursor, targetRange])

  useEffect(() => {
    const view = cmRef.current?.view
    if (!view) return
    dispatchTargets(view)
  }, [dispatchTargets])

  useEffect(() => {
    if (!trapFocus) return
    const view = cmRef.current?.view
    if (!view) return

    const handleBlur = () => {
      requestAnimationFrame(() => {
        if (cmRef.current?.view) {
          cmRef.current.view.focus()
        }
      })
    }

    view.dom.addEventListener('blur', handleBlur, true)
    return () => {
      view.dom.removeEventListener('blur', handleBlur, true)
    }
  }, [trapFocus])

  const handleEditorCreate = useCallback(
    (view: EditorView) => {
      requestAnimationFrame(() => {
        applyCursor(view, initialCursor)
        view.focus()
        dispatchTargets(view)
      })

      if (trapFocus) {
        const handleBlur = () => {
          requestAnimationFrame(() => view.focus())
        }
        view.dom.addEventListener('blur', handleBlur, true)
      }
    },
    [initialCursor, dispatchTargets, trapFocus],
  )

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        const view = cmRef.current?.view
        if (!view) return
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: initialContent },
        })
        requestAnimationFrame(() => {
          applyCursor(view, initialCursor)
          dispatchTargets(view)
        })
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
      exitInsertMode: () => {
        const view = cmRef.current?.view
        if (!view) return
        const cm = getCM(view)
        if (!cm) return
        const vs = cm.state.vim
        if (vs?.insertMode) {
          Vim.exitInsertMode(cm as Parameters<typeof Vim.exitInsertMode>[0])
        }
        if (vs?.visualMode) {
          Vim.exitVisualMode(cm as Parameters<typeof Vim.exitVisualMode>[0])
        }
        lastModeRef.current = 'normal'
        setMode('normal')
        onModeChangeRef.current?.('normal')
      },
    }),
    [initialContent, initialCursor, dispatchTargets],
  )

  const extensions = useMemo(
    () => [vim(), getLangExtension(language), stateTracker, targetField, preventMouseSelection, keyFilterAndTracker, ...relativeLineNumbersExt],
    [language, stateTracker, keyFilterAndTracker, relativeLineNumbersExt],
  )

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', fontFamily: 'monospace' }}
    >
      <style>{`
        .cm-target-cursor {
          background-color: rgba(80, 250, 123, 0.35);
          border: 1px solid #50fa7b;
          border-radius: 2px;
          position: relative;
        }
        .cm-target-range {
          background-color: rgba(255, 184, 108, 0.25);
          border-bottom: 2px solid #ffb86c;
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
          lineNumbers: showLineNumbers && !relativeLineNumbers,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
        }}
        style={{
          fontSize: `${fontSize}px`,
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
                : mode === 'replace'
                  ? '#ff5555'
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
