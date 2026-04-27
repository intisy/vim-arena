import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

{
  const file = join(root, 'packages/client/src/pages/StatsPage.tsx')
  let c = readFileSync(file, 'utf-8')
  
  // 1. Add imports
  c = c.replace(
    'import {',
    "import { useState, useRef } from 'react'\nimport {"
  )
  
  c = c.replace(
    '  AlignLeft, Trophy, Eye,',
    '  AlignLeft, Trophy, Eye, Play, Pause, SkipBack, SkipForward, X, Clock,'
  )
  
  // 2. Add useChallengeStats to imports
  c = c.replace(
    "import { useLessonProgress } from '@/hooks/useLessonProgress'",
    "import { useLessonProgress } from '@/hooks/useLessonProgress'\nimport { useChallengeStats } from '@/hooks/useChallengeStats'\nimport { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'\nimport { ALL_SNIPPETS } from '@/data/snippets'\nimport { ChallengeGenerator, SeededRandom } from '@/engine/ChallengeGenerator'\nimport type { ReplaySnapshot } from '@vim-arena/shared'"
  )
  
  // 3. Add ReplayModal component before StatsPage
  const replayModalStr = `
function SoloReplayModal({ result, onClose }: { result: any, onClose: () => void }) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const animFrameRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)

  const template = CHALLENGE_TEMPLATES.find(t => t.id === result.templateId)
  const challenge = React.useMemo(() => {
    if (!template) return null
    // To properly reconstruct initial content we need the exact snippet and seed.
    // Solo replays don't store the exact generated challenge right now, but they store the snippet ID.
    // Wait, we can't easily regenerate without the seed. But replay snapshots have the full content!
    return null
  }, [template])

  const snapshots: ReplaySnapshot[] = result.replayData || []
  const totalDuration = snapshots.length > 0 ? snapshots[snapshots.length - 1].t : 0
  const initialContent = snapshots.length > 0 ? snapshots[0].c : ''

  React.useEffect(() => {
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

  const currentState = React.useMemo(() => {
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
            <span className="text-xs font-mono text-gray-500">{result.timeSeconds.toFixed(1)}s • {result.keystrokeCount} keys</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 p-4 bg-black/50 overflow-auto min-h-[300px]">
          <pre className="font-mono text-sm leading-relaxed text-[#f8f8f2] whitespace-pre">
            {currentState.content || '\\n'}
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
`
  
  c = c.replace(
    'export default function StatsPage() {',
    replayModalStr + '\nexport default function StatsPage() {'
  )

  // 4. Hook up recentResults and render list
  c = c.replace(
    'const { userStats } = useUserStats()',
    'const { userStats } = useUserStats()\n  const { recentResults } = useChallengeStats()\n  const [activeReplay, setActiveReplay] = useState<any>(null)'
  )

  const recentHistorySection = `
      <div className="mb-8 glass-card glow-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-[var(--theme-foreground)] mb-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
            <Clock size={16} className="text-[var(--theme-primary)]" />
          </div>
          Recent Challenge History
        </h2>
        
        {recentResults.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--theme-muted-foreground)]">
            No recent challenges found. Complete some challenges to see them here!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentResults.map((result, i) => {
              const template = CHALLENGE_TEMPLATES.find(t => t.id === result.templateId)
              return (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-primary)]/50 transition-colors">
                  <div>
                    <div className="font-bold text-[var(--theme-foreground)] mb-1">
                      {template?.title || 'Unknown Challenge'}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--theme-muted-foreground)] font-mono">
                      <span className={result.totalScore >= 50 ? 'text-[var(--theme-success)]' : 'text-[var(--theme-error)]'}>
                        {result.totalScore} pts
                      </span>
                      <span>{result.timeSeconds.toFixed(1)}s</span>
                      <span>{result.keystrokeCount} keys</span>
                      <span>{new Date(result.completedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {result.replayData && result.replayData.length > 0 && (
                    <button
                      onClick={() => setActiveReplay(result)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--theme-muted)] text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] hover:bg-[var(--theme-border)] transition-colors border border-[var(--theme-border)]"
                    >
                      <Eye size={14} />
                      Replay
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {activeReplay && (
        <SoloReplayModal result={activeReplay} onClose={() => setActiveReplay(null)} />
      )}
`

  // Insert before the closing </div> of StatsPage
  c = c.replace(
    '    </div>\n  )\n}',
    recentHistorySection + '\n    </div>\n  )\n}'
  )

  // 5. Fix import of React in StatsPage since SoloReplayModal uses React.useMemo
  c = c.replace(
    "import { useEffect } from 'react'",
    "import React, { useEffect } from 'react'"
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
