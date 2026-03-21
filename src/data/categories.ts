import type { LessonCategory } from '@/types/lesson'

export const LESSON_CATEGORIES: LessonCategory[] = [
  { id: 'basic-vim', title: 'Basic Vim', description: 'Master the fundamentals — modes and movement', icon: 'Target', order: 1 },
  { id: 'insert-like-a-pro', title: 'Insert Like a Pro', description: 'Advanced insertion techniques', icon: 'Pencil', order: 2 },
  { id: 'essential-motions', title: 'Essential Motions', description: 'Navigate with precision', icon: 'Move', order: 3 },
  { id: 'basic-operators', title: 'Basic Operators', description: 'Delete, change, yank — the power trio', icon: 'Zap', order: 4 },
  { id: 'advanced-vertical-movement', title: 'Advanced Vertical Movement', description: 'Jump lines, paragraphs, and pages', icon: 'ChevronsUp', order: 5 },
  { id: 'search', title: 'Search', description: 'Find anything instantly', icon: 'Search', order: 6 },
  { id: 'text-objects-brackets', title: 'Text Objects - Bracket Pairs', description: 'Operate inside and around brackets', icon: 'Braces', order: 7 },
  { id: 'text-objects-quotes', title: 'Text Objects - Quotes', description: 'Operate inside and around quotes', icon: 'Quote', order: 8 },
  { id: 'text-objects-words', title: 'Text Objects - Words', description: 'Operate on word boundaries', icon: 'Type', order: 9 },
  { id: 'text-objects-paragraphs', title: 'Text Objects - Paragraphs', description: 'Operate on paragraph blocks', icon: 'AlignLeft', order: 10 },
  { id: 'text-objects-mega-review', title: 'Text Objects - Mega Review', description: 'Put all text objects to the test', icon: 'Trophy', order: 11 },
  { id: 'visual-mode', title: 'Visual Mode', description: 'See what you select', icon: 'Eye', order: 12 },
]
