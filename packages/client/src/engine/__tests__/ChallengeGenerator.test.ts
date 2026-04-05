import { describe, test, expect } from 'vitest'
import { SeededRandom, ChallengeGenerator } from '@/engine/ChallengeGenerator'
import { CHALLENGE_TEMPLATES } from '@/data/challenge-templates'
import { ALL_SNIPPETS } from '@/data/snippets'
import type { CodeSnippet } from '@/types/challenge'

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ SeededRandom Tests ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ ChallengeGenerator Tests ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

  test('generate falls back to all templates for non-existent templateId', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(1))
    const challenge = gen.generate({ templateId: 'does-not-exist' })
    expect(challenge.templateId).toBeTruthy()
  })

  test('generate falls back to all templates when no difficulty match', () => {
    const gen = new ChallengeGenerator(templates, snippets, new SeededRandom(1))
    const challenge = gen.generate({ difficulty: 5 })
    expect(challenge.templateId).toBeTruthy()
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
      expect(challenge.expectedContent).not.toBe(challenge.initialContent)
    }
  })
})

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Individual Template Tests ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
    expect(challenge!.expectedContent).toBe(testSnippet.content)
    expect(challenge!.initialContent.length).toBe(testSnippet.content.length + 1)
  })

  test('replace-char template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'replace-char')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('replace-char')
    expect(challenge!.expectedContent).toBe(testSnippet.content)
    expect(challenge!.initialContent.length).toBe(testSnippet.content.length)
    expect(challenge!.initialContent).not.toBe(testSnippet.content)
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

  test('all 45 templates are present', () => {
    expect(CHALLENGE_TEMPLATES).toHaveLength(101)
    const ids = CHALLENGE_TEMPLATES.map(t => t.id)
    // Base templates (18)
    expect(ids).toContain('delete-char')
    expect(ids).toContain('replace-char')
    expect(ids).toContain('delete-word')
    expect(ids).toContain('delete-line')
    expect(ids).toContain('change-word')
    expect(ids).toContain('delete-to-eol')
    expect(ids).toContain('yank-paste')
    expect(ids).toContain('delete-inner-word')
    expect(ids).toContain('append-eol')
    expect(ids).toContain('insert-bol')
    expect(ids).toContain('join-lines')
    expect(ids).toContain('change-to-eol')
    expect(ids).toContain('swap-lines')
    expect(ids).toContain('delete-inside-quotes')
    expect(ids).toContain('change-inside-parens')
    expect(ids).toContain('delete-around-word')
    expect(ids).toContain('scroll-delete-line')
    expect(ids).toContain('scroll-change-word')
    // Extra templates (27)
    expect(ids).toContain('delete-back-char')
    expect(ids).toContain('substitute-char')
    expect(ids).toContain('delete-multiple-chars')
    expect(ids).toContain('toggle-case')
    expect(ids).toContain('transpose-chars')
    expect(ids).toContain('change-end-word')
    expect(ids).toContain('delete-find-char')
    expect(ids).toContain('yank-paste-above')
    expect(ids).toContain('delete-multiple-lines')
    expect(ids).toContain('delete-to-bol')
    expect(ids).toContain('change-inside-braces')
    expect(ids).toContain('change-inside-quotes')
    expect(ids).toContain('delete-inside-parens')
    expect(ids).toContain('visual-delete-lines')
    expect(ids).toContain('change-till-char')
    expect(ids).toContain('scroll-replace-char')
    expect(ids).toContain('scroll-delete-word')
    expect(ids).toContain('scroll-join-lines')
    expect(ids).toContain('open-line-below')
    expect(ids).toContain('open-line-above')
    expect(ids).toContain('substitute-line')
    expect(ids).toContain('delete-till-char')
    expect(ids).toContain('indent-line')
    expect(ids).toContain('dedent-line')
    expect(ids).toContain('delete-around-quotes')
    expect(ids).toContain('delete-around-parens')
    expect(ids).toContain('change-around-word')
    // Batch 3 extra templates (6)
    expect(ids).toContain('delete-word-backward')
    expect(ids).toContain('delete-inside-brackets')
    expect(ids).toContain('change-inside-brackets')
    expect(ids).toContain('delete-around-braces')
    expect(ids).toContain('yank-word-paste')
    expect(ids).toContain('scroll-delete-to-eol')
    // Batch 4 extra templates (10)
    expect(ids).toContain('uppercase-word')
    expect(ids).toContain('lowercase-word')
    expect(ids).toContain('delete-around-brackets')
    expect(ids).toContain('change-around-parens')
    expect(ids).toContain('change-around-quotes')
    expect(ids).toContain('delete-inside-braces')
    expect(ids).toContain('append-after-word')
    expect(ids).toContain('replace-mode')
    expect(ids).toContain('change-around-braces')
    expect(ids).toContain('scroll-toggle-case')
    // Batch 5 extra templates (10)
    expect(ids).toContain('change-char')
    expect(ids).toContain('delete-find-char-backward')
    expect(ids).toContain('change-find-char')
    expect(ids).toContain('visual-select-word-delete')
    expect(ids).toContain('delete-to-first-nonblank')
    expect(ids).toContain('change-to-bol')
    expect(ids).toContain('delete-big-word')
    expect(ids).toContain('change-big-word')
    expect(ids).toContain('scroll-indent-line')
    expect(ids).toContain('scroll-dedent-line')
    // Batch 6 extra templates (10)
    expect(ids).toContain('change-inside-word')
    expect(ids).toContain('join-lines-no-space')
    expect(ids).toContain('uppercase-line')
    expect(ids).toContain('lowercase-line')
    expect(ids).toContain('toggle-case-line')
    expect(ids).toContain('join-count-lines')
    expect(ids).toContain('scroll-uppercase-line')
    expect(ids).toContain('scroll-lowercase-line')
    expect(ids).toContain('scroll-change-inside-word')
    expect(ids).toContain('scroll-toggle-case-line')
    // Batch 7 extra templates (10)
    expect(ids).toContain('yank-line-paste-below')
    expect(ids).toContain('delete-count-words')
    expect(ids).toContain('delete-end-of-word')
    expect(ids).toContain('change-find-char-backward')
    expect(ids).toContain('yank-two-lines-paste')
    expect(ids).toContain('change-count-words')
    expect(ids).toContain('scroll-join-no-space')
    expect(ids).toContain('scroll-delete-end-word')
    expect(ids).toContain('scroll-yank-line-paste')
    expect(ids).toContain('scroll-delete-count-words')
    // Batch 8 extra templates (10)
    expect(ids).toContain('change-entire-line')
    expect(ids).toContain('visual-uppercase-word')
    expect(ids).toContain('visual-lowercase-word')
    expect(ids).toContain('indent-multiple-lines')
    expect(ids).toContain('delete-to-match-bracket')
    expect(ids).toContain('yank-line-paste-above')
    expect(ids).toContain('replace-multiple-chars')
    expect(ids).toContain('scroll-delete-to-bol')
    expect(ids).toContain('scroll-change-to-eol')
    expect(ids).toContain('scroll-substitute-line')
  })

  test('template returns null for unsuitable snippet', () => {
    const tinySnippet: CodeSnippet = {
      id: 'tiny',
      content: 'x',
      language: 'plaintext',
      lineCount: 1,
      tags: [],
    }
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'delete-line')!
    const challenge = template.generateChallenge(tinySnippet, 42)
    expect(challenge).toBeNull()
  })

  test('scroll templates return null for short snippets', () => {
    const scrollTemplate = CHALLENGE_TEMPLATES.find(t => t.id === 'scroll-delete-line')!
    const challenge = scrollTemplate.generateChallenge(testSnippet, 42)
    expect(challenge).toBeNull()
  })

  test('scroll templates generate valid challenge for long snippets', () => {
    const longSnippet: CodeSnippet = {
      id: 'long-test',
      content: Array.from({ length: 30 }, (_, i) => `  const line${i} = ${i}`).join('\n'),
      language: 'javascript',
      lineCount: 30,
      tags: ['long'],
    }
    const scrollTemplate = CHALLENGE_TEMPLATES.find(t => t.id === 'scroll-delete-line')!
    const challenge = scrollTemplate.generateChallenge(longSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('scroll-delete-line')
    const expectedLines = challenge!.expectedContent.split('\n')
    expect(expectedLines.length).toBe(29)
  })

  test('join-lines template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'join-lines')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('join-lines')
    const expectedLines = challenge!.expectedContent.split('\n')
    const originalLines = testSnippet.content.split('\n')
    expect(expectedLines.length).toBe(originalLines.length - 1)
  })

  test('swap-lines template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'swap-lines')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('swap-lines')
    const expectedLines = challenge!.expectedContent.split('\n')
    const originalLines = testSnippet.content.split('\n')
    expect(expectedLines.length).toBe(originalLines.length)
  })

  test('toggle-case template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'toggle-case')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('toggle-case')
    expect(challenge!.expectedContent).toBe(testSnippet.content)
    expect(challenge!.initialContent).not.toBe(testSnippet.content)
  })

  test('transpose-chars template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'transpose-chars')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('transpose-chars')
    expect(challenge!.expectedContent).toBe(testSnippet.content)
  })

  test('delete-multiple-lines template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'delete-multiple-lines')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('delete-multiple-lines')
    const expectedLines = challenge!.expectedContent.split('\n')
    const originalLines = testSnippet.content.split('\n')
    expect(expectedLines.length).toBeLessThan(originalLines.length)
  })

  test('visual-delete-lines template needs 5+ lines', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'visual-delete-lines')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).toBeNull()

    const biggerSnippet: CodeSnippet = {
      id: 'bigger',
      content: 'line one\nline two\nline three\nline four\nline five\nline six',
      language: 'plaintext',
      lineCount: 6,
      tags: [],
    }
    const challenge2 = template.generateChallenge(biggerSnippet, 42)
    expect(challenge2).not.toBeNull()
    expect(challenge2!.templateId).toBe('visual-delete-lines')
  })

  test('all new scroll templates return null for short snippets', () => {
    const scrollIds = ['scroll-replace-char', 'scroll-delete-word', 'scroll-join-lines']
    for (const id of scrollIds) {
      const template = CHALLENGE_TEMPLATES.find(t => t.id === id)!
      const challenge = template.generateChallenge(testSnippet, 42)
      expect(challenge).toBeNull()
    }
  })

  test('new scroll templates generate valid challenge for long snippets', () => {
    const longSnippet: CodeSnippet = {
      id: 'long-test-2',
      content: Array.from({ length: 30 }, (_, i) => `  const item${i} = getValue(${i})`).join('\n'),
      language: 'javascript',
      lineCount: 30,
      tags: ['long'],
    }
    const scrollIds = ['scroll-replace-char', 'scroll-delete-word', 'scroll-join-lines']
    for (const id of scrollIds) {
      const template = CHALLENGE_TEMPLATES.find(t => t.id === id)!
      const challenge = template.generateChallenge(longSnippet, 42)
      expect(challenge).not.toBeNull()
      expect(challenge!.templateId).toBe(id)
    }
  })

  test('open-line-below template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'open-line-below')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('open-line-below')
    const expectedLines = challenge!.expectedContent.split('\n')
    const initialLines = challenge!.initialContent.split('\n')
    expect(expectedLines.length).toBe(initialLines.length + 1)
  })

  test('open-line-above template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'open-line-above')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('open-line-above')
    const expectedLines = challenge!.expectedContent.split('\n')
    const initialLines = challenge!.initialContent.split('\n')
    expect(expectedLines.length).toBe(initialLines.length + 1)
  })

  test('substitute-line template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'substitute-line')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('substitute-line')
    expect(challenge!.expectedContent).not.toBe(testSnippet.content)
  })

  test('indent-line template generates valid challenge', () => {
    const template = CHALLENGE_TEMPLATES.find(t => t.id === 'indent-line')!
    const challenge = template.generateChallenge(testSnippet, 42)
    expect(challenge).not.toBeNull()
    expect(challenge!.templateId).toBe('indent-line')
  })

  test('no duplicate template IDs', () => {
    const ids = CHALLENGE_TEMPLATES.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  test('every template generates at least one valid challenge across snippets', () => {
    for (const template of CHALLENGE_TEMPLATES) {
      let generated = false
      for (const snippet of ALL_SNIPPETS) {
        for (let seed = 0; seed < 10; seed++) {
          const challenge = template.generateChallenge(snippet, seed)
          if (challenge !== null) {
            generated = true
            break
          }
        }
        if (generated) break
      }
      expect(generated).toBe(true)
    }
  })
})
