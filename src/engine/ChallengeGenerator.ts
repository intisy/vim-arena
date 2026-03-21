import type { ChallengeTemplate, CodeSnippet, GeneratedChallenge } from '@/types/challenge'

/**
 * Mulberry32 PRNG — deterministic, fast, good distribution.
 */
export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed += 0x6D2B79F5
    let t = this.seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)]
  }
}

export class ChallengeGenerator {
  constructor(
    private templates: ChallengeTemplate[],
    private snippets: CodeSnippet[],
    private rng: SeededRandom,
  ) {}

  generate(options?: {
    difficulty?: 1 | 2 | 3 | 4 | 5
    templateId?: string
  }): GeneratedChallenge {
    let candidates = this.templates

    if (options?.difficulty != null) {
      candidates = candidates.filter(t => t.difficulty === options.difficulty)
    }
    if (options?.templateId != null) {
      candidates = candidates.filter(t => t.id === options.templateId)
    }
    if (candidates.length === 0) {
      throw new Error('No matching templates found for the given options')
    }

    const maxAttempts = candidates.length * this.snippets.length
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const template = this.rng.pick(candidates)
      const snippet = this.rng.pick(this.snippets)
      const seed = this.rng.nextInt(0, 2147483647)
      const challenge = template.generateChallenge(snippet, seed)
      if (challenge != null) {
        return challenge
      }
    }

    for (const template of candidates) {
      for (const snippet of this.snippets) {
        const challenge = template.generateChallenge(snippet, 42)
        if (challenge != null) {
          return challenge
        }
      }
    }

    throw new Error('Could not generate a challenge from any template/snippet combination')
  }

  generateBatch(
    count: number,
    options?: { difficulty?: 1 | 2 | 3 | 4 | 5 },
  ): GeneratedChallenge[] {
    return Array.from({ length: count }, () => this.generate(options))
  }
}
