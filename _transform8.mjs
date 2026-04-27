import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

{
  const file = join(root, 'packages/client/src/pages/PvPPage.tsx')
  let c = readFileSync(file, 'utf-8')
  
  c = c.replace(
    '<span>{new Date(match.startedAt).toLocaleDateString()}</span>',
    '<span>{new Date(match.startedAt).toLocaleString()}</span>'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
