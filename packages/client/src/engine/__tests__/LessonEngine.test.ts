import { describe, test, expect, beforeEach } from 'vitest'
import { LessonEngine } from '@/engine/LessonEngine'
import type { Lesson } from '@/types/lesson'

const BASIC_LESSON: Lesson = {
  id: 'test-lesson',
  categoryId: 'basic-vim',
  title: 'Test Lesson',
  description: 'A lesson for testing',
  order: 1,
  type: 'step-based',
  keyCards: [{ key: 'dw', description: 'delete word' }],
  explanation: 'Test explanation for the lesson engine.',
  prerequisiteIds: [],
  steps: [
    {
      id: 'step-1',
      instruction: 'Delete the word "hello" using **dw**',
      initialContent: 'hello world\nfoo bar',
      initialCursor: { line: 0, column: 0 },
      expectedContent: 'world\nfoo bar',
      expectedCursor: undefined,
      hints: ['Try pressing d then w', 'Make sure you are in normal mode'],
      requiredCommands: ['dw', 'd', 'w'],
    },
    {
      id: 'step-2',
      instruction: 'Move the cursor down using **j**',
      initialContent: 'line one\nline two',
      initialCursor: { line: 0, column: 0 },
      expectedContent: undefined,
      expectedCursor: { line: 1, column: 0 },
      hints: ['Press j to move down'],
      requiredCommands: ['j'],
    },
    {
      id: 'step-3',
      instruction: 'Delete the line using **dd**',
      initialContent: 'delete me\nkeep me',
      initialCursor: { line: 0, column: 0 },
      expectedContent: 'keep me',
      expectedCursor: { line: 0, column: 0 },
      hints: ['Press d twice'],
      requiredCommands: ['dd'],
    },
  ],
}

const BAD_LESSON: Lesson = {
  ...BASIC_LESSON,
  id: 'bad-lesson',
  steps: [
    {
      ...BASIC_LESSON.steps[0],
      requiredCommands: ['zc'],
    },
  ],
}

describe('LessonEngine', () => {
  let engine: LessonEngine

  beforeEach(() => {
    engine = new LessonEngine(BASIC_LESSON)
  })

  test('constructs with a valid lesson', () => {
    expect(engine).toBeInstanceOf(LessonEngine)
  })

  test('throws an error when lesson contains unsupported vim commands', () => {
    expect(() => new LessonEngine(BAD_LESSON)).toThrow(/unsupported.*zc/i)
  })

  test('getCurrentStep returns the first step initially', () => {
    const step = engine.getCurrentStep()
    expect(step.id).toBe('step-1')
  })

  test('getCurrentStepIndex returns 0 initially', () => {
    expect(engine.getCurrentStepIndex()).toBe(0)
  })

  test('getStepCount returns total number of steps', () => {
    expect(engine.getStepCount()).toBe(3)
  })

  test('isComplete returns false initially', () => {
    expect(engine.isComplete()).toBe(false)
  })

  test('validateStep returns true when content matches expected', () => {
    expect(
      engine.validateStep({
        content: 'world\nfoo bar',
        cursorLine: 0,
        cursorColumn: 5,
      }),
    ).toBe(true)
  })

  test('validateStep returns false when content does not match', () => {
    expect(
      engine.validateStep({
        content: 'hello world\nfoo bar',
        cursorLine: 0,
        cursorColumn: 0,
      }),
    ).toBe(false)
  })

  test('validateStep returns true for cursor-only step when cursor matches', () => {
    engine.advanceStep()
    expect(
      engine.validateStep({
        content: 'anything here',
        cursorLine: 1,
        cursorColumn: 0,
      }),
    ).toBe(true)
  })

  test('validateStep returns false for cursor-only step when cursor is wrong', () => {
    engine.advanceStep()
    expect(
      engine.validateStep({
        content: 'anything',
        cursorLine: 0,
        cursorColumn: 0,
      }),
    ).toBe(false)
  })

  test('validateStep returns true only when both content and cursor match (step 3)', () => {
    engine.advanceStep()
    engine.advanceStep()
    expect(
      engine.validateStep({
        content: 'keep me',
        cursorLine: 0,
        cursorColumn: 0,
      }),
    ).toBe(true)
  })

  test('validateStep returns false when cursor is wrong even if content matches (step 3)', () => {
    engine.advanceStep()
    engine.advanceStep()
    expect(
      engine.validateStep({
        content: 'keep me',
        cursorLine: 0,
        cursorColumn: 5,
      }),
    ).toBe(false)
  })

  test('advanceStep moves to the next step', () => {
    engine.advanceStep()
    expect(engine.getCurrentStepIndex()).toBe(1)
    expect(engine.getCurrentStep().id).toBe('step-2')
  })

  test('advanceStep returns the next step', () => {
    const next = engine.advanceStep()
    expect(next?.id).toBe('step-2')
  })

  test('advanceStep returns null on the last step', () => {
    engine.advanceStep()
    engine.advanceStep()
    const result = engine.advanceStep()
    expect(result).toBeNull()
  })

  test('isComplete returns true after advancing past last step', () => {
    engine.advanceStep()
    engine.advanceStep()
    engine.advanceStep()
    expect(engine.isComplete()).toBe(true)
  })

  test('recordAttempt increments attempt count for current step', () => {
    engine.recordAttempt()
    engine.recordAttempt()
    expect(engine.getAttemptCount()).toBe(2)
  })

  test('getHint returns null before 3 attempts', () => {
    engine.recordAttempt()
    engine.recordAttempt()
    expect(engine.getHint()).toBeNull()
  })

  test('getHint returns first hint after 3 attempts', () => {
    engine.recordAttempt()
    engine.recordAttempt()
    engine.recordAttempt()
    expect(engine.getHint()).toBe('Try pressing d then w')
  })

  test('getHint returns second hint after 6 attempts', () => {
    for (let i = 0; i < 6; i++) engine.recordAttempt()
    expect(engine.getHint()).toBe('Make sure you are in normal mode')
  })

  test('getHint returns last available hint when attempts exceed hint count', () => {
    for (let i = 0; i < 12; i++) engine.recordAttempt()
    expect(engine.getHint()).toBe('Make sure you are in normal mode')
  })

  test('reset returns engine to step 0', () => {
    engine.advanceStep()
    engine.advanceStep()
    engine.reset()
    expect(engine.getCurrentStepIndex()).toBe(0)
    expect(engine.isComplete()).toBe(false)
  })

  test('reset clears attempt counts', () => {
    for (let i = 0; i < 5; i++) engine.recordAttempt()
    engine.reset()
    expect(engine.getAttemptCount()).toBe(0)
    expect(engine.getHint()).toBeNull()
  })

  test('resetCurrentStep resets attempt count for current step only', () => {
    for (let i = 0; i < 5; i++) engine.recordAttempt()
    engine.resetCurrentStep()
    expect(engine.getAttemptCount()).toBe(0)
  })

  test('getLesson returns the original lesson', () => {
    expect(engine.getLesson().id).toBe('test-lesson')
  })
})
