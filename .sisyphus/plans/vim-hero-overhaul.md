# Vim-Hero Style Overhaul Plan

## Overview
Rebuild vim-arena to match vim-hero's layout and lesson catalog with 51 original lessons, 12 categories, persistent sidebar navigation, key cards, and dual interaction model (step-based + target-based).

## Architecture Changes

### Type System Changes (`src/types/lesson.ts`)

Add lesson type discriminator and target-based support:

```typescript
export type LessonType = 'theory' | 'step-based' | 'target-based'

export interface KeyCard {
  key: string            // e.g. 'w', 'dd', 'Ctrl+d'
  description: string    // e.g. 'move to the next word'
  example?: {            // optional inline demo
    before: string
    after: string
    cursorBefore: { line: number; column: number }
    cursorAfter: { line: number; column: number }
  }
}

// For target-based lessons (movement)
export interface TargetConfig {
  targetCount: number          // e.g. 15 targets to hit
  editorContent: string        // static code shown in editor
  allowedKeys: string[]        // which keys are valid for this challenge
}

// Extend LessonStep to be optional (theory lessons have no steps)
// Step-based remains as-is
// Target-based uses TargetConfig instead of steps

export interface Lesson {
  id: string
  categoryId: string
  title: string
  description: string
  order: number
  type: LessonType
  keyCards: KeyCard[]           // NEW: key explanations with examples
  explanation: string          // NEW: markdown explanation text (above key cards)
  additionalNotes?: string     // NEW: notes section below editor
  steps: LessonStep[]          // used for step-based lessons
  targetConfig?: TargetConfig  // used for target-based lessons
  prerequisiteIds: string[]
}
```

### New Categories (12 total)

```
1. basic-vim (4 lessons)
2. insert-like-a-pro (3 lessons) — NEW
3. essential-motions (4 lessons)
4. basic-operators (6 lessons) — EXPANDED
5. advanced-vertical-movement (4 lessons) — RENAMED
6. search (4 lessons) — EXPANDED
7. text-objects-brackets (6 lessons) — NEW (split from text-objects)
8. text-objects-quotes (5 lessons) — NEW
9. text-objects-words (4 lessons) — NEW
10. text-objects-paragraphs (4 lessons) — NEW
11. text-objects-mega-review (1 lesson) — NEW
12. visual-mode (6 lessons) — EXPANDED
```

### Layout Changes

1. **LessonsPage** → Replace grid cards with persistent sidebar that shows all lessons by category
2. **LessonViewPage** → Major restructure:
   - Sidebar always visible (left)
   - Main content: title → explanation → key cards → "Now it's your turn!" → tabs → editor → notes
   - Tab bar: Challenge | Stats
   - Prev/Next navigation with keyboard shortcuts (Ctrl+j/k)
3. **New Components**:
   - `LessonSidebar` — persistent nav with categories + lessons + key badges
   - `KeyCardGrid` — displays key explanations with show/hide example toggles
   - `TargetEditor` — movement challenge editor with random target highlights
   - `LessonTabs` — Challenge / Stats tabs

### Target-Based Engine

New `TargetEngine` class for movement lessons:
- Places a random cursor target in the editor content
- Validates user reached the target position
- Generates next random target
- Tracks: targets completed, timer, accuracy
- Target highlighted with green marker decoration in CodeMirror

## Execution Phases

### Phase 1: Foundation (Types + Engine + Components)
1. Update `src/types/lesson.ts` with new types
2. Create `src/engine/TargetEngine.ts`
3. Update `src/engine/LessonEngine.ts` for backward compat
4. Create `LessonSidebar` component
5. Create `KeyCardGrid` component
6. Redesign `LessonViewPage` layout
7. Redesign `LessonsPage` to use sidebar navigation

### Phase 2: Categories
1. Restructure `src/data/categories.ts` → 12 categories

### Phase 3: Lessons (by category)
Each lesson file contains ORIGINAL content (not copied from vim-hero).
All 51 lessons with proper keyCards, explanation, and validation.

Batch 1: basic-vim (4), insert-like-a-pro (3)
Batch 2: essential-motions (4), basic-operators (6)
Batch 3: advanced-vertical-movement (4), search (4)
Batch 4: text-objects-brackets (6), text-objects-quotes (5)
Batch 5: text-objects-words (4), text-objects-paragraphs (4), text-objects-mega-review (1)
Batch 6: visual-mode (6)

### Phase 4: Integration + Polish
1. Update tests for new types
2. Fix any build errors
3. Verify all lessons load correctly
4. Prev/Next navigation + keyboard shortcuts

## Constraints
- ALL lesson content must be ORIGINAL (not copied from vim-hero)
- Follow vim-hero's organizational structure and UX patterns
- Keep step-based model for editing lessons (dd, cw, di{, etc.)
- Use target-based model for movement lessons (hjkl, web, fF, etc.)
- Theory lessons for conceptual intros (modes, operators, text objects)
- Windows platform: use shell() with cwd, not bash with export
- TypeScript strict mode, no `as any` or `@ts-ignore`
- No self-explaining comments
