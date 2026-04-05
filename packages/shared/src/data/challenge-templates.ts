import type { ChallengeTemplate, CodeSnippet, GeneratedChallenge, SolutionStep } from '../types/challenge'
import { SeededRandom } from '../engine/ChallengeGenerator'
import {
  pickOffsetCursor,
  pickFarCursor,
  countStepKeys,
  verticalStep,
  computeSolutions,
  computeScrollSolutions,
  getDeleteWordRange,
} from './challenge-helpers'
import { EXTRA_TEMPLATES } from './extra-templates'

const BASE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'delete-char',
    type: 'delete',
    title: 'Delete Character',
    description: 'Delete the extra character to fix the typo',
    difficulty: 1,
    requiredCommands: ['x'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[a-zA-Z]{3,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]

      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /[a-zA-Z]{3,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const charIdx = rng.nextInt(0, word.text.length - 1)
      const dupChar = word.text[charIdx]
      const insertCol = word.start + charIdx

      const corruptedLine = chosen.line.slice(0, insertCol) + dupChar + chosen.line.slice(insertCol)
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = corruptedLine

      const corruptedWord = word.text.slice(0, charIdx) + dupChar + word.text.slice(charIdx)

      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const actionSteps: SolutionStep[] = [{ keys: 'x', description: 'Delete character' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, insertCol, corruptedLine, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: insertCol },
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Remove the extra '${dupChar}' from '${corruptedWord}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: insertCol,
          toLine: chosen.index,
          toCol: insertCol + 1,
        },
      }
    },
  },

  {
    id: 'replace-char',
    type: 'change',
    title: 'Replace Character',
    description: 'Fix the typo by replacing the wrong character',
    difficulty: 1,
    requiredCommands: ['r'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[a-zA-Z]{3,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]

      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /[a-zA-Z]{3,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const charIdx = rng.nextInt(0, word.text.length - 1)
      const originalChar = word.text[charIdx]
      const col = word.start + charIdx

      const isUpper = originalChar === originalChar.toUpperCase() && originalChar !== originalChar.toLowerCase()
      const base = originalChar.toLowerCase()
      const letters = 'abcdefghijklmnopqrstuvwxyz'
      let typoChar: string
      do {
        typoChar = letters[rng.nextInt(0, letters.length - 1)]
      } while (typoChar === base)
      if (isUpper) typoChar = typoChar.toUpperCase()

      const corruptedLine = chosen.line.slice(0, col) + typoChar + chosen.line.slice(col + 1)
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = corruptedLine

      const corruptedWord = word.text.slice(0, charIdx) + typoChar + word.text.slice(charIdx + 1)

      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const actionSteps: SolutionStep[] = [{ keys: `r${originalChar}`, description: `Replace with '${originalChar}'` }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, corruptedLine, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Fix the typo in '${corruptedWord}': replace '${typoChar}' with '${originalChar}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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
      const deletedWord = chosen.line.slice(range.start, range.end).trim()
      const newLine = chosen.line.slice(0, range.start) + chosen.line.slice(range.end)
      const newLines = [...lines]
      newLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'dw', description: 'Delete word' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete the word '${deletedWord}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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

      const offset = pickOffsetCursor(rng, lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'dd', description: 'Delete line' }]
      const solutions = computeSolutions(offset.line, offset.column, lineIdx, 0, lines[lineIdx], actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: lineIdx, column: 0 },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Remove line ${lineIdx + 1} from the code`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'ciw', description: 'Change inner word' },
        { keys: replacement, description: `Type "${replacement}"` },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Rename '${word.text}' to "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'D', description: 'Delete to end of line' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: 'Truncate the line at the highlighted position',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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

      const offset = pickOffsetCursor(rng, lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'yy', description: 'Yank line' },
        { keys: 'p', description: 'Paste below' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, lineIdx, 0, lines[lineIdx], actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: lineIdx, column: 0 },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Duplicate line ${lineIdx + 1} below itself`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'diw', description: 'Delete inner word' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Remove the '${word.text}' identifier`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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
    id: 'append-eol',
    type: 'change',
    title: 'Append at End of Line',
    description: 'Add the missing text at the end of the line',
    difficulty: 2,
    requiredCommands: ['A'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.trimEnd().length >= 8)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const trimmed = chosen.line.trimEnd()
      const removeCount = rng.nextInt(2, Math.min(5, Math.floor(trimmed.length / 3)))
      const kept = trimmed.slice(0, trimmed.length - removeCount)
      const missing = trimmed.slice(trimmed.length - removeCount)

      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = kept

      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const vStep = verticalStep(offset.line, chosen.index)
      const actionSteps: SolutionStep[] = [
        { keys: 'A', description: 'Append at end' },
        { keys: missing, description: `Type "${missing}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        expectedContent: snippet.content,
        referenceKeystrokeCount: totalKeystrokes,
        description: `Append "${missing}" at end of line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: Math.max(0, kept.length - 1),
          toLine: chosen.index,
          toCol: kept.length,
        },
      }
    },
  },

  {
    id: 'insert-bol',
    type: 'change',
    title: 'Insert at Line Start',
    description: 'Add missing text at the beginning of the line',
    difficulty: 2,
    requiredCommands: ['I'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => {
          const content = line.trimStart()
          return content.length >= 6 && line.length > content.length
        })
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const indent = chosen.line.length - chosen.line.trimStart().length
      const contentAfterIndent = chosen.line.slice(indent)

      const removeCount = rng.nextInt(2, Math.min(4, Math.floor(contentAfterIndent.length / 3)))
      const missing = contentAfterIndent.slice(0, removeCount)
      const remaining = contentAfterIndent.slice(removeCount)

      if (/^\s/.test(remaining)) return null

      const corruptedLine = chosen.line.slice(0, indent) + remaining
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = corruptedLine

      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const vStep = verticalStep(offset.line, chosen.index)
      const actionSteps: SolutionStep[] = [
        { keys: 'I', description: 'Insert at line start' },
        { keys: missing, description: `Type "${missing}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        expectedContent: snippet.content,
        referenceKeystrokeCount: totalKeystrokes,
        description: `Add "${missing}" at the start of line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: indent,
          toLine: chosen.index,
          toCol: indent + 1,
        },
      }
    },
  },

  {
    id: 'join-lines',
    type: 'change',
    title: 'Join Lines',
    description: 'Join the highlighted line with the next line',
    difficulty: 2,
    requiredCommands: ['J'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 3) return null

      const candidates: number[] = []
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].length > 0 && lines[i + 1].trimStart().length > 0) {
          candidates.push(i)
        }
      }
      if (candidates.length === 0) return null

      const lineIdx = candidates[rng.nextInt(0, candidates.length - 1)]

      const joinedLine = lines[lineIdx] + ' ' + lines[lineIdx + 1].trimStart()
      const expectedLines = [...lines]
      expectedLines.splice(lineIdx, 2, joinedLine)

      const offset = pickOffsetCursor(rng, lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, lineIdx)
      const actionSteps: SolutionStep[] = [{ keys: 'J', description: 'Join lines' }]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: totalKeystrokes,
        description: `Join line ${lineIdx + 1} with the line below`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: lineIdx,
          fromCol: 0,
          toLine: lineIdx + 1,
          toCol: lines[lineIdx + 1].length,
        },
      }
    },
  },

  {
    id: 'change-to-eol',
    type: 'change',
    title: 'Change to End of Line',
    description: 'Replace the highlighted text to the end of the line',
    difficulty: 3,
    requiredCommands: ['C'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.length >= 8)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const maxCol = Math.max(1, Math.floor(chosen.line.length / 2))
      const col = rng.nextInt(1, maxCol)

      const kept = chosen.line.slice(0, col)
      const replacements = ['null', 'true', 'false', '0', '[]', '{}']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const expectedLine = kept + replacement
      const expectedLines = [...lines]
      expectedLines[chosen.index] = expectedLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'C', description: 'Change to end of line' },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Replace end of line ${chosen.index + 1} with "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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
    id: 'swap-lines',
    type: 'multi-step',
    title: 'Swap Lines',
    description: 'Move the highlighted line down by one position',
    difficulty: 3,
    requiredCommands: ['dd', 'p'],
    timeLimitSeconds: 12,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 3) return null

      const lineIdx = rng.nextInt(0, lines.length - 2)

      const expectedLines = [...lines]
      const tmp = expectedLines[lineIdx]
      expectedLines[lineIdx] = expectedLines[lineIdx + 1]
      expectedLines[lineIdx + 1] = tmp

      const offset = pickOffsetCursor(rng, lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'dd', description: 'Delete line' },
        { keys: 'p', description: 'Paste below' },
      ]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: totalKeystrokes,
        description: `Swap line ${lineIdx + 1} with line ${lineIdx + 2}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
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
    id: 'delete-inside-quotes',
    type: 'delete',
    title: 'Delete Inside Quotes',
    description: 'Delete the text inside the quotes',
    difficulty: 4,
    requiredCommands: ['di"'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; start: number; end: number; content: string; quote: string }> = []

      for (let i = 0; i < lines.length; i++) {
        const dqMatches: RegExpExecArray[] = []
        const dqRegex = /"([^"]{2,})"/g
        let m: RegExpExecArray | null
        while ((m = dqRegex.exec(lines[i])) !== null) dqMatches.push(m)
        if (dqMatches.length === 1) {
          const dm = dqMatches[0]
          candidates.push({ lineIdx: i, start: dm.index + 1, end: dm.index + 1 + dm[1].length, content: dm[1], quote: '"' })
        }

        const sqMatches: RegExpExecArray[] = []
        const sqRegex = /'([^']{2,})'/g
        while ((m = sqRegex.exec(lines[i])) !== null) sqMatches.push(m)
        if (sqMatches.length === 1 && dqMatches.length === 0) {
          const sm = sqMatches[0]
          candidates.push({ lineIdx: i, start: sm.index + 1, end: sm.index + 1 + sm[1].length, content: sm[1], quote: "'" })
        }
      }

      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.start) + line.slice(chosen.end)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const cmd = `di${chosen.quote}`
      const actionSteps: SolutionStep[] = [{ keys: cmd, description: `Delete inside ${chosen.quote === '"' ? 'double' : 'single'} quotes` }]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: totalKeystrokes,
        description: `Delete the content inside the ${chosen.quote === '"' ? 'double' : 'single'} quotes`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.start - 1,
          toLine: chosen.lineIdx,
          toCol: chosen.end + 1,
        },
      }
    },
  },

  {
    id: 'change-inside-parens',
    type: 'change',
    title: 'Change Inside Parentheses',
    description: 'Replace the content inside the parentheses',
    difficulty: 4,
    requiredCommands: ['ci('],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; start: number; end: number; content: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const parenRegex = /\(([^()]{2,15})\)/g
        let m: RegExpExecArray | null
        while ((m = parenRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, start: m.index + 1, end: m.index + 1 + m[1].length, content: m[1] })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['x', 'n', 'i', 'value', 'data', 'null']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.start) + replacement + line.slice(chosen.end)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'ci(', description: 'Change inside parentheses' },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: totalKeystrokes,
        description: `Change content inside parentheses to "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.start - 1,
          toLine: chosen.lineIdx,
          toCol: chosen.end + 1,
        },
      }
    },
  },

  {
    id: 'delete-around-word',
    type: 'delete',
    title: 'Delete Around Word',
    description: 'Delete the word and surrounding space',
    difficulty: 4,
    requiredCommands: ['daw'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.trim().split(/\s+/).length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /\w{2,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        const hasSpaceBefore = match.index > 0 && /\s/.test(chosen.line[match.index - 1])
        const hasSpaceAfter = match.index + match[0].length < chosen.line.length && /\s/.test(chosen.line[match.index + match[0].length])
        if (hasSpaceBefore || hasSpaceAfter) {
          words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
        }
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]

      let dawStart = word.start
      let dawEnd = word.end
      if (dawEnd < chosen.line.length && /\s/.test(chosen.line[dawEnd])) {
        while (dawEnd < chosen.line.length && /\s/.test(chosen.line[dawEnd])) dawEnd++
      } else if (dawStart > 0 && /\s/.test(chosen.line[dawStart - 1])) {
        while (dawStart > 0 && /\s/.test(chosen.line[dawStart - 1])) dawStart--
      }

      const newLine = chosen.line.slice(0, dawStart) + chosen.line.slice(dawEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'daw', description: 'Delete around word' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Remove '${word.text}' and its surrounding space`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: dawStart,
          toLine: chosen.index,
          toCol: dawEnd,
        },
      }
    },
  },

  {
    id: 'scroll-delete-line',
    type: 'delete',
    title: 'Scroll and Delete Line',
    description: 'Navigate to a distant line and delete it',
    difficulty: 3,
    requiredCommands: ['dd', 'G'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const lineIdx = rng.nextInt(0, lines.length - 1)
      const expectedLines = lines.filter((_, i) => i !== lineIdx)

      const offset = pickFarCursor(rng, lineIdx, lines.length)

      const actionSteps: SolutionStep[] = [{ keys: 'dd', description: 'Delete line' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, lineIdx, 0,
        lines[lineIdx], lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: lineIdx, column: 0 },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete line ${lineIdx + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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
    id: 'scroll-change-word',
    type: 'change',
    title: 'Scroll and Change Word',
    description: 'Navigate to a distant word and change it',
    difficulty: 4,
    requiredCommands: ['ciw', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /\w{3,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /\w{3,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const replacementWords = ['value', 'result', 'output', 'target', 'input', 'count']
      let replacement = replacementWords[rng.nextInt(0, replacementWords.length - 1)]
      if (replacement === word.text) replacement = 'updated'

      const newLine = chosen.line.slice(0, word.start) + replacement + chosen.line.slice(word.end)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickFarCursor(rng, chosen.index, lines.length)

      const actionSteps: SolutionStep[] = [
        { keys: 'ciw', description: 'Change inner word' },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, word.start,
        chosen.line, lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Rename '${word.text}' to "${replacement}" on line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  ...BASE_TEMPLATES,
  ...EXTRA_TEMPLATES,
]
