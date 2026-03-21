import type { ChallengeTemplate, CodeSnippet, GeneratedChallenge } from '@/types/challenge'
import { SeededRandom } from '@/engine/ChallengeGenerator'

function getDeleteWordRange(line: string, col: number): { start: number; end: number } {
  const start = col
  let end = col

  const isWordChar = (ch: string) => /\w/.test(ch)
  if (end < line.length && isWordChar(line[end])) {
    while (end < line.length && isWordChar(line[end])) end++
  } else if (end < line.length && !/\s/.test(line[end])) {
    while (end < line.length && !isWordChar(line[end]) && !/\s/.test(line[end])) end++
  }

  while (end < line.length && /\s/.test(line[end])) end++

  return { start, end }
}

function pickOffsetCursor(
  rng: SeededRandom,
  targetLine: number,
  totalLines: number,
): { line: number; column: number; distance: number } {
  if (totalLines <= 2) {
    const offsetLine = targetLine === 0 ? 1 : 0
    return { line: offsetLine, column: 0, distance: Math.abs(targetLine - offsetLine) }
  }

  const minDist = Math.min(2, Math.max(1, Math.floor(totalLines / 4)))
  const maxDist = Math.min(6, Math.floor(totalLines / 2))
  const dist = rng.nextInt(minDist, maxDist)

  let offsetLine: number
  if (targetLine - dist >= 0 && targetLine + dist < totalLines) {
    offsetLine = rng.next() > 0.5 ? targetLine - dist : targetLine + dist
  } else if (targetLine - dist >= 0) {
    offsetLine = targetLine - dist
  } else {
    offsetLine = targetLine + dist
  }

  offsetLine = Math.max(0, Math.min(totalLines - 1, offsetLine))
  if (offsetLine === targetLine) {
    offsetLine = targetLine === 0 ? 1 : targetLine - 1
  }

  return { line: offsetLine, column: 0, distance: Math.abs(targetLine - offsetLine) }
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'delete-char',
    type: 'delete',
    title: 'Delete Character',
    description: 'Delete the highlighted character',
    difficulty: 1,
    requiredCommands: ['x'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const nonEmptyLines = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.trim().length > 0)
      if (nonEmptyLines.length === 0) return null

      const chosen = nonEmptyLines[rng.nextInt(0, nonEmptyLines.length - 1)]
      const trimStart = chosen.line.length - chosen.line.trimStart().length
      const col = rng.nextInt(trimStart, chosen.line.length - 1)

      const newLine = chosen.line.slice(0, col) + chosen.line.slice(col + 1)
      const newLines = [...lines]
      newLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: offset.line, column: offset.column },
        targetCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: 1 + offset.distance,
        description: 'Delete the highlighted character',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: col,
          toLine: chosen.index,
          toCol: col + 1,
        },
      }
    },
  },

  {
    id: 'replace-char',
    type: 'change',
    title: 'Replace Character',
    description: 'Replace the highlighted character',
    difficulty: 1,
    requiredCommands: ['r'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const nonEmptyLines = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.trim().length > 0)
      if (nonEmptyLines.length === 0) return null

      const chosen = nonEmptyLines[rng.nextInt(0, nonEmptyLines.length - 1)]
      const trimStart = chosen.line.length - chosen.line.trimStart().length
      const col = rng.nextInt(trimStart, chosen.line.length - 1)

      const replacements = 'abcdefghijklmnopqrstuvwxyz0123456789'
      let replacement = replacements[rng.nextInt(0, replacements.length - 1)]
      if (replacement === chosen.line[col]) {
        replacement = replacement === 'z' ? 'a' : String.fromCharCode(replacement.charCodeAt(0) + 1)
      }

      const newLine = chosen.line.slice(0, col) + replacement + chosen.line.slice(col + 1)
      const newLines = [...lines]
      newLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: offset.line, column: offset.column },
        targetCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: 2 + offset.distance,
        description: `Replace the highlighted character with '${replacement}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: col,
          toLine: chosen.index,
          toCol: col + 1,
        },
      }
    },
  },

  {
    id: 'delete-word',
    type: 'delete',
    title: 'Delete Word',
    description: 'Delete the highlighted word',
    difficulty: 2,
    requiredCommands: ['dw'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /\w/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const wordStarts: number[] = []
      for (let i = 0; i < chosen.line.length; i++) {
        if (/\w/.test(chosen.line[i]) && (i === 0 || !/\w/.test(chosen.line[i - 1]))) {
          wordStarts.push(i)
        }
      }
      if (wordStarts.length === 0) return null

      const col = wordStarts[rng.nextInt(0, wordStarts.length - 1)]
      const range = getDeleteWordRange(chosen.line, col)
      const newLine = chosen.line.slice(0, range.start) + chosen.line.slice(range.end)
      const newLines = [...lines]
      newLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: offset.line, column: offset.column },
        targetCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: 2 + offset.distance,
        description: 'Delete the highlighted word',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: range.start,
          toLine: chosen.index,
          toCol: range.end,
        },
      }
    },
  },

  {
    id: 'delete-line',
    type: 'delete',
    title: 'Delete Line',
    description: 'Delete the highlighted line',
    difficulty: 2,
    requiredCommands: ['dd'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 2) return null

      const lineIdx = rng.nextInt(0, lines.length - 1)
      const newLines = lines.filter((_, i) => i !== lineIdx)

      const offset = pickOffsetCursor(rng, lineIdx, lines.length)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: offset.line, column: offset.column },
        targetCursor: { line: lineIdx, column: 0 },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: 2 + offset.distance,
        description: 'Delete the highlighted line',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        targetHighlight: {
          fromLine: lineIdx,
          fromCol: 0,
          toLine: lineIdx,
          toCol: lines[lineIdx].length,
        },
      }
    },
  },

  {
    id: 'change-word',
    type: 'change',
    title: 'Change Word',
    description: 'Change the highlighted word',
    difficulty: 2,
    requiredCommands: ['ciw'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /\w{2,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /\w{2,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const replacementWords = ['value', 'result', 'output', 'target', 'input', 'count', 'total', 'index']
      let replacement = replacementWords[rng.nextInt(0, replacementWords.length - 1)]
      if (replacement === word.text) {
        replacement = 'updated'
      }

      const newLine = chosen.line.slice(0, word.start) + replacement + chosen.line.slice(word.end)
      const newLines = [...lines]
      newLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: offset.line, column: offset.column },
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: 3 + replacement.length + offset.distance,
        description: `Change the highlighted word to "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: word.start,
          toLine: chosen.index,
          toCol: word.end,
        },
      }
    },
  },

  {
    id: 'delete-to-eol',
    type: 'delete',
    title: 'Delete to End of Line',
    description: 'Delete from the cursor to the end of the highlighted section',
    difficulty: 3,
    requiredCommands: ['D'],
    timeLimitSeconds: 12,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.length >= 4)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const maxCol = Math.max(1, Math.floor(chosen.line.length / 2))
      const col = rng.nextInt(1, maxCol)

      const newLine = chosen.line.slice(0, col)
      const newLines = [...lines]
      newLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: offset.line, column: offset.column },
        targetCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: 1 + offset.distance,
        description: 'Delete everything after the cursor in the highlighted section',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: col,
          toLine: chosen.index,
          toCol: chosen.line.length,
        },
      }
    },
  },

  {
    id: 'yank-paste',
    type: 'yank-paste',
    title: 'Yank and Paste Line',
    description: 'Duplicate the highlighted line below it',
    difficulty: 3,
    requiredCommands: ['yy', 'p'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 2) return null

      const lineIdx = rng.nextInt(0, lines.length - 1)
      const newLines = [...lines]
      newLines.splice(lineIdx + 1, 0, lines[lineIdx])

      const offset = pickOffsetCursor(rng, lineIdx, lines.length)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: offset.line, column: offset.column },
        targetCursor: { line: lineIdx, column: 0 },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: 3 + offset.distance,
        description: 'Duplicate the highlighted line below it',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        targetHighlight: {
          fromLine: lineIdx,
          fromCol: 0,
          toLine: lineIdx,
          toCol: lines[lineIdx].length,
        },
      }
    },
  },

  {
    id: 'delete-inner-word',
    type: 'delete',
    title: 'Delete Inner Word',
    description: 'Delete the highlighted word',
    difficulty: 4,
    requiredCommands: ['diw'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /\w{2,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /\w{2,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]

      const newLine = chosen.line.slice(0, word.start) + chosen.line.slice(word.end)
      const newLines = [...lines]
      newLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: offset.line, column: offset.column },
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: 3 + offset.distance,
        description: 'Delete the highlighted word',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: word.start,
          toLine: chosen.index,
          toCol: word.end,
        },
      }
    },
  },
]
