import type { Lesson } from '@/types/lesson'
import { BASIC_VIM_LESSONS } from './basic-vim'
import { INSERT_MODE_LESSONS } from './insert-mode'
import { ESSENTIAL_MOTIONS_LESSONS } from './essential-motions'
import { BASIC_OPERATORS_LESSONS } from './basic-operators'
import { VERTICAL_MOVEMENT_LESSONS } from './vertical-movement'
import { SEARCH_LESSONS } from './search'
import { TEXT_OBJECTS_LESSONS } from './text-objects'
import { VISUAL_MODE_LESSONS } from './visual-mode'

export const ALL_LESSONS: Lesson[] = [
  ...BASIC_VIM_LESSONS,
  ...INSERT_MODE_LESSONS,
  ...ESSENTIAL_MOTIONS_LESSONS,
  ...BASIC_OPERATORS_LESSONS,
  ...VERTICAL_MOVEMENT_LESSONS,
  ...SEARCH_LESSONS,
  ...TEXT_OBJECTS_LESSONS,
  ...VISUAL_MODE_LESSONS,
]

export const LESSONS_BY_ID = new Map<string, Lesson>(
  ALL_LESSONS.map((lesson) => [lesson.id, lesson]),
)
