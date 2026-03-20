import type { LessonCategory } from '@/types/lesson'

export const LESSON_CATEGORIES: LessonCategory[] = [
  { id: 'basic-vim', title: 'Basic Vim', description: 'Master the fundamentals — modes and movement', icon: '🎯', order: 1 },
  { id: 'insert-mode', title: 'Insert Mode', description: 'Enter text like a pro', icon: '✏️', order: 2 },
  { id: 'essential-motions', title: 'Essential Motions', description: 'Navigate with precision', icon: '🏃', order: 3 },
  { id: 'basic-operators', title: 'Basic Operators', description: 'Delete, change, yank — the power trio', icon: '⚡', order: 4 },
  { id: 'vertical-movement', title: 'Vertical Movement', description: 'Jump lines, paragraphs, and pages', icon: '🔝', order: 5 },
  { id: 'search', title: 'Search', description: 'Find anything instantly', icon: '🔍', order: 6 },
  { id: 'text-objects', title: 'Text Objects', description: 'Select and operate on semantic units', icon: '📦', order: 7 },
  { id: 'visual-mode', title: 'Visual Mode', description: 'See what you select', icon: '👁️', order: 8 },
]
