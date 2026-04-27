import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

// Update useChallengeStats.ts to include replay_data
{
  const file = join(root, 'packages/client/src/hooks/useChallengeStats.ts')
  let c = readFileSync(file, 'utf-8')
  
  c = c.replace(
    '        timedOut: r.timed_out,\n      }))',
    '        timedOut: r.timed_out,\n        replayData: r.replay_data\n      }))'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
