export interface LessonStep {
  id: string
  instruction: string           // Markdown-formatted instruction (bold with **, code with `, kbd shortcuts)
  initialContent: string        // Starting content for the editor
  initialCursor: { line: number; column: number }  // 0-based
  expectedContent?: string      // If undefined, any content is accepted (cursor-only challenge)
  expectedCursor?: { line: number; column: number } // If undefined, any cursor position accepted
  hints: string[]               // Progressive hints: hint[0] after 3 fails, hint[1] after 6, etc.
  requiredCommands: string[]    // e.g. ['dd', 'j', 'k'] — must ALL be in SUPPORTED_VIM_COMMANDS
  successMessage?: string       // Optional custom success message (default: "✓ Correct!")
}

export interface Lesson {
  id: string                    // kebab-case, e.g. 'basic-movement-hjkl'
  categoryId: string            // matches a LessonCategory.id
  title: string
  description: string           // 1-2 sentence description for lesson card
  order: number                 // sort order within category (1-based)
  steps: LessonStep[]
  prerequisiteIds: string[]     // lesson IDs that must be completed first (empty = always unlocked)
}

export interface LessonCategory {
  id: string                    // kebab-case, e.g. 'basic-vim'
  title: string                 // Display name, e.g. 'Basic Vim'
  description: string           // 1-2 sentence description
  icon: string                  // emoji
  order: number                 // sort order (1-based)
}
