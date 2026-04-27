import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

// Update useChallengeEngine.ts
{
  const file = join(root, 'packages/client/src/hooks/useChallengeEngine.ts')
  let c = readFileSync(file, 'utf-8')
  
  // 1. Add replay snapshots ref
  c = c.replace(
    '  const countdownDurationRef = useRef(countdownDuration)',
    '  const countdownDurationRef = useRef(countdownDuration)\n  const replaySnapshotsRef = useRef<any[]>([])\n  const startTimeRef = useRef<number>(0)'
  )
  
  // 2. Pass p_countdown_duration to start_solo_challenge
  c = c.replace(
    'p_time_limit: ch.timeLimit,',
    'p_time_limit: ch.timeLimit,\n        p_countdown_duration: countdownDurationRef.current,'
  )
  
  // 3. Reset snapshots on launchChallenge
  c = c.replace(
    '    setElapsed(0)\n    setKeystrokes(0)',
    '    setElapsed(0)\n    setKeystrokes(0)\n    replaySnapshotsRef.current = []\n    startTimeRef.current = 0'
  )
  
  // 4. Set startTime when engine starts
  c = c.replace(
    '        engineRef.current = engine\n        engine.start()',
    '        engineRef.current = engine\n        engine.start()\n        startTimeRef.current = Date.now()'
  )
  
  // 5. Record snapshots in handleEditorStateChange
  c = c.replace(
    '    const res = engineRef.current.validateCompletion(state)',
    `    const now = Date.now()
    if (startTimeRef.current > 0) {
      const elapsedSec = (now - startTimeRef.current) / 1000
      // Record snapshot if it's the first one, or if it changed
      const lastSnap = replaySnapshotsRef.current[replaySnapshotsRef.current.length - 1]
      if (!lastSnap || lastSnap.c !== state.content || lastSnap.l !== state.cursorLine || lastSnap.col !== state.cursorColumn) {
        replaySnapshotsRef.current.push({
          t: parseFloat(elapsedSec.toFixed(2)),
          c: state.content,
          l: state.cursorLine,
          col: state.cursorColumn
        })
      }
    }
    const res = engineRef.current.validateCompletion(state)`
  )
  
  // 6. Pass p_replay_data to submit_solo_result
  c = c.replace(
    'p_challenge_id: challengeIdRef.current,',
    'p_challenge_id: challengeIdRef.current,\n        p_replay_data: replaySnapshotsRef.current.length > 0 ? JSON.stringify(replaySnapshotsRef.current) : null,'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}

// Update useSettings.ts
{
  const file = join(root, 'packages/client/src/hooks/useSettings.ts')
  let c = readFileSync(file, 'utf-8')
  
  // Add supabase import
  c = c.replace(
    "import { useState, useCallback, useEffect, useMemo } from 'react'",
    "import { useState, useCallback, useEffect, useMemo } from 'react'\nimport { supabase } from '@/lib/supabase'"
  )
  
  // Modify clearChallengeHistory
  c = c.replace(
    /const clearChallengeHistory = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\)/,
    `const clearChallengeHistory = useCallback(async () => {
    localStorage.removeItem('vim-arena-elo')
    localStorage.removeItem('vim-arena-stats')
    localStorage.removeItem('vim-arena-challenge-stats')
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await supabase.rpc('clear_solo_data')
    window.location.reload()
  }, [])`
  )
  
  // Modify clearLessonProgress
  c = c.replace(
    /const clearLessonProgress = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\)/,
    `const clearLessonProgress = useCallback(async () => {
    localStorage.removeItem('vim-arena-lesson-progress')
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await supabase.rpc('clear_lesson_data')
    window.location.reload()
  }, [])`
  )
  
  // Modify clearAllData
  c = c.replace(
    /const clearAllData = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\)/,
    `const clearAllData = useCallback(async () => {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('vim-arena')) {
        keys.push(key)
      }
    }
    keys.forEach(k => localStorage.removeItem(k))
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await supabase.rpc('clear_all_data')
    window.location.reload()
  }, [])`
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}

// Update types/challenge.ts
{
  const file = join(root, 'packages/shared/src/types/challenge.ts')
  let c = readFileSync(file, 'utf-8')
  
  c = c.replace(
    '  keyLog?: string[]\r\n}',
    '  keyLog?: string[]\r\n  replayData?: any\r\n}'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}

console.log('\nAll .tmp files written successfully.')
