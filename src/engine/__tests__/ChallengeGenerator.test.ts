import { describe, test, expect } from 'vitest'
import { SeededRandom, ChallengeGenerator } from '@/engine/ChallengeGenerator'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import { ALL_SNIPPETS } from '@/data/snippets'
import type { CodeSnippet } from '@/types/challenge'

// ─── SeededRandom Tests ───────────────────────────────────
describe('SeededRandom', () => {
  test('produces deterministic output with same seed', () => {
    const rng1 = new SeededRandom(42)
    const rng2 = new SeededRandom(42)
    expect(rng1.next()).toBe(rng2.next())
    expect(rng1.next()).toBe(rng2.next())
    expect(rng1.next()).toBe(rng2.next())
  })

  test('different seeds produce different output', () => {
    const a = new SeededRandom(1).next()
    const b = new SeededRandom(2).next()
    expect(a).not.toBe(b)
  })

  test('next returns values in [0, 1)', () => {
    const rng = new SeededRandom(999)
    for (let i = 0; i < 100; i++) {
      const val = rng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  test('nextInt returns value within range', () => {
    const rng = new SeededRandom(123)
    for (let i = 0; i < 50; i++) {
      const n = rng.nextInt(0, 5)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(5)
    }
  })

  test('nextInt handles single-value range', () => {
    const rng = new SeededRandom(77)
    for (let i = 0; i < 10; i++) {
      expect(rng.nextInt(3, 3)).toBe(3)
    }
  })

  test('pick returns element from array', () => {
    const arr = ['a', 'b', 'c']
    const rng = new SeededRandom(99)
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(rng.pick(arr))
    }
  })

  test('pick returns the only element of single-element array', () => {
    const rng = new SeededRandom(0)
    expect(rng.pick([42])).toBe(42)
  })
})

// ─── ChallengeGenerator Tests ─────────────────────────────
describe('ChallengeGenerator', () => {
  const templates = CHALLENGE_TEMPLATES
  const snippets = ALL_SNIPPETS

  test('generate returns a valid GeneratedChallenge', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(42))
    const challenge = gen.generate()

    expect(challenge).toBeDefined()
    expect(challenge.templateId).toBeTruthy()
    expect(challenge.snippetId).toBeTruthy()
    expect(challenge.initialContent).toBeTruthy()
    expect(challenge.initialCursor).toBeDefined()
    expect(challenge.initialCursor.line).toBeGreaterThanOrEqual(0)
    expect(challenge.initialCursor.column).toBeGreaterThanOrEqual(0)
    expect(challenge.expectedContent).toBeDefined()
    expect(challenge.referenceKeystrokeCount).toBeGreaterThan(0)
    expect(challenge.description).toBeTruthy()
    expect(challenge.timeLimit).toBeGreaterThan(0)
    expect(challenge.difficulty).toBeGreaterThanOrEqual(1)
    expect(challenge.difficulty).toBeLessThanOrEqual(5)
  })

  test('same seed produces deterministic challenge', () => {
    const gen1 = new ChallengeGenerator(templates, snippets, new SeededRandom(42))
    const gen2 = new ChallengeGenerator(templates, snippets, new SeededRandom(42))
    const c1 = gen1.generate()
    const c2 = gen2.generate()
    expect(c1).toEqual(c2)
  })

  test('different seeds produce different challenges', () => {
    const gen1 = new ChallengeGenerator(templates, snippets, new SeededRandom(1))
    const gen2 = new ChallengeGenerator(templates, snippets, new SeededRandom(999))
    const c1 = gen1.generate()
    const c2 = gen2.generate()
    // At least something should differ (extremely unlikely to be identical)
    const sameAll = c1.templateId === c2.templateId
      && c1.snippetId === c2.snippetId
      && c1.initialCursor.line === c2.initialCursor.line
      && c1.initialCursor.column === c2.initialCursor.column
    expect(sameAll).toBe(false)
  })

  test('generate with difficulty filter only returns matching difficulty', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(77))
    for (let i = 0; i < 10; i++) {
      const challenge = gen.generate({ difficulty: 1 })
      expect(challenge.difficulty).toBe(1)
    }
  })

  test('generate with difficulty 2 filter works', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(100))
    for (let i = 0; i < 10; i++) {
      const challenge = gen.generate({ difficulty: 2 })
      expect(challenge.difficulty).toBe(2)
    }
  })

  test('generate with templateId filter returns that template', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(55))
    const challenge = gen.generate({ templateId: 'delete-line' })
    expect(challenge.templateId).toBe('delete-line')
  })

  test('generate throws for non-existent templateId', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(1))
    expect(() => gen.generate({ templateId: 'does-not-exist' })).toThrow()
  })

  test('generate throws when no templates match difficulty', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(1))
    expect(() => gen.generate({ difficulty: 5 })).toThrow()
  })

  test('generateBatch returns correct count', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(1))
    const batch = gen.generateBatch(5)
    expect(batch).toHaveLength(5)
    for (const challenge of batch) {
      expect(challenge.templateId).toBeTruthy()
      expect(challenge.initialContent).toBeTruthy()
    }
  })

  test('generateBatch with difficulty filter', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(200))
    const batch = gen.generateBatch(3, { difficulty: 3 })
    expect(batch).toHaveLength(3)
    for (const challenge of batch) {
      expect(challenge.difficulty).toBe(3)
    }
  })

  test('generated challenge has non-empty initialContent', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(42))
    for (let i = 0; i < 10; i++) {
      const challenge = gen.generate()
      expect(challenge.initialContent.length).toBeGreaterThan(0)
    }
  })

  test('generated challenge referenceKeystrokeCount > 0', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(42))
    for (let i = 0; i < 10; i++) {
      const challenge = gen.generate()
      expect(challenge.referenceKeystrokeCount).toBeGreaterThan(0)
    }
  })

  test('generated challenge expectedContent differs from initialContent', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(42))
    for (let i = 0; i < 10; i++) {
      const challenge = gen.generate()
      // yank-paste produces different content (duplicated line)
      // delete/change produce different content too
      expect(challenge.expectedContent).not.toBe(challenge.initialContent)
    }
  })
})

// ─── Individual Template Tests ────────────────────────────
describe('Challenge Templates', () => {
  const testSnippet: CodeSnippet = {
    id: 'test-snippet',
    content: 'function calculate(amount) {\n  const tax = amount * 0.1\n  return amount + tax\n}',
    language: 'javascript',
    lineCount: 4,
    tags: ['function'],
  }

  test('delete-char template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'delete-char')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('delete-char')
    expect(challenge!.expectedContent.length).toBe(testSnippet.content.length - 1)
  })

  test('replace-char template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'replace-char')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('replace-char')
    // Content length stays the same for replace
    expect(challenge!.expectedContent.length).toBe(testSnippet.content.length)
  })

  test('delete-word template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'delete-word')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('delete-word')
    expect(challenge!.expectedContent.length).toBeLessThan(testSnippet.content.length)
  })

  test('delete-line template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'delete-line')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('delete-line')
    const expectedLines = challenge!.expectedContent.split('\n')
    const originalLines = testSnippet.content.split('\n')
    expect(expectedLines.length).toBe(originalLines.length - 1)
  })

  test('change-word template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'change-word')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('change-word')
    expect(challenge!.expectedContent).not.toBe(testSnippet.content)
  })

  test('delete-to-eol template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'delete-to-eol')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('delete-to-eol')
    expect(challenge!.expectedContent.length).toBeLessThan(testSnippet.content.length)
  })

  test('yank-paste template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'yank-paste')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('yank-paste')
    const expectedLines = challenge!.expectedContent.split('\n')
    const originalLines = testSnippet.content.split('\n')
    expect(expectedLines.length).toBe(originalLines.length + 1)
  })

  test('delete-inner-word template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'delete-inner-word')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('delete-inner-word')
    expect(challenge!.expectedContent.length).toBeLessThan(testSnippet.content.length)
  })

  test('all 8 templates are present', () => {
    expect(CHALLENGE_TEMPLATES).toHaveLength(8)
    const ids = CHALLENGE_TEMPLATES.map(t => t.id)
    expect(ids).toContain('delete-char')
    expect(ids).toContain('replace-char')
    expect(ids).toContain('delete-word')
    expect(ids).toContain('delete-line')
    expect(ids).toContain('change-word')
    expect(ids).toContain('delete-to-eol')
    expect(ids).toContain('yank-paste')
    expect(ids).toContain('delete-inner-word')
  })

  test('template returns null for unsuitable snippet', () => {
    const tinySnippet: CodeSnippet = {
      id: 'tiny',
      content: 'x',
      language: 'plaintext',
      lineCount: 1,
      tags: [],
    }
    // delete-line needs >= 2 lines
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'delete-line')!
    const challenge = template.generateChallenge(tinySnippet, 42)
    expect(challenge).toBeNull()
  })
})
