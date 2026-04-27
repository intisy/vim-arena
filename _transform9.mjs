import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

// 1. Fix supabase.types.ts
{
  const file = join(root, 'packages/shared/src/supabase.types.ts')
  let c = readFileSync(file, 'utf-8')
  
  // Add replay_data to challenge_results
  c = c.replace(
    '          timed_out: boolean\n        }\n        Insert: {',
    '          timed_out: boolean\n          replay_data?: any\n        }\n        Insert: {'
  )
  c = c.replace(
    '          timed_out?: boolean\n        }\n        Update: {',
    '          timed_out?: boolean\n          replay_data?: any\n        }\n        Update: {'
  )
  c = c.replace(
    '          timed_out?: boolean\n        }\n        Relationships: [',
    '          timed_out?: boolean\n          replay_data?: any\n        }\n        Relationships: ['
  )
  
  // Add RPCs
  if (!c.includes('clear_solo_data')) {
    c = c.replace(
      '      record_lesson_completed: {\n        Args: {\n          p_lesson_id: string\n        }\n        Returns: undefined\n      }',
      `      record_lesson_completed: {
        Args: {
          p_lesson_id: string
        }
        Returns: undefined
      }
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
      }`
    )
  }
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
