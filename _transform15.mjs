import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

{
  const file = join(root, 'packages/shared/src/supabase.types.ts')
  let c = readFileSync(file, 'utf-8')
  
  c = c.replace(
    'p_timed_out: boolean\n          replay_data: any | null',
    'p_timed_out: boolean\n          p_replay_data?: any | null'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
