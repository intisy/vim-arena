import { describe, test, expect } from 'vitest'
import type { GeneratedChallenge } from '@/types/challenge'
import { ChallengeEngine } from '../ChallengeEngine'

const mockChallenge: GeneratedChallenge = {
  templateId: 'delete-word',
  snippetId: 'snippet-1',
  initialContent: 'const value = 42',
  initialCursor: { line: 0, column: 0 },
  expectedContent: 'value = 42',
  expectedCursor: undefined,
  referenceKeystrokeCount: 2,
  description: 'Delete the word "const"',
  timeLimit: 30,
  difficulty: 1,
}

describe('ChallengeEngine', () => {
  test('starts inactive', () => {
    const engine = new ChallengeEngine(mockChallenge)
    expect(engine.getIsActive()).toBe(false)
  })

  test('becomes active after start()', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.start()
    expect(engine.getIsActive()).toBe(true)
    engine.destroy()
  })

  test('keystroke count starts at 0', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.start()
    expect(engine.getKeystrokeCount()).toBe(0)
    engine.destroy()
  })

  test('recordKeystroke increments count', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.start()
    engine.recordKeystroke()
    engine.recordKeystroke()
    expect(engine.getKeystrokeCount()).toBe(2)
    engine.destroy()
  })

  test('recordKeystroke does nothing when inactive', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.recordKeystroke()
    expect(engine.getKeystrokeCount()).toBe(0)
  })

  test('validateCompletion returns null when not active', () => {
    const engine = new ChallengeEngine(mockChallenge)
    expect(engine.validateCompletion({ content: 'value = 42', cursorLine: 0, cursorColumn: 0 })).toBeNull()
  })

  test('validateCompletion returns null when content does not match', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.start()
    expect(engine.validateCompletion({ content: 'const value = 42', cursorLine: 0, cursorColumn: 0 })).toBeNull()
    engine.destroy()
  })

  test('validateCompletion returns ChallengeResult when content matches', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.start()
    engine.recordKeystroke()
    engine.recordKeystroke()
    const result = engine.validateCompletion({ content: 'value = 42', cursorLine: 0, cursorColumn: 0 })
    expect(result).not.toBeNull()
    expect(result?.templateId).toBe('delete-word')
    expect(result?.snippetId).toBe('snippet-1')
    expect(result?.efficiencyScore).toBeGreaterThan(0)
    expect(result?.totalScore).toBeGreaterThan(0)
    expect(result?.timedOut).toBe(false)
  })

  test('validateCompletion checks cursor when expectedCursor is set', () => {
    const challengeWithCursor: GeneratedChallenge = {
      ...mockChallenge,
      expectedCursor: { line: 0, column: 5 },
    }
    const engine = new ChallengeEngine(challengeWithCursor)
    engine.start()
    // Wrong cursor
    expect(engine.validateCompletion({ content: 'value = 42', cursorLine: 0, cursorColumn: 0 })).toBeNull()
    // Right cursor
    const result = engine.validateCompletion({ content: 'value = 42', cursorLine: 0, cursorColumn: 5 })
    expect(result).not.toBeNull()
    expect(result?.templateId).toBe('delete-word')
  })

  test('forceComplete returns a result even without validation', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.start()
    const result = engine.forceComplete()
    expect(result.templateId).toBe('delete-word')
    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.timedOut).toBe(true)
  })

  test('reset makes engine inactive again', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.start()
    engine.recordKeystroke()
    engine.reset()
    expect(engine.getIsActive()).toBe(false)
    expect(engine.getKeystrokeCount()).toBe(0)
  })

  test('start() is idempotent — calling twice does not reset', () => {
    const engine = new ChallengeEngine(mockChallenge)
    engine.start()
    engine.recordKeystroke()
    engine.start()
    expect(engine.getKeystrokeCount()).toBe(1)
    engine.destroy()
  })

  test('getElapsedSeconds returns 0 when not started', () => {
    const engine = new ChallengeEngine(mockChallenge)
    expect(engine.getElapsedSeconds()).toBe(0)
  })

  test('getChallenge returns the challenge', () => {
    const engine = new ChallengeEngine(mockChallenge)
    expect(engine.getChallenge()).toBe(mockChallenge)
  })
})
