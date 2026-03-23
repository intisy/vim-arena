import type { Lesson } from '@/types/lesson'
import { BASIC_VIM_LESSONS } from './basic-vim'
import { INSERT_LIKE_A_PRO_LESSONS } from './insert-like-a-pro'
import { ESSENTIAL_MOTIONS_LESSONS } from './essential-motions'
import { BASIC_OPERATORS_LESSONS } from './basic-operators'
import { ADVANCED_VERTICAL_MOVEMENT_LESSONS } from './advanced-vertical-movement'
import { SEARCH_LESSONS } from './search'
import { TEXT_OBJECTS_BRACKETS_LESSONS } from './text-objects-brackets'
import { TEXT_OBJECTS_QUOTES_LESSONS } from './text-objects-quotes'
import { TEXT_OBJECTS_WORDS_LESSONS } from './text-objects-words'
import { TEXT_OBJECTS_PARAGRAPHS_LESSONS } from './text-objects-paragraphs'
import { TEXT_OBJECTS_MEGA_REVIEW_LESSONS } from './text-objects-mega-review'
import { VISUAL_MODE_LESSONS } from './visual-mode'

export const ALL_LESSONS: Lesson[] = [
  ...BASIC_VIM_LESSONS,
  ...INSERT_LIKE_A_PRO_LESSONS,
  ...ESSENTIAL_MOTIONS_LESSONS,
  ...BASIC_OPERATORS_LESSONS,
  ...ADVANCED_VERTICAL_MOVEMENT_LESSONS,
  ...SEARCH_LESSONS,
  ...TEXT_OBJECTS_BRACKETS_LESSONS,
  ...TEXT_OBJECTS_QUOTES_LESSONS,
  ...TEXT_OBJECTS_WORDS_LESSONS,
  ...TEXT_OBJECTS_PARAGRAPHS_LESSONS,
  ...TEXT_OBJECTS_MEGA_REVIEW_LESSONS,
  ...VISUAL_MODE_LESSONS,
]

export const LESSONS_BY_ID = new Map<string, Lesson>(
  ALL_LESSONS.map((lesson) => [lesson.id, lesson]),
)
