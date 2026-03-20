import type { Lesson, LessonStep } from '@/types/lesson'

function step(id: string, instruction: string, content: string, requiredCommands: string[]): LessonStep {
  return {
    id,
    instruction,
    initialContent: content,
    initialCursor: { line: 0, column: 0 },
    expectedContent: undefined,
    expectedCursor: undefined,
    hints: ['Use vertical movement in Normal mode.', 'Focus on cursor travel.'],
    requiredCommands,
  }
}

export const VERTICAL_MOVEMENT_LESSONS: Lesson[] = [
  { id: 'vertical-movement-boundaries', categoryId: 'vertical-movement', title: 'File Boundaries', description: 'Use gg and G.', order: 1, prerequisiteIds: ['basic-operators-repeat-dot'], steps: [step('vertical-movement-boundaries-step-1', 'Jump to top with `gg`.', `const a = 1\nconst b = 2\nconst c = 3`, ['gg']), step('vertical-movement-boundaries-step-2', 'Jump to bottom with `G`.', `const a = 1\nconst b = 2\nconst c = 3`, ['G']), step('vertical-movement-boundaries-step-3', 'Practice `gg` then `G`.', `line one\nline two\nline three`, ['gg', 'G'])] },
  { id: 'vertical-movement-paragraphs', categoryId: 'vertical-movement', title: 'Paragraph Jumps', description: 'Use { and } between blocks.', order: 2, prerequisiteIds: ['vertical-movement-boundaries'], steps: [step('vertical-movement-paragraphs-step-1', 'Jump forward paragraph with `}`.', `block a\n\nblock b\n\nblock c`, ['}']), step('vertical-movement-paragraphs-step-2', 'Jump backward paragraph with `{`.', `block a\n\nblock b\n\nblock c`, ['{']), step('vertical-movement-paragraphs-step-3', 'Practice `{` and `}` together.', `const queue = []\n\nconst active = queue[0]`, ['{', '}'])] },
  { id: 'vertical-movement-half-page-down', categoryId: 'vertical-movement', title: 'Half-Page Down', description: 'Use Ctrl-d for fast downward movement.', order: 3, prerequisiteIds: ['vertical-movement-paragraphs'], steps: [step('vertical-movement-half-page-down-step-1', 'Scroll down with `Ctrl-d`.', `line1\nline2\nline3\nline4\nline5\nline6`, ['Ctrl-d']), step('vertical-movement-half-page-down-step-2', 'Scroll down again with `Ctrl-d`.', `def one(): pass\ndef two(): pass\ndef three(): pass`, ['Ctrl-d']), step('vertical-movement-half-page-down-step-3', 'Use `Ctrl-d` then `j`.', `a\nb\nc\nd\ne\nf`, ['Ctrl-d', 'j'])] },
  { id: 'vertical-movement-half-page-up', categoryId: 'vertical-movement', title: 'Half-Page Up', description: 'Use Ctrl-u for quick upward movement.', order: 4, prerequisiteIds: ['vertical-movement-half-page-down'], steps: [step('vertical-movement-half-page-up-step-1', 'Scroll up with `Ctrl-u`.', `item1\nitem2\nitem3\nitem4\nitem5`, ['Ctrl-u']), step('vertical-movement-half-page-up-step-2', 'Scroll up again with `Ctrl-u`.', `rowA\nrowB\nrowC\nrowD`, ['Ctrl-u']), step('vertical-movement-half-page-up-step-3', 'Use `Ctrl-u` then `k`.', `setup\nvalidate\nrun\ncleanup`, ['Ctrl-u', 'k'])] },
  { id: 'vertical-movement-mixed', categoryId: 'vertical-movement', title: 'Mixed Vertical Flow', description: 'Chain boundary, paragraph, and scroll motions.', order: 5, prerequisiteIds: ['vertical-movement-half-page-up'], steps: [step('vertical-movement-mixed-step-1', 'Use `gg` then `}`.', `block a\n\nblock b\n\nblock c`, ['gg', '}']), step('vertical-movement-mixed-step-2', 'Use `G` then `{`.', `block a\n\nblock b\n\nblock c`, ['G', '{']), step('vertical-movement-mixed-step-3', 'Practice `Ctrl-d` and `Ctrl-u`.', `line1\nline2\nline3\nline4\nline5\nline6`, ['Ctrl-d', 'Ctrl-u'])] },
]
