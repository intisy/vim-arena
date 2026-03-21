import { describe, test, expect } from 'vitest'
import { buildAllowedKeys, buildPracticeKeys, shouldBlockKey } from '../KeyFilter'
import type { ChallengeSolution } from '@/types/challenge'

describe('buildPracticeKeys', () => {
  test('returns undefined for empty solutions', () => {
    expect(buildPracticeKeys([])).toBeUndefined()
  })

  test('extracts all unique characters from solution steps', () => {
    const solutions: ChallengeSolution[] = [
      {
        label: 'Optimal',
        steps: [
          { keys: '3j', description: 'Move down 3 lines' },
          { keys: 'dw', description: 'Delete word' },
        ],
        totalKeystrokes: 4,
      },
    ]
    const keys = buildPracticeKeys(solutions)!
    expect(keys).toContain('3')
    expect(keys).toContain('j')
    expect(keys).toContain('d')
    expect(keys).toContain('w')
    expect(keys).toContain('Escape')
  })

  test('merges keys from multiple solutions', () => {
    const solutions: ChallengeSolution[] = [
      {
        label: 'Via l',
        steps: [
          { keys: '2j', description: 'Move down' },
          { keys: '5l', description: 'Move right' },
          { keys: 'x', description: 'Delete char' },
        ],
        totalKeystrokes: 5,
      },
      {
        label: 'Via f',
        steps: [
          { keys: '2j', description: 'Move down' },
          { keys: 'fa', description: 'Find a' },
          { keys: 'x', description: 'Delete char' },
        ],
        totalKeystrokes: 5,
      },
    ]
    const keys = buildPracticeKeys(solutions)!
    expect(keys).toContain('j')
    expect(keys).toContain('l')
    expect(keys).toContain('f')
    expect(keys).toContain('a')
    expect(keys).toContain('x')
    expect(keys).toContain('Escape')
  })

  test('always includes Escape', () => {
    const solutions: ChallengeSolution[] = [
      {
        label: 'Optimal',
        steps: [{ keys: 'dd', description: 'Delete line' }],
        totalKeystrokes: 2,
      },
    ]
    const keys = buildPracticeKeys(solutions)!
    expect(keys).toContain('Escape')
  })
})

describe('shouldBlockKey', () => {
  test('does not block when allowedKeys is undefined', () => {
    expect(shouldBlockKey('x', undefined)).toBe(false)
  })

  test('blocks keys not in allowedKeys', () => {
    expect(shouldBlockKey('z', ['a', 'b'])).toBe(true)
  })

  test('does not block keys in allowedKeys', () => {
    expect(shouldBlockKey('a', ['a', 'b'])).toBe(false)
  })

  test('never blocks Escape', () => {
    expect(shouldBlockKey('Escape', ['a'])).toBe(false)
  })

  test('never blocks modifier keys', () => {
    expect(shouldBlockKey('Shift', ['a'])).toBe(false)
    expect(shouldBlockKey('Control', ['a'])).toBe(false)
    expect(shouldBlockKey('Alt', ['a'])).toBe(false)
    expect(shouldBlockKey('Meta', ['a'])).toBe(false)
  })

  test('never blocks arrow keys', () => {
    expect(shouldBlockKey('ArrowUp', ['a'])).toBe(false)
    expect(shouldBlockKey('ArrowDown', ['a'])).toBe(false)
  })
})

describe('buildAllowedKeys', () => {
  test('returns undefined for empty commands', () => {
    expect(buildAllowedKeys([])).toBeUndefined()
  })

  test('includes category keys and explicit characters', () => {
    const keys = buildAllowedKeys(['dw'])!
    expect(keys).toContain('d')
    expect(keys).toContain('w')
  })

  test('includes digits for count prefixes', () => {
    const keys = buildAllowedKeys(['x'])!
    expect(keys).toContain('0')
    expect(keys).toContain('9')
  })
})
