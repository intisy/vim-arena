import type { CodeSnippet } from '@/types/challenge'
import { JAVASCRIPT_SNIPPETS } from './javascript'
import { TYPESCRIPT_SNIPPETS } from './typescript'

export { JAVASCRIPT_SNIPPETS } from './javascript'
export { TYPESCRIPT_SNIPPETS } from './typescript'

export const ALL_SNIPPETS: CodeSnippet[] = [
  ...JAVASCRIPT_SNIPPETS,
  ...TYPESCRIPT_SNIPPETS,
]
