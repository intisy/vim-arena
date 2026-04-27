import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

{
  const file = join(root, 'packages/shared/src/supabase.types.ts')
  let c = readFileSync(file, 'utf-8')
  
  c = c.replace(
    'p_time_limit: number\n        }\n        Returns: Json',
    'p_time_limit: number\n          p_countdown_duration?: number\n        }\n        Returns: Json'
  )
  
  c = c.replace(
    'p_challenge_id?: string\n        }\n        Returns: Json',
    'p_challenge_id?: string\n          p_replay_data?: any\n        }\n        Returns: Json'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
