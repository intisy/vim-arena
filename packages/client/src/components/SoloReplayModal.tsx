import { useEffect, useState, useRef, useMemo } from 'react'
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react'
import { CHALLENGE_TEMPLATES } from '@vim-arena/shared'
import type { ReplaySnapshot } from '@vim-arena/shared'

interface SoloReplayModalProps {
  snapshots: ReplaySnapshot[]
  templateId: string
  timeSeconds: number
  keystrokeCount: number
  onClose: () => void
}

export default function SoloReplayModal({
  snapshots,
  templateId,
  timeSeconds,
  keystrokeCount,
  onClose,
}: SoloReplayModalProps) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const animFrameRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)

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
        const next = prev + dt
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
  }, [playing, totalDuration])

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1e1f29] rounded-xl border border-gray-700 shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white">{template?.title || 'Challenge Replay'}</h3>
            <span className="text-xs font-mono text-gray-500">{timeSeconds.toFixed(1)}s • {keystrokeCount} keys</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 p-4 bg-black/50 overflow-auto min-h-[300px]">
          <pre className="font-mono text-sm leading-relaxed text-[#f8f8f2] whitespace-pre">
            {currentState.content || '\n'}
          </pre>
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
          </div>
        </div>
      </div>
    </div>
  )
}
