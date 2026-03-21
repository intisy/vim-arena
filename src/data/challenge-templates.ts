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

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'delete-char',
    type: 'delete',
    title: 'Delete Character',
    description: 'Delete the character under the cursor using x',
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

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        expectedCursor: { line: chosen.index, column: Math.min(col, newLine.length - 1) },
        referenceKeystrokeCount: 1,
        description: `Delete the character at line ${chosen.index + 1}, column ${col + 1} using x`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
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
    description: 'Replace the character under the cursor using r',
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

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        expectedCursor: { line: chosen.index, column: col },
        referenceKeystrokeCount: 2,
        description: `Replace '${chosen.line[col]}' with '${replacement}' at line ${chosen.index + 1}, col ${col + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
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
    description: 'Delete from cursor to the start of the next word using dw',
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

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        expectedCursor: { line: chosen.index, column: Math.min(col, Math.max(0, newLine.length - 1)) },
        referenceKeystrokeCount: 2,
        description: `Delete the word at line ${chosen.index + 1}, column ${col + 1} using dw`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
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
    description: 'Delete the entire current line using dd',
    difficulty: 2,
    requiredCommands: ['dd'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 2) return null

      const lineIdx = rng.nextInt(0, lines.length - 1)
      const newLines = lines.filter((_, i) => i !== lineIdx)
      const newCursorLine = Math.min(lineIdx, newLines.length - 1)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: lineIdx, column: 0 },
        expectedContent: newLines.join('\n'),
        expectedCursor: { line: newCursorLine, column: 0 },
        referenceKeystrokeCount: 2,
        description: `Delete line ${lineIdx + 1} using dd`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
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
    description: 'Change the word under the cursor using ciw and type a replacement',
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

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: chosen.index, column: word.start },
        expectedContent: newLines.join('\n'),
        expectedCursor: { line: chosen.index, column: word.start + replacement.length },
        referenceKeystrokeCount: 3 + replacement.length,
        description: `Change "${word.text}" to "${replacement}" at line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
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
    description: 'Delete from cursor to end of line using D',
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

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        expectedCursor: { line: chosen.index, column: Math.max(0, col - 1) },
        referenceKeystrokeCount: 1,
        description: `Delete from column ${col + 1} to end of line ${chosen.index + 1} using D`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
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
    description: 'Duplicate a line by yanking it (yy) and pasting it below (p)',
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

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: lineIdx, column: 0 },
        expectedContent: newLines.join('\n'),
        expectedCursor: { line: lineIdx + 1, column: 0 },
        referenceKeystrokeCount: 3,
        description: `Duplicate line ${lineIdx + 1} by yanking (yy) and pasting (p)`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
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
    description: 'Delete the word under the cursor using diw',
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
      const col = word.start + rng.nextInt(0, word.text.length - 1)

      const newLine = chosen.line.slice(0, word.start) + chosen.line.slice(word.end)
      const newLines = [...lines]
      newLines[chosen.index] = newLine

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        expectedCursor: { line: chosen.index, column: Math.min(word.start, Math.max(0, newLine.length - 1)) },
        referenceKeystrokeCount: 3,
        description: `Delete the word "${word.text}" at line ${chosen.index + 1} using diw`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
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
