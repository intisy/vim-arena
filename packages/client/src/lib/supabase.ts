import { createClient } from '@supabase/supabase-js'
import type { Database } from '@vim-arena/shared'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

export const supabase = createClient<Database>(
  supabaseUrl || 'http://placeholder.invalid',
  supabaseAnonKey || 'placeholder-key'
)
