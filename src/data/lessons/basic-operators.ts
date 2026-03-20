import type { Lesson, LessonStep } from '@/types/lesson'

function step(id: string, instruction: string, content: string, requiredCommands: string[]): LessonStep {
  return {
    id,
    instruction,
    initialContent: content,
    initialCursor: { line: 0, column: 0 },
    expectedContent: undefined,
    expectedCursor: undefined,
    hints: ['Use operator plus motion when needed.', 'Keep actions in Normal mode.'],
    requiredCommands,
  }
}

export const BASIC_OPERATORS_LESSONS: Lesson[] = [
  { id: 'basic-operators-delete', categoryId: 'basic-operators', title: 'Delete Operators', description: 'Use d, dd, and D to remove text.', order: 1, prerequisiteIds: ['essential-motions-mixed'], steps: [step('basic-operators-delete-step-1', 'Delete word with `d` + `w`.', `const userId = getUserId()\nreturn userId`, ['d', 'w']), step('basic-operators-delete-step-2', 'Delete line with `dd`.', `const a = 1\nconsole.log(a)\nreturn a`, ['dd']), step('basic-operators-delete-step-3', 'Delete to end with `D`.', `return normalizeEmail(email)`, ['D'])] },
  { id: 'basic-operators-change', categoryId: 'basic-operators', title: 'Change Operators', description: 'Use c, cc, and C to replace text.', order: 2, prerequisiteIds: ['basic-operators-delete'], steps: [step('basic-operators-change-step-1', 'Change with `c` + `w`.', `const status = draft`, ['c', 'w', 'Esc']), step('basic-operators-change-step-2', 'Change line with `cc`.', `let enabled = false`, ['cc', 'Esc']), step('basic-operators-change-step-3', 'Change to end with `C`.', `return buildResult(order)`, ['C', 'Esc'])] },
  { id: 'basic-operators-yank', categoryId: 'basic-operators', title: 'Yank and Paste', description: 'Use y, yy, p, and P.', order: 3, prerequisiteIds: ['basic-operators-change'], steps: [step('basic-operators-yank-step-1', 'Yank line with `yy` and paste with `p`.', `const retries = 3\nconst timeout = 5000`, ['yy', 'p']), step('basic-operators-yank-step-2', 'Yank word with `y` + `w` then paste.', `const token = readToken()`, ['y', 'w', 'p']), step('basic-operators-yank-step-3', 'Paste above with `P` after yank.', `const baseUrl = '/api'\nfetch(baseUrl + '/users')`, ['yy', 'P'])] },
  { id: 'basic-operators-cleanup', categoryId: 'basic-operators', title: 'Cleanup Patterns', description: 'Use operators for practical cleanup.', order: 4, prerequisiteIds: ['basic-operators-yank'], steps: [step('basic-operators-cleanup-step-1', 'Delete debug line with `dd`.', `const user = loadUser(id)\nconsole.log(user)\nreturn user`, ['dd']), step('basic-operators-cleanup-step-2', 'Delete rest of line with `D`.', `const value = parseInt(input, 10)`, ['D']), step('basic-operators-cleanup-step-3', 'Change tail of line with `C`.', `return url + id`, ['C', 'Esc'])] },
  { id: 'basic-operators-repeat-dot', categoryId: 'basic-operators', title: 'Repeat with Dot', description: 'Use . to repeat the last change.', order: 5, prerequisiteIds: ['basic-operators-cleanup'], steps: [step('basic-operators-repeat-dot-step-1', 'Make a change then repeat with `.`.', `const value = 100`, ['x', '.']), step('basic-operators-repeat-dot-step-2', 'Repeat line deletion with `.`.', `const a = 1\nconst b = 2\nconst c = 3`, ['dd', '.']), step('basic-operators-repeat-dot-step-3', 'Practice repeat after change.', `const level = 'debug'`, ['c', 'w', 'Esc', '.'])] },
]
