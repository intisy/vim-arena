import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

{
  const file = join(root, 'packages/shared/src/supabase.types.ts')
  let c = readFileSync(file, 'utf-8')
  
  // brute force add replay_data everywhere in challenge_results Row, Insert, Update
  c = c.replace(/timed_out: boolean/g, 'timed_out: boolean\n          replay_data: any | null')
  c = c.replace(/timed_out\?: boolean/g, 'timed_out?: boolean\n          replay_data?: any | null')
  
  // brute force add the RPCs to Functions
  const rpcs = `
      clear_solo_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_lesson_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_all_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
`
  if (!c.includes('clear_solo_data')) {
    c = c.replace('Functions: {', 'Functions: {' + rpcs)
  }
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}

{
  const file = join(root, 'packages/client/src/pages/StatsPage.tsx')
  let c = readFileSync(file, 'utf-8')
  
  // Add missing icons to the import
  c = c.replace(
    '  AlignLeft, Trophy, Eye, Play, Pause, SkipBack, SkipForward, X, Clock,',
    '  AlignLeft, Trophy, Eye, Play, Pause, SkipBack, SkipForward, X, Clock,'
  )
  // The earlier replace might have failed. Let's do a more robust one.
  c = c.replace(
    "import { useEffect, useState, useRef } from 'react'",
    "import React, { useEffect, useState, useRef } from 'react'"
  )
  
  if (!c.includes('Play,')) {
    c = c.replace(
      '  AlignLeft, Trophy, Eye,',
      '  AlignLeft, Trophy, Eye, Play, Pause, SkipBack, SkipForward, X, Clock,'
    )
  }
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
