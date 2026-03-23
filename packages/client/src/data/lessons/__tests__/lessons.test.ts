import { describe, test, expect } from 'vitest'
import { ALL_LESSONS, LESSONS_BY_ID } from '@/data/lessons/index'
import { LESSON_CATEGORIES } from '@/data/categories'
import { SUPPORTED_COMMAND_KEYS } from '@/data/supported-commands'

const VALID_CATEGORY_IDS = new Set(LESSON_CATEGORIES.map((c) => c.id))

describe('Lesson Content Validation', () => {
  test('all lessons have valid categoryIds', () => {
    for (const lesson of ALL_LESSONS) {
      expect(VALID_CATEGORY_IDS.has(lesson.categoryId)).toBe(true)
    }
  })

  test('all lesson IDs are unique', () => {
    const ids = ALL_LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every category has at least 1 lesson', () => {
    for (const category of LESSON_CATEGORIES) {
      const count = ALL_LESSONS.filter((l) => l.categoryId === category.id).length
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('total lesson count is at least 40', () => {
    expect(ALL_LESSONS.length).toBeGreaterThanOrEqual(40)
  })

  test('all steps have non-empty initialContent', () => {
    for (const lesson of ALL_LESSONS) {
      for (const step of lesson.steps) {
        expect(step.initialContent.length).toBeGreaterThan(0)
      }
    }
  })

  test('all requiredCommands are in SUPPORTED_COMMAND_KEYS', () => {
    for (const lesson of ALL_LESSONS) {
      for (const step of lesson.steps) {
        for (const cmd of step.requiredCommands) {
          expect(SUPPORTED_COMMAND_KEYS.has(cmd)).toBe(true)
        }
      }
    }
  })

  test('all prerequisiteIds reference existing lessons', () => {
    for (const lesson of ALL_LESSONS) {
      for (const prereqId of lesson.prerequisiteIds) {
        expect(LESSONS_BY_ID.has(prereqId)).toBe(true)
      }
    }
  })

  test('where both expectedContent and initialContent are defined, they differ', () => {
    for (const lesson of ALL_LESSONS) {
      for (const step of lesson.steps) {
        if (step.expectedContent !== undefined) {
          expect(step.expectedContent).not.toBe(step.initialContent)
        }
      }
    }
  })

  test('LESSONS_BY_ID map has same count as ALL_LESSONS', () => {
    expect(LESSONS_BY_ID.size).toBe(ALL_LESSONS.length)
  })
})
