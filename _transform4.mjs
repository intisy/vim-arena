import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

// Update types/challenge.ts
{
  const file = join(root, 'packages/shared/src/types/challenge.ts')
  let c = readFileSync(file, 'utf-8')
  
  c = c.replace(
    '  timedOut: boolean\r\n  keyLog?: string[]\r\n}',
    '  timedOut: boolean\r\n  keyLog?: string[]\r\n  replayData?: any\r\n}'
  )
  // try LF as well just in case
  c = c.replace(
    '  timedOut: boolean\n  keyLog?: string[]\n}',
    '  timedOut: boolean\n  keyLog?: string[]\n  replayData?: any\n}'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
