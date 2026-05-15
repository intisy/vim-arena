import { useRef, useEffect, useState, useMemo } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Timer } from 'lucide-react'
import type { ReplaySnapshot } from '@vim-arena/shared'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import ReactCodeMirror from '@uiw/react-codemirror'
import { EditorView, Decoration } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'

const setCursorEffect = StateEffect.define<number | null>()
const cursorMark = Decoration.mark({ class: 'cm-replay-cursor' })
const cursorField = StateField.define({
  create() { return Decoration.none },
  update(decos, tr) {
    for (const e of tr.effects) {
      if (e.is(setCursorEffect)) {
        if (e.value === null) return Decoration.none
        return Decoration.set(cursorMark.range(e.value, Math.min(e.value + 1, tr.state.doc.length)))
      }
    }
    return decos
  },
  provide: f => EditorView.decorations.from(f)
})

interface SoloReplayModalProps {
  snapshots: ReplaySnapshot[]
  templateId: string
  timeSeconds: number
  keystrokeCount: number
  onClose: () => void
}

export function SoloReplayModal({ snapshots, templateId, timeSeconds, keystrokeCount, onClose }: SoloReplayModalProps) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const animFrameRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)
  const cmRef = useRef<any>(null)

  const template = CHALLENGE_TEMPLATES.find(t => t.id === templateId)
  const totalDuration = snapshots.length > 0 ? snapshots[snapshots.length - 1].t : 0

  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      return
    }
    lastTickRef.current = performance.now()
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setCurrentTime(prev => {
        const next = prev + dt * speed
        if (next >= totalDuration) {
          setPlaying(false)
          return totalDuration
        }
        return next
      })
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [playing, speed, totalDuration])

  const currentState = useMemo(() => {
    if (snapshots.length === 0) return { content: '', line: 0, col: 0 }
    if (currentTime <= 0) return { content: snapshots[0].c, line: snapshots[0].l, col: snapshots[0].col }
    let best = snapshots[0]
    for (const snap of snapshots) {
      if (snap.t <= currentTime) best = snap
      else break
    }
    return { content: best.c, line: best.l, col: best.col }
  }, [snapshots, currentTime])

  useEffect(() => {
    const view = cmRef.current?.view
    if (!view) return
    try {
      const lineCount = view.state.doc.lines
      const lineNum = Math.min(currentState.line + 1, lineCount)
      const line = view.state.doc.line(lineNum)
      const pos = Math.min(line.from + currentState.col, line.to)
      view.dispatch({ effects: setCursorEffect.of(pos) })
    } catch(e) {}
  }, [currentState])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <style>{`
        .cm-replay-cursor {
          background-color: rgba(248, 248, 242, 0.8);
          color: #282a36 !important;
        }
        .cm-editor { background-color: #1e1f29 !important; height: 100%; }
        .cm-gutters { background-color: #1e1f29 !important; border-right: 1px solid #333 !important; color: #6272a4 !important; }
      `}</style>
      <div className="bg-[#1e1f29] rounded-xl border border-gray-700 shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white">{template?.title || 'Challenge Replay'}</h3>
            <span className="text-xs font-mono text-gray-500">{timeSeconds.toFixed(1)}s • {keystrokeCount} keys</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden min-h-[300px] relative bg-[#1e1f29]">
          <ReactCodeMirror
            ref={cmRef}
            value={currentState.content}
            theme="dark"
            readOnly={true}
            extensions={[javascript(), cursorField]}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: false,
              foldGutter: false,
              dropCursor: false,
            }}
            height="100%"
            style={{ height: '100%', fontSize: '14px', fontFamily: 'monospace', position: 'absolute', inset: 0 }}
          />
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-500 w-12 text-right">{currentTime.toFixed(1)}</span>
            <input
              type="range"
              min="0"
              max={totalDuration}
              step="0.05"
              value={currentTime}
              onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gray-700"
            />
            <span className="text-xs font-mono text-gray-500 w-12">{totalDuration.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { setCurrentTime(0); setPlaying(true) }} className="p-2 text-gray-400 hover:text-white">
              <SkipBack size={18} />
            </button>
            <button onClick={() => setPlaying(p => !p)} className="p-3 bg-green-600 text-white rounded-full hover:bg-green-500">
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={() => { setCurrentTime(totalDuration); setPlaying(false) }} className="p-2 text-gray-400 hover:text-white">
              <SkipForward size={18} />
            </button>
            <div className="flex items-center gap-1 ml-6 border-l border-gray-800 pl-6">
              <Timer size={14} className="text-gray-500" />
              {[0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-1 text-xs font-mono rounded ${speed === s
                    ? 'bg-gray-700 text-white font-bold'
                    : 'text-gray-500 hover:text-gray-300'
                  } transition-colors`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SoloReplayModal
