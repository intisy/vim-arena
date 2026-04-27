import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

{
  const file = join(root, 'packages/client/src/pages/StatsPage.tsx')
  let c = readFileSync(file, 'utf-8')
  
  c = c.replace(
    'AlignLeft, Trophy, Eye,',
    'AlignLeft, Trophy, Eye, Play, Pause, SkipBack, SkipForward, X, Clock,'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
