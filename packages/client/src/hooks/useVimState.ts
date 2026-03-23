import { useEffect, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import type { EditorState, VimMode } from '@/types/editor'

export function useVimState(viewRef: React.RefObject<EditorView | null>) {
  const [mode, setMode] = useState<VimMode>('normal')
  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    cursorLine: 0,
    cursorColumn: 0,
  })

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const handleModeChange = (e: Event) => {
      const detail = (e as CustomEvent<{ mode: string; subMode?: string }>).detail
      const rawMode = detail?.mode ?? 'normal'
      const vimMode: VimMode = rawMode === 'visual'
        ? (detail?.subMode === 'linewise' ? 'visual-line' : 'visual')
        : rawMode === 'insert' ? 'insert'
        : rawMode === 'replace' ? 'replace'
        : 'normal'
      setMode(vimMode)
    }

    view.dom.addEventListener('vim-mode-change', handleModeChange)
    return () => view.dom.removeEventListener('vim-mode-change', handleModeChange)
  }, [viewRef])

  return { mode, editorState, setEditorState }
}
