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

export const EXTRA_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'delete-back-char',
    type: 'delete',
    title: 'Delete Character Before Cursor',
    description: 'Delete the extra character before the cursor position',
    difficulty: 1,
    requiredCommands: ['X'],
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

      const targetCol = insertCol + 1
      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const actionSteps: SolutionStep[] = [{ keys: 'X', description: 'Delete character before cursor' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, targetCol, corruptedLine, actionSteps)

      const corruptedWord = word.text.slice(0, charIdx) + dupChar + word.text.slice(charIdx)
      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: targetCol },
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
    id: 'substitute-char',
    type: 'change',
    title: 'Substitute Character',
    description: 'Replace a single character with new text using s',
    difficulty: 2,
    requiredCommands: ['s'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; col: number; digit: string }> = []
      for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++) {
          const ch = lines[i][j]
          if (/\d/.test(ch)) {
            const before = j > 0 ? lines[i][j - 1] : ' '
            const after = j < lines[i].length - 1 ? lines[i][j + 1] : ' '
            if (!/\d/.test(before) && !/\d/.test(after)) {
              candidates.push({ lineIdx: i, col: j, digit: ch })
            }
          }
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['10', '20', '42', '99', '15', '32']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.col) + replacement + line.slice(chosen.col + 1)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 's', description: 'Substitute character' },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, chosen.col, line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.col },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Replace '${chosen.digit}' with "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.col,
          toLine: chosen.lineIdx,
          toCol: chosen.col + 1,
        },
      }
    },
  },

  {
    id: 'delete-multiple-chars',
    type: 'delete',
    title: 'Delete Multiple Characters',
    description: 'Delete several extra characters at once',
    difficulty: 2,
    requiredCommands: ['x'],
    timeLimitSeconds: 12,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[a-zA-Z]{4,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /[a-zA-Z]{4,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const count = rng.nextInt(2, Math.min(3, Math.floor(word.text.length / 2)))
      const charOffset = rng.nextInt(0, Math.max(0, word.text.length - count))
      const insertPos = word.start + charOffset
      const extraChars = word.text.slice(charOffset, charOffset + count)

      const corruptedLine = chosen.line.slice(0, insertPos) + extraChars + chosen.line.slice(insertPos)
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = corruptedLine

      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const actionSteps: SolutionStep[] = [{ keys: `${count}x`, description: `Delete ${count} characters` }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, insertPos, corruptedLine, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: insertPos },
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete ${count} extra characters at the highlighted position`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: insertPos,
          toLine: chosen.index,
          toCol: insertPos + count,
        },
      }
    },
  },

  {
    id: 'toggle-case',
    type: 'change',
    title: 'Toggle Case',
    description: 'Fix the character case using ~',
    difficulty: 2,
    requiredCommands: ['~'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; col: number; original: string }> = []
      for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++) {
          const ch = lines[i][j]
          if (/[a-zA-Z]/.test(ch)) {
            candidates.push({ lineIdx: i, col: j, original: ch })
          }
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const toggled = chosen.original === chosen.original.toUpperCase()
        ? chosen.original.toLowerCase()
        : chosen.original.toUpperCase()

      const corruptedLine = lines[chosen.lineIdx].slice(0, chosen.col) + toggled + lines[chosen.lineIdx].slice(chosen.col + 1)
      const corruptedLines = [...lines]
      corruptedLines[chosen.lineIdx] = corruptedLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, corruptedLines.length, corruptedLines)
      const actionSteps: SolutionStep[] = [{ keys: '~', description: 'Toggle case' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, chosen.col, corruptedLine, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.col },
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Toggle '${toggled}' to '${chosen.original}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.col,
          toLine: chosen.lineIdx,
          toCol: chosen.col + 1,
        },
      }
    },
  },

  {
    id: 'transpose-chars',
    type: 'multi-step',
    title: 'Transpose Characters',
    description: 'Fix the swapped characters using xp',
    difficulty: 2,
    requiredCommands: ['x', 'p'],
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
      let swapIdx: number
      let attempts = 0
      do {
        swapIdx = rng.nextInt(0, word.text.length - 2)
        attempts++
      } while (word.text[swapIdx] === word.text[swapIdx + 1] && attempts < 10)
      if (word.text[swapIdx] === word.text[swapIdx + 1]) return null

      const col = word.start + swapIdx
      const ch1 = chosen.line[col]
      const ch2 = chosen.line[col + 1]

      const corruptedLine = chosen.line.slice(0, col) + ch2 + ch1 + chosen.line.slice(col + 2)
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = corruptedLine

      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const actionSteps: SolutionStep[] = [
        { keys: 'x', description: 'Delete character' },
        { keys: 'p', description: 'Paste after' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, corruptedLine, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Fix swapped characters '${ch2}${ch1}' → '${ch1}${ch2}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: col,
          toLine: chosen.index,
          toCol: col + 2,
        },
      }
    },
  },

  {
    id: 'change-end-word',
    type: 'change',
    title: 'Change to End of Word',
    description: 'Change from cursor to end of word',
    difficulty: 3,
    requiredCommands: ['ce'],
    timeLimitSeconds: 18,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

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
      const replacementWords = ['data', 'item', 'node', 'list', 'temp', 'flag', 'size']
      let replacement = replacementWords[rng.nextInt(0, replacementWords.length - 1)]
      if (replacement === word.text) replacement = 'updated'

      const newLine = chosen.line.slice(0, word.start) + replacement + chosen.line.slice(word.end)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'ce', description: 'Change to end of word' },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Change '${word.text}' to "${replacement}"`,
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
    id: 'delete-find-char',
    type: 'delete',
    title: 'Delete Through Character',
    description: 'Delete from cursor through the specified character',
    difficulty: 3,
    requiredCommands: ['df'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; startCol: number; endCol: number; targetChar: string; text: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const pattern = /(\w{2,})([.,;:()\[\]])/g
        let m: RegExpExecArray | null
        while ((m = pattern.exec(lines[i])) !== null) {
          candidates.push({
            lineIdx: i,
            startCol: m.index,
            endCol: m.index + m[0].length,
            targetChar: m[2],
            text: m[0],
          })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.startCol) + line.slice(chosen.endCol)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: `df${chosen.targetChar}`, description: `Delete through '${chosen.targetChar}'` },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, chosen.startCol, line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.startCol },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete "${chosen.text}" using df${chosen.targetChar}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.startCol,
          toLine: chosen.lineIdx,
          toCol: chosen.endCol,
        },
      }
    },
  },

  {
    id: 'yank-paste-above',
    type: 'yank-paste',
    title: 'Yank and Paste Above',
    description: 'Duplicate the highlighted line above it',
    difficulty: 3,
    requiredCommands: ['yy', 'P'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 3) return null

      const lineIdx = rng.nextInt(1, lines.length - 1)
      const newLines = [...lines]
      newLines.splice(lineIdx, 0, lines[lineIdx])

      const offset = pickOffsetCursor(rng, lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'yy', description: 'Yank line' },
        { keys: 'P', description: 'Paste above' },
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
        description: `Duplicate line ${lineIdx + 1} above itself`,
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
    id: 'delete-multiple-lines',
    type: 'delete',
    title: 'Delete Multiple Lines',
    description: 'Delete several consecutive lines at once',
    difficulty: 3,
    requiredCommands: ['dd'],
    timeLimitSeconds: 12,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 4) return null

      const count = rng.nextInt(2, Math.min(3, lines.length - 2))
      const maxStart = lines.length - count
      const startLine = rng.nextInt(0, maxStart)

      const expectedLines = [...lines]
      expectedLines.splice(startLine, count)

      const offset = pickOffsetCursor(rng, startLine, lines.length, lines)
      const vStep = verticalStep(offset.line, startLine)
      const actionSteps: SolutionStep[] = [
        { keys: `${count}dd`, description: `Delete ${count} lines` },
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
        description: `Delete lines ${startLine + 1}–${startLine + count}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: startLine,
          fromCol: 0,
          toLine: startLine + count - 1,
          toCol: lines[startLine + count - 1].length,
        },
      }
    },
  },

  {
    id: 'delete-to-bol',
    type: 'delete',
    title: 'Delete to Line Start',
    description: 'Delete from cursor to the start of the line',
    difficulty: 3,
    requiredCommands: ['d0'],
    timeLimitSeconds: 12,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.length >= 6)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const minCol = Math.max(2, Math.floor(chosen.line.length / 3))
      const maxCol = Math.floor(chosen.line.length * 2 / 3)
      if (minCol > maxCol) return null
      const col = rng.nextInt(minCol, maxCol)

      const newLine = chosen.line.slice(col)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'd0', description: 'Delete to start of line' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete everything before column ${col + 1} on line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: col,
        },
      }
    },
  },

  {
    id: 'change-inside-braces',
    type: 'change',
    title: 'Change Inside Braces',
    description: 'Replace the content inside the curly braces',
    difficulty: 4,
    requiredCommands: ['ci{'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; start: number; end: number; content: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const braceRegex = /\{([^{}]{2,30})\}/g
        let m: RegExpExecArray | null
        while ((m = braceRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, start: m.index + 1, end: m.index + 1 + m[1].length, content: m[1] })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['x', 'data', 'null', '0', 'true']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.start) + replacement + line.slice(chosen.end)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'ci{', description: 'Change inside braces' },
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
        description: `Change content inside braces to "${replacement}"`,
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
    id: 'change-inside-quotes',
    type: 'change',
    title: 'Change Inside Quotes',
    description: 'Replace the text inside the quotes',
    difficulty: 4,
    requiredCommands: ['ci"'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; start: number; end: number; quote: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const dqMatches: RegExpExecArray[] = []
        const dqRegex = /"([^"]{2,})"/g
        let m: RegExpExecArray | null
        while ((m = dqRegex.exec(lines[i])) !== null) dqMatches.push(m)
        if (dqMatches.length === 1) {
          const dm = dqMatches[0]
          candidates.push({ lineIdx: i, start: dm.index + 1, end: dm.index + 1 + dm[1].length, quote: '"' })
        }

        const sqMatches: RegExpExecArray[] = []
        const sqRegex = /'([^']{2,})'/g
        while ((m = sqRegex.exec(lines[i])) !== null) sqMatches.push(m)
        if (sqMatches.length === 1 && dqMatches.length === 0) {
          const sm = sqMatches[0]
          candidates.push({ lineIdx: i, start: sm.index + 1, end: sm.index + 1 + sm[1].length, quote: "'" })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['hello', 'world', 'test', 'done', 'error', 'ok']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.start) + replacement + line.slice(chosen.end)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const cmd = `ci${chosen.quote}`
      const actionSteps: SolutionStep[] = [
        { keys: cmd, description: `Change inside ${chosen.quote === '"' ? 'double' : 'single'} quotes` },
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
        description: `Change content inside ${chosen.quote === '"' ? 'double' : 'single'} quotes to "${replacement}"`,
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
    id: 'delete-inside-parens',
    type: 'delete',
    title: 'Delete Inside Parentheses',
    description: 'Delete the content inside the parentheses',
    difficulty: 4,
    requiredCommands: ['di('],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; start: number; end: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const parenRegex = /\(([^()]{2,15})\)/g
        let m: RegExpExecArray | null
        while ((m = parenRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, start: m.index + 1, end: m.index + 1 + m[1].length })
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
      const actionSteps: SolutionStep[] = [{ keys: 'di(', description: 'Delete inside parentheses' }]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: totalKeystrokes,
        description: 'Delete the content inside the parentheses',
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
    id: 'visual-delete-lines',
    type: 'delete',
    title: 'Visual Line Delete',
    description: 'Select lines in visual mode and delete them',
    difficulty: 4,
    requiredCommands: ['V', 'j', 'd'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 5) return null

      const count = rng.nextInt(2, Math.min(3, lines.length - 2))
      const maxStart = lines.length - count
      const startLine = rng.nextInt(0, maxStart)

      const expectedLines = [...lines]
      expectedLines.splice(startLine, count)

      const offset = pickOffsetCursor(rng, startLine, lines.length, lines)
      const vStep = verticalStep(offset.line, startLine)
      const jKeys = count > 2 ? `${count - 1}j` : 'j'
      const actionSteps: SolutionStep[] = [
        { keys: 'V', description: 'Enter visual line mode' },
        { keys: jKeys, description: `Select ${count - 1} more line${count > 2 ? 's' : ''}` },
        { keys: 'd', description: 'Delete selection' },
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
        description: `Select and delete lines ${startLine + 1}–${startLine + count}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: startLine,
          fromCol: 0,
          toLine: startLine + count - 1,
          toCol: lines[startLine + count - 1].length,
        },
      }
    },
  },

  {
    id: 'change-till-char',
    type: 'change',
    title: 'Change Till Character',
    description: 'Change text from cursor up to (not including) a character',
    difficulty: 4,
    requiredCommands: ['ct'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; startCol: number; endCol: number; targetChar: string; word: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const pattern = /(\w{2,})([.,;:()\[\]])/g
        let m: RegExpExecArray | null
        while ((m = pattern.exec(lines[i])) !== null) {
          candidates.push({
            lineIdx: i,
            startCol: m.index,
            endCol: m.index + m[1].length,
            targetChar: m[2],
            word: m[1],
          })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['x', 'val', 'tmp', 'res', 'out']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.startCol) + replacement + line.slice(chosen.endCol)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: `ct${chosen.targetChar}`, description: `Change till '${chosen.targetChar}'` },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, chosen.startCol, line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.startCol },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Change '${chosen.word}' to "${replacement}" (till '${chosen.targetChar}')`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.startCol,
          toLine: chosen.lineIdx,
          toCol: chosen.endCol,
        },
      }
    },
  },

  // ── Scroll challenges (require long snippets, 20+ lines) ──────

  {
    id: 'open-line-below',
    type: 'change',
    title: 'Open Line Below',
    description: 'Insert a new line below and type the missing code',
    difficulty: 2,
    requiredCommands: ['o'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 3) return null

      const lineIdx = rng.nextInt(0, lines.length - 2)
      const nextLine = lines[lineIdx + 1]
      const trimmed = nextLine.trimStart()
      if (trimmed.length < 3 || trimmed.length > 20) return null

      const corruptedLines = lines.filter((_, i) => i !== lineIdx + 1)

      const indent = nextLine.length - trimmed.length
      const indentStr = nextLine.slice(0, indent)
      const textToType = indentStr + trimmed

      const offset = pickOffsetCursor(rng, lineIdx, corruptedLines.length, corruptedLines)
      const vStep = verticalStep(offset.line, lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'o', description: 'Open line below' },
        { keys: textToType, description: `Type "${trimmed}"` },
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
        description: `Add missing line below line ${lineIdx + 1}`,
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
    id: 'open-line-above',
    type: 'change',
    title: 'Open Line Above',
    description: 'Insert a new line above and type the missing code',
    difficulty: 2,
    requiredCommands: ['O'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 3) return null

      const lineIdx = rng.nextInt(1, lines.length - 1)
      const targetLine = lines[lineIdx]
      const trimmed = targetLine.trimStart()
      if (trimmed.length < 3 || trimmed.length > 20) return null

      const corruptedLines = lines.filter((_, i) => i !== lineIdx)

      const indent = targetLine.length - trimmed.length
      const indentStr = targetLine.slice(0, indent)
      const textToType = indentStr + trimmed

      const belowIdx = Math.min(lineIdx, corruptedLines.length - 1)
      const offset = pickOffsetCursor(rng, belowIdx, corruptedLines.length, corruptedLines)
      const vStep = verticalStep(offset.line, belowIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'O', description: 'Open line above' },
        { keys: textToType, description: `Type "${trimmed}"` },
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
        description: `Add missing line above line ${belowIdx + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: belowIdx,
          fromCol: 0,
          toLine: belowIdx,
          toCol: corruptedLines[belowIdx].length,
        },
      }
    },
  },

  {
    id: 'substitute-line',
    type: 'change',
    title: 'Substitute Entire Line',
    description: 'Replace the entire line content using cc',
    difficulty: 3,
    requiredCommands: ['cc'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => {
          const trimmed = line.trimStart()
          return trimmed.length >= 4 && trimmed.length <= 25
        })
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const indent = chosen.line.length - chosen.line.trimStart().length
      const indentStr = chosen.line.slice(0, indent)
      const replacements = ['return null', 'break', 'continue', 'return 0', 'return true', 'pass']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const expectedLine = indentStr + replacement
      const expectedLines = [...lines]
      expectedLines[chosen.index] = expectedLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.index)
      const actionSteps: SolutionStep[] = [
        { keys: 'cc', description: 'Substitute line' },
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
        description: `Replace line ${chosen.index + 1} with "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: chosen.line.length,
        },
      }
    },
  },

  {
    id: 'delete-till-char',
    type: 'delete',
    title: 'Delete Till Character',
    description: 'Delete from cursor up to (not including) a character',
    difficulty: 3,
    requiredCommands: ['dt'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; startCol: number; endCol: number; targetChar: string; text: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const pattern = /(\w{2,})([.,;:()\[\]])/g
        let m: RegExpExecArray | null
        while ((m = pattern.exec(lines[i])) !== null) {
          candidates.push({
            lineIdx: i,
            startCol: m.index,
            endCol: m.index + m[1].length,
            targetChar: m[2],
            text: m[1],
          })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.startCol) + line.slice(chosen.endCol)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: `dt${chosen.targetChar}`, description: `Delete till '${chosen.targetChar}'` },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, chosen.startCol, line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.startCol },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete "${chosen.text}" before '${chosen.targetChar}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.startCol,
          toLine: chosen.lineIdx,
          toCol: chosen.endCol,
        },
      }
    },
  },

  {
    id: 'indent-line',
    type: 'change',
    title: 'Indent Line',
    description: 'Add indentation to the highlighted line',
    difficulty: 3,
    requiredCommands: ['>>'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]

      const dedentedLine = chosen.line.startsWith('  ')
        ? chosen.line.slice(2)
        : chosen.line
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = dedentedLine

      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const vStep = verticalStep(offset.line, chosen.index)
      const actionSteps: SolutionStep[] = [{ keys: '>>', description: 'Indent line' }]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        expectedContent: snippet.content,
        referenceKeystrokeCount: totalKeystrokes,
        description: `Indent line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: dedentedLine.length,
        },
      }
    },
  },

  {
    id: 'dedent-line',
    type: 'change',
    title: 'Dedent Line',
    description: 'Remove indentation from the highlighted line',
    difficulty: 3,
    requiredCommands: ['<<'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.startsWith('  ') && line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]

      const indentedLine = '  ' + chosen.line
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = indentedLine

      const offset = pickOffsetCursor(rng, chosen.index, corruptedLines.length, corruptedLines)
      const vStep = verticalStep(offset.line, chosen.index)
      const actionSteps: SolutionStep[] = [{ keys: '<<', description: 'Dedent line' }]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        expectedContent: snippet.content,
        referenceKeystrokeCount: totalKeystrokes,
        description: `Remove indentation from line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: indentedLine.length,
        },
      }
    },
  },

  {
    id: 'delete-around-quotes',
    type: 'delete',
    title: 'Delete Around Quotes',
    description: 'Delete the quoted string including the quote marks',
    difficulty: 4,
    requiredCommands: ['da"'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; outerStart: number; outerEnd: number; quote: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const dqRegex = /"([^"]{2,})"/g
        let m: RegExpExecArray | null
        while ((m = dqRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length, quote: '"' })
        }
        const sqRegex = /'([^']{2,})'/g
        while ((m = sqRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length, quote: "'" })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.outerStart) + line.slice(chosen.outerEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const cmd = `da${chosen.quote}`
      const actionSteps: SolutionStep[] = [
        { keys: cmd, description: `Delete around ${chosen.quote === '"' ? 'double' : 'single'} quotes` },
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
        description: `Delete the quoted string including ${chosen.quote === '"' ? 'double' : 'single'} quotes`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.outerStart,
          toLine: chosen.lineIdx,
          toCol: chosen.outerEnd,
        },
      }
    },
  },

  {
    id: 'delete-around-parens',
    type: 'delete',
    title: 'Delete Around Parentheses',
    description: 'Delete the parenthesized expression including the parens',
    difficulty: 4,
    requiredCommands: ['da('],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; outerStart: number; outerEnd: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const parenRegex = /\(([^()]{2,15})\)/g
        let m: RegExpExecArray | null
        while ((m = parenRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.outerStart) + line.slice(chosen.outerEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'da(', description: 'Delete around parentheses' },
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
        description: 'Delete the parenthesized expression including parens',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.outerStart,
          toLine: chosen.lineIdx,
          toCol: chosen.outerEnd,
        },
      }
    },
  },

  {
    id: 'change-around-word',
    type: 'change',
    title: 'Change Around Word',
    description: 'Change the word and its surrounding space',
    difficulty: 4,
    requiredCommands: ['caw'],
    timeLimitSeconds: 18,
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
        const hasSpaceAfter = match.index + match[0].length < chosen.line.length && /\s/.test(chosen.line[match.index + match[0].length])
        if (hasSpaceAfter) {
          words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
        }
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const replacementWords = ['x', 'val', 'key', 'new', 'old']
      let replacement = replacementWords[rng.nextInt(0, replacementWords.length - 1)]
      if (replacement === word.text) replacement = 'tmp'

      let cawEnd = word.end
      while (cawEnd < chosen.line.length && /\s/.test(chosen.line[cawEnd])) cawEnd++

      const newLine = chosen.line.slice(0, word.start) + replacement + ' ' + chosen.line.slice(cawEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'caw', description: 'Change around word' },
        { keys: replacement + ' ', description: `Type "${replacement} "` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Change '${word.text}' and its space to "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: word.start,
          toLine: chosen.index,
          toCol: cawEnd,
        },
      }
    },
  },

  {
    id: 'delete-word-backward',
    type: 'delete',
    title: 'Delete Word Backward',
    description: 'Delete the word before the cursor',
    difficulty: 3,
    requiredCommands: ['db'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /\w{2,}\s+\w/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const wordBoundaries: Array<{ wordStart: number; wordEnd: number; text: string; nextStart: number }> = []
      const regex = /\w{2,}/g
      let match: RegExpExecArray | null
      const allWords: Array<{ start: number; end: number; text: string }> = []
      while ((match = regex.exec(chosen.line)) !== null) {
        allWords.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      for (let w = 0; w < allWords.length - 1; w++) {
        const cur = allWords[w]
        const next = allWords[w + 1]
        if (next.start > cur.end) {
          wordBoundaries.push({ wordStart: cur.start, wordEnd: cur.end, text: cur.text, nextStart: next.start })
        }
      }
      if (wordBoundaries.length === 0) return null

      const chosen2 = wordBoundaries[rng.nextInt(0, wordBoundaries.length - 1)]
      const newLine = chosen.line.slice(0, chosen2.wordStart) + chosen.line.slice(chosen2.wordEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const cursorCol = chosen2.wordEnd
      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'db', description: 'Delete word backward' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, cursorCol, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: cursorCol },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete '${chosen2.text}' backward`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: chosen2.wordStart,
          toLine: chosen.index,
          toCol: chosen2.wordEnd,
        },
      }
    },
  },

  {
    id: 'delete-inside-brackets',
    type: 'delete',
    title: 'Delete Inside Brackets',
    description: 'Delete the content inside the square brackets',
    difficulty: 4,
    requiredCommands: ['di['],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; start: number; end: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const bracketRegex = /\[([^\[\]]{2,20})\]/g
        let m: RegExpExecArray | null
        while ((m = bracketRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, start: m.index + 1, end: m.index + 1 + m[1].length })
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
      const actionSteps: SolutionStep[] = [{ keys: 'di[', description: 'Delete inside brackets' }]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: totalKeystrokes,
        description: 'Delete the content inside the square brackets',
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
    id: 'change-inside-brackets',
    type: 'change',
    title: 'Change Inside Brackets',
    description: 'Replace the content inside the square brackets',
    difficulty: 4,
    requiredCommands: ['ci['],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; start: number; end: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const bracketRegex = /\[([^\[\]]{2,20})\]/g
        let m: RegExpExecArray | null
        while ((m = bracketRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, start: m.index + 1, end: m.index + 1 + m[1].length })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['0', 'i', 'key', 'idx', 'n']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.start) + replacement + line.slice(chosen.end)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'ci[', description: 'Change inside brackets' },
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
        description: `Change content inside brackets to "${replacement}"`,
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
    id: 'delete-around-braces',
    type: 'delete',
    title: 'Delete Around Braces',
    description: 'Delete the braced expression including the braces',
    difficulty: 4,
    requiredCommands: ['da{'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; outerStart: number; outerEnd: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const braceRegex = /\{([^{}]{2,30})\}/g
        let m: RegExpExecArray | null
        while ((m = braceRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.outerStart) + line.slice(chosen.outerEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'da{', description: 'Delete around braces' },
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
        description: 'Delete the braced expression including braces',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.outerStart,
          toLine: chosen.lineIdx,
          toCol: chosen.outerEnd,
        },
      }
    },
  },

  {
    id: 'yank-word-paste',
    type: 'yank-paste',
    title: 'Yank Word and Paste',
    description: 'Copy a word and paste it at another location',
    difficulty: 4,
    requiredCommands: ['yw', 'p'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
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
      const range = getDeleteWordRange(chosen.line, word.start)
      const yankedText = chosen.line.slice(range.start, range.end)

      const insertCol = chosen.line.length > word.end + 2
        ? rng.nextInt(word.end + 1, Math.min(word.end + 5, chosen.line.length - 1))
        : chosen.line.length - 1
      if (insertCol <= word.end) return null

      const newLine = chosen.line.slice(0, insertCol + 1) + yankedText + chosen.line.slice(insertCol + 1)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'yw', description: 'Yank word' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      const navToInsert = insertCol - word.start
      const pasteSteps: SolutionStep[] = [
        { keys: `${navToInsert}l`, description: `Move right ${navToInsert}` },
        { keys: 'p', description: 'Paste after cursor' },
      ]
      const totalExtra = pasteSteps.reduce((n, s) => n + countStepKeys(s), 0)
      for (const sol of solutions) {
        sol.steps.push(...pasteSteps)
        sol.totalKeystrokes += totalExtra
      }

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Copy '${word.text}' and paste it after column ${insertCol + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: word.start,
          toLine: chosen.index,
          toCol: range.end,
        },
      }
    },
  },

  {
    id: 'scroll-delete-to-eol',
    type: 'delete',
    title: 'Scroll and Delete to End',
    description: 'Navigate to a distant line and delete to end of line',
    difficulty: 5,
    requiredCommands: ['D', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.length >= 6)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const maxCol = Math.max(1, Math.floor(chosen.line.length / 2))
      const col = rng.nextInt(1, maxCol)

      const newLine = chosen.line.slice(0, col)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickFarCursor(rng, chosen.index, lines.length)

      const actionSteps: SolutionStep[] = [{ keys: 'D', description: 'Delete to end of line' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, col,
        chosen.line, lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Truncate line ${chosen.index + 1} at column ${col + 1}`,
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

  // ── Scroll challenges (require long snippets, 20+ lines) ──────

  {
    id: 'scroll-replace-char',
    type: 'change',
    title: 'Scroll and Replace Character',
    description: 'Navigate to a distant character and replace it',
    difficulty: 5,
    requiredCommands: ['r', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

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

      const offset = pickFarCursor(rng, chosen.index, lines.length)

      const actionSteps: SolutionStep[] = [{ keys: `r${originalChar}`, description: `Replace with '${originalChar}'` }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, col,
        corruptedLine, lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Fix typo: replace '${typoChar}' with '${originalChar}' on line ${chosen.index + 1}`,
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
    id: 'scroll-delete-word',
    type: 'delete',
    title: 'Scroll and Delete Word',
    description: 'Navigate to a distant word and delete it',
    difficulty: 5,
    requiredCommands: ['dw', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /\w/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const wordStarts: number[] = []
      for (let j = 0; j < chosen.line.length; j++) {
        if (/\w/.test(chosen.line[j]) && (j === 0 || !/\w/.test(chosen.line[j - 1]))) {
          wordStarts.push(j)
        }
      }
      if (wordStarts.length === 0) return null

      const col = wordStarts[rng.nextInt(0, wordStarts.length - 1)]
      const range = getDeleteWordRange(chosen.line, col)
      const deletedWord = chosen.line.slice(range.start, range.end).trim()
      const newLine = chosen.line.slice(0, range.start) + chosen.line.slice(range.end)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickFarCursor(rng, chosen.index, lines.length)

      const actionSteps: SolutionStep[] = [{ keys: 'dw', description: 'Delete word' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, col,
        chosen.line, lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete '${deletedWord}' on line ${chosen.index + 1}`,
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
    id: 'scroll-join-lines',
    type: 'change',
    title: 'Scroll and Join Lines',
    description: 'Navigate to a distant line and join it with the next',
    difficulty: 4,
    requiredCommands: ['J', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

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

      const offset = pickFarCursor(rng, lineIdx, lines.length)

      const actionSteps: SolutionStep[] = [{ keys: 'J', description: 'Join lines' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, lineIdx, 0,
        lines[lineIdx], lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Join line ${lineIdx + 1} with the line below`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: lineIdx,
          fromCol: 0,
          toLine: lineIdx + 1,
          toCol: lines[lineIdx + 1].length,
        },
      }
    },
  },

  // ── Batch 4: More vim motions ──────────────────────────────

  {
    id: 'uppercase-word',
    type: 'change',
    title: 'Uppercase Word',
    description: 'Convert the word to uppercase using gUw',
    difficulty: 3,
    requiredCommands: ['gUw'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[a-z]{3,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /[a-z]{3,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const uppercased = word.text.toUpperCase()
      const newLine = chosen.line.slice(0, word.start) + uppercased + chosen.line.slice(word.end)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'gUw', description: 'Uppercase word' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Uppercase '${word.text}' to '${uppercased}'`,
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
    id: 'lowercase-word',
    type: 'change',
    title: 'Lowercase Word',
    description: 'Convert the word to lowercase using guw',
    difficulty: 3,
    requiredCommands: ['guw'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates: Array<{ lineIdx: number; start: number; end: number; text: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const regex = /[a-zA-Z]{3,}/g
        let match: RegExpExecArray | null
        while ((match = regex.exec(lines[i])) !== null) {
          const txt = match[0]
          if (txt !== txt.toLowerCase() && /[A-Z]/.test(txt)) {
            candidates.push({ lineIdx: i, start: match.index, end: match.index + txt.length, text: txt })
          }
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const lowered = chosen.text.toLowerCase()
      const newLine = lines[chosen.lineIdx].slice(0, chosen.start) + lowered + lines[chosen.lineIdx].slice(chosen.end)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'guw', description: 'Lowercase word' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, chosen.start, lines[chosen.lineIdx], actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Lowercase '${chosen.text}' to '${lowered}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.start,
          toLine: chosen.lineIdx,
          toCol: chosen.end,
        },
      }
    },
  },

  {
    id: 'delete-around-brackets',
    type: 'delete',
    title: 'Delete Around Brackets',
    description: 'Delete the bracketed expression including the brackets',
    difficulty: 4,
    requiredCommands: ['da['],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; outerStart: number; outerEnd: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const bracketRegex = /\[([^\[\]]{2,20})\]/g
        let m: RegExpExecArray | null
        while ((m = bracketRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.outerStart) + line.slice(chosen.outerEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const actionSteps: SolutionStep[] = [{ keys: 'da[', description: 'Delete around brackets' }]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: totalKeystrokes,
        description: 'Delete the bracketed expression including brackets',
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.outerStart,
          toLine: chosen.lineIdx,
          toCol: chosen.outerEnd,
        },
      }
    },
  },

  {
    id: 'change-around-parens',
    type: 'change',
    title: 'Change Around Parentheses',
    description: 'Replace the parenthesized expression including the parens',
    difficulty: 4,
    requiredCommands: ['ca('],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; outerStart: number; outerEnd: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const parenRegex = /\(([^()]{2,15})\)/g
        let m: RegExpExecArray | null
        while ((m = parenRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['(x)', '(0)', '(true)', '(data)', '(null)']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.outerStart) + replacement + line.slice(chosen.outerEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'ca(', description: 'Change around parentheses' },
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
        description: `Replace parenthesized expression with ${replacement}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.outerStart,
          toLine: chosen.lineIdx,
          toCol: chosen.outerEnd,
        },
      }
    },
  },

  {
    id: 'change-around-quotes',
    type: 'change',
    title: 'Change Around Quotes',
    description: 'Replace the quoted string including the quote marks',
    difficulty: 4,
    requiredCommands: ['ca"'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; outerStart: number; outerEnd: number; quote: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const dqRegex = /"([^"]{2,})"/g
        let m: RegExpExecArray | null
        while ((m = dqRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length, quote: '"' })
        }
        const sqRegex = /'([^']{2,})'/g
        while ((m = sqRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length, quote: "'" })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['"ok"', '"done"', '"test"', '"error"', '"null"']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.outerStart) + replacement + line.slice(chosen.outerEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const cmd = `ca${chosen.quote}`
      const actionSteps: SolutionStep[] = [
        { keys: cmd, description: `Change around ${chosen.quote === '"' ? 'double' : 'single'} quotes` },
        { keys: replacement, description: `Type ${replacement}` },
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
        description: `Replace quoted string with ${replacement}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.outerStart,
          toLine: chosen.lineIdx,
          toCol: chosen.outerEnd,
        },
      }
    },
  },

  {
    id: 'delete-inside-braces',
    type: 'delete',
    title: 'Delete Inside Braces',
    description: 'Delete the content inside the curly braces',
    difficulty: 4,
    requiredCommands: ['di{'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; start: number; end: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const braceRegex = /\{([^{}]{2,30})\}/g
        let m: RegExpExecArray | null
        while ((m = braceRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, start: m.index + 1, end: m.index + 1 + m[1].length })
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
      const actionSteps: SolutionStep[] = [{ keys: 'di{', description: 'Delete inside braces' }]
      const steps: SolutionStep[] = vStep ? [vStep, ...actionSteps] : [...actionSteps]
      const totalKeystrokes = steps.reduce((n, s) => n + countStepKeys(s), 0)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: totalKeystrokes,
        description: 'Delete the content inside the curly braces',
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
    id: 'append-after-word',
    type: 'change',
    title: 'Append After Word',
    description: 'Move to the end of a word and append text using ea',
    difficulty: 3,
    requiredCommands: ['e', 'a'],
    timeLimitSeconds: 18,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /\w{3,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /\w{3,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        if (match.index + match[0].length < chosen.line.length) {
          words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
        }
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const suffixes = ['ed', 'ly', 'er', 'ing', 's']
      const suffix = suffixes[rng.nextInt(0, suffixes.length - 1)]

      const newLine = chosen.line.slice(0, word.end) + suffix + chosen.line.slice(word.end)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'ea', description: 'Go to end of word and append' },
        { keys: suffix, description: `Type "${suffix}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Append "${suffix}" after '${word.text}'`,
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
    id: 'replace-mode',
    type: 'change',
    title: 'Replace Mode',
    description: 'Overwrite several characters using R (replace mode)',
    difficulty: 3,
    requiredCommands: ['R'],
    timeLimitSeconds: 18,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /\w{4,}/.test(line))
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const words: Array<{ start: number; end: number; text: string }> = []
      const regex = /\w{4,}/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        words.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (words.length === 0) return null

      const word = words[rng.nextInt(0, words.length - 1)]
      const replacementWords = ['data', 'temp', 'item', 'node', 'flag', 'size', 'base']
      let replacement = replacementWords[rng.nextInt(0, replacementWords.length - 1)]
      if (replacement.length > word.text.length) {
        replacement = replacement.slice(0, word.text.length)
      }
      if (replacement === word.text.slice(0, replacement.length)) replacement = 'zzzz'.slice(0, replacement.length)

      const newLine = chosen.line.slice(0, word.start) + replacement + chosen.line.slice(word.start + replacement.length)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'R', description: 'Enter replace mode' },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit replace mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Overwrite '${word.text.slice(0, replacement.length)}' with "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: word.start,
          toLine: chosen.index,
          toCol: word.start + replacement.length,
        },
      }
    },
  },

  {
    id: 'change-around-braces',
    type: 'change',
    title: 'Change Around Braces',
    description: 'Replace the braced expression including the braces',
    difficulty: 4,
    requiredCommands: ['ca{'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; outerStart: number; outerEnd: number }> = []
      for (let i = 0; i < lines.length; i++) {
        const braceRegex = /\{([^{}]{2,30})\}/g
        let m: RegExpExecArray | null
        while ((m = braceRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, outerStart: m.index, outerEnd: m.index + m[0].length })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['{x}', '{0}', '{null}', '{data}', '{true}']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.outerStart) + replacement + line.slice(chosen.outerEnd)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const vStep = verticalStep(offset.line, chosen.lineIdx)
      const actionSteps: SolutionStep[] = [
        { keys: 'ca{', description: 'Change around braces' },
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
        description: `Replace braced expression with ${replacement}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: [{ label: 'Optimal', steps, totalKeystrokes }],
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.outerStart,
          toLine: chosen.lineIdx,
          toCol: chosen.outerEnd,
        },
      }
    },
  },

  {
    id: 'scroll-toggle-case',
    type: 'change',
    title: 'Scroll and Toggle Case',
    description: 'Navigate to a distant character and toggle its case',
    difficulty: 5,
    requiredCommands: ['~', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates: Array<{ lineIdx: number; col: number; original: string }> = []
      for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++) {
          const ch = lines[i][j]
          if (/[a-zA-Z]/.test(ch)) {
            candidates.push({ lineIdx: i, col: j, original: ch })
          }
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const toggled = chosen.original === chosen.original.toUpperCase()
        ? chosen.original.toLowerCase()
        : chosen.original.toUpperCase()

      const corruptedLine = lines[chosen.lineIdx].slice(0, chosen.col) + toggled + lines[chosen.lineIdx].slice(chosen.col + 1)
      const corruptedLines = [...lines]
      corruptedLines[chosen.lineIdx] = corruptedLine

      const offset = pickFarCursor(rng, chosen.lineIdx, lines.length)

      const actionSteps: SolutionStep[] = [{ keys: '~', description: 'Toggle case' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.lineIdx, chosen.col,
        corruptedLine, lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.col },
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Fix case: '${toggled}' → '${chosen.original}' on line ${chosen.lineIdx + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.col,
          toLine: chosen.lineIdx,
          toCol: chosen.col + 1,
        },
      }
    },
  },

  // ── Batch 5: More vim motions ──────────────────────────────

  {
    id: 'change-char',
    type: 'change',
    title: 'Change Single Character',
    description: 'Delete a character and enter insert mode with cl',
    difficulty: 2,
    requiredCommands: ['cl'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates: Array<{ lineIdx: number; col: number; original: string }> = []
      for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++) {
          if (/[a-zA-Z]/.test(lines[i][j])) {
            candidates.push({ lineIdx: i, col: j, original: lines[i][j] })
          }
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = 'abcdefghijklmnopqrstuvwxyz'
      let replacement: string
      do {
        replacement = replacements[rng.nextInt(0, replacements.length - 1)]
      } while (replacement === chosen.original.toLowerCase())

      const corruptedLine = lines[chosen.lineIdx].slice(0, chosen.col) + replacement + lines[chosen.lineIdx].slice(chosen.col + 1)
      const corruptedLines = [...lines]
      corruptedLines[chosen.lineIdx] = corruptedLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, corruptedLines.length, corruptedLines)
      const actionSteps: SolutionStep[] = [
        { keys: 'cl', description: 'Change character' },
        { keys: chosen.original, description: `Type '${chosen.original}'` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, chosen.col, corruptedLine, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.col },
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Change '${replacement}' to '${chosen.original}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.col,
          toLine: chosen.lineIdx,
          toCol: chosen.col + 1,
        },
      }
    },
  },

  {
    id: 'delete-find-char-backward',
    type: 'delete',
    title: 'Delete Backward Through Character',
    description: 'Delete backward from cursor through a character using dF',
    difficulty: 4,
    requiredCommands: ['dF'],
    timeLimitSeconds: 18,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; charCol: number; endCol: number; targetChar: string; text: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const pattern = /([.,;:()[\]])([\w]{2,})/g
        let m: RegExpExecArray | null
        while ((m = pattern.exec(lines[i])) !== null) {
          candidates.push({
            lineIdx: i,
            charCol: m.index,
            endCol: m.index + m[0].length,
            targetChar: m[1],
            text: m[0],
          })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.charCol) + line.slice(chosen.endCol)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const cursorCol = chosen.endCol - 1
      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: `dF${chosen.targetChar}`, description: `Delete backward through '${chosen.targetChar}'` },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, cursorCol, line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: cursorCol },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete backward through '${chosen.targetChar}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.charCol,
          toLine: chosen.lineIdx,
          toCol: chosen.endCol,
        },
      }
    },
  },

  {
    id: 'change-find-char',
    type: 'change',
    title: 'Change Through Character',
    description: 'Change from cursor through a character using cf',
    difficulty: 4,
    requiredCommands: ['cf'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')

      const candidates: Array<{ lineIdx: number; startCol: number; endCol: number; targetChar: string; text: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const pattern = /(\w{2,})([.,;:()[\]])/g
        let m: RegExpExecArray | null
        while ((m = pattern.exec(lines[i])) !== null) {
          candidates.push({
            lineIdx: i,
            startCol: m.index,
            endCol: m.index + m[0].length,
            targetChar: m[2],
            text: m[0],
          })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['x', 'val', 'tmp', 'res']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.startCol) + replacement + line.slice(chosen.endCol)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: `cf${chosen.targetChar}`, description: `Change through '${chosen.targetChar}'` },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.lineIdx, chosen.startCol, line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.lineIdx, column: chosen.startCol },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Change "${chosen.text}" to "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.startCol,
          toLine: chosen.lineIdx,
          toCol: chosen.endCol,
        },
      }
    },
  },

  {
    id: 'visual-select-word-delete',
    type: 'delete',
    title: 'Visual Select Word and Delete',
    description: 'Select a word in visual mode and delete it',
    difficulty: 3,
    requiredCommands: ['viw', 'd'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
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
      const newLine = chosen.line.slice(0, word.start) + chosen.line.slice(word.end)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'viw', description: 'Select inner word' },
        { keys: 'd', description: 'Delete selection' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Select and delete '${word.text}'`,
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
    id: 'delete-to-first-nonblank',
    type: 'delete',
    title: 'Delete to First Non-blank',
    description: 'Delete from cursor to first non-whitespace character',
    difficulty: 3,
    requiredCommands: ['d^'],
    timeLimitSeconds: 12,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => {
          const indent = line.length - line.trimStart().length
          return indent >= 2 && line.trimStart().length >= 3
        })
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const firstNonBlank = chosen.line.length - chosen.line.trimStart().length
      const col = rng.nextInt(firstNonBlank + 1, Math.min(firstNonBlank + 5, chosen.line.length - 1))
      if (col <= firstNonBlank) return null

      const newLine = chosen.line.slice(0, firstNonBlank) + chosen.line.slice(col)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'd^', description: 'Delete to first non-blank' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete from column ${col + 1} back to first non-blank on line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: firstNonBlank,
          toLine: chosen.index,
          toCol: col,
        },
      }
    },
  },

  {
    id: 'change-to-bol',
    type: 'change',
    title: 'Change to Line Start',
    description: 'Change from cursor to the start of the line',
    difficulty: 3,
    requiredCommands: ['c0'],
    timeLimitSeconds: 18,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.length >= 6)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const minCol = Math.max(2, Math.floor(chosen.line.length / 3))
      const maxCol = Math.floor(chosen.line.length * 2 / 3)
      if (minCol > maxCol) return null
      const col = rng.nextInt(minCol, maxCol)

      const replacements = ['  ', '    ', '//', '# ']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const newLine = replacement + chosen.line.slice(col)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'c0', description: 'Change to start of line' },
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
        description: `Replace line start up to column ${col + 1} with "${replacement}"`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: col,
        },
      }
    },
  },

  {
    id: 'delete-big-word',
    type: 'delete',
    title: 'Delete WORD',
    description: 'Delete a WORD (whitespace-delimited) using dW',
    difficulty: 3,
    requiredCommands: ['dW'],
    timeLimitSeconds: 12,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.trim().split(/\s+/).length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const bigWords: Array<{ start: number; end: number; text: string }> = []
      const regex = /\S+/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        let end = match.index + match[0].length
        while (end < chosen.line.length && /\s/.test(chosen.line[end])) end++
        bigWords.push({ start: match.index, end, text: match[0] })
      }
      if (bigWords.length < 2) return null

      const idx = rng.nextInt(0, bigWords.length - 2)
      const word = bigWords[idx]
      const newLine = chosen.line.slice(0, word.start) + chosen.line.slice(word.end)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'dW', description: 'Delete WORD' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Delete WORD '${word.text}'`,
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
    id: 'change-big-word',
    type: 'change',
    title: 'Change WORD',
    description: 'Change a WORD (whitespace-delimited) using cW',
    difficulty: 3,
    requiredCommands: ['cW'],
    timeLimitSeconds: 18,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.trim().split(/\s+/).length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const bigWords: Array<{ start: number; end: number; text: string }> = []
      const regex = /\S+/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(chosen.line)) !== null) {
        bigWords.push({ start: match.index, end: match.index + match[0].length, text: match[0] })
      }
      if (bigWords.length < 2) return null

      const word = bigWords[rng.nextInt(0, bigWords.length - 1)]
      const replacements = ['XXX', 'TODO', 'FIXME', 'null', 'void']
      let replacement = replacements[rng.nextInt(0, replacements.length - 1)]
      if (replacement === word.text) replacement = 'CHANGED'

      const newLine = chosen.line.slice(0, word.start) + replacement + chosen.line.slice(word.end)
      const expectedLines = [...lines]
      expectedLines[chosen.index] = newLine

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: 'cW', description: 'Change WORD' },
        { keys: replacement, description: `Type "${replacement}"` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, word.start, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: word.start },
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Change '${word.text}' to "${replacement}"`,
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
    id: 'scroll-indent-line',
    type: 'change',
    title: 'Scroll and Indent Line',
    description: 'Navigate to a distant line and indent it',
    difficulty: 5,
    requiredCommands: ['>>', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const dedentedLine = chosen.line.startsWith('  ')
        ? chosen.line.slice(2)
        : chosen.line
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = dedentedLine

      const offset = pickFarCursor(rng, chosen.index, lines.length)

      const actionSteps: SolutionStep[] = [{ keys: '>>', description: 'Indent line' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, 0,
        dedentedLine, corruptedLines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Scroll to line ${chosen.index + 1} and indent it`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: dedentedLine.length,
        },
      }
    },
  },

  {
    id: 'scroll-dedent-line',
    type: 'change',
    title: 'Scroll and Dedent Line',
    description: 'Navigate to a distant line and remove its indentation',
    difficulty: 5,
    requiredCommands: ['<<', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.startsWith('  ') && line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const indentedLine = '  ' + chosen.line
      const corruptedLines = [...lines]
      corruptedLines[chosen.index] = indentedLine

      const offset = pickFarCursor(rng, chosen.index, lines.length)

      const actionSteps: SolutionStep[] = [{ keys: '<<', description: 'Dedent line' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, 0,
        indentedLine, corruptedLines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: corruptedLines.join('\n'),
        initialCursor: offset,
        expectedContent: snippet.content,
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Scroll to line ${chosen.index + 1} and dedent it`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: indentedLine.length,
        },
      }
    },
  },

  {
    id: 'change-inside-word',
    type: 'change',
    title: 'Change Inside Word',
    description: 'Change the word under the cursor to a different word',
    difficulty: 2,
    requiredCommands: ['ciw'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates: Array<{ lineIdx: number; start: number; end: number; word: string }> = []

      for (let i = 0; i < lines.length; i++) {
        const wordRegex = /\b(\w{3,8})\b/g
        let m: RegExpExecArray | null
        while ((m = wordRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, start: m.index, end: m.index + m[0].length, word: m[0] })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['foo', 'bar', 'baz', 'tmp', 'val', 'key', 'out', 'src']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.start) + replacement + line.slice(chosen.end)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickOffsetCursor(rng, chosen.lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [
        { keys: `ciw${replacement}`, description: `Change word to '${replacement}'` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeSolutions(
        offset.line, offset.column, chosen.lineIdx, chosen.start,
        lines[chosen.lineIdx], actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Change '${chosen.word}' to '${replacement}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.start,
          toLine: chosen.lineIdx,
          toCol: chosen.end,
        },
      }
    },
  },

  {
    id: 'join-lines-no-space',
    type: 'change',
    title: 'Join Lines Without Space',
    description: 'Join the current line with the next without adding a space',
    difficulty: 3,
    requiredCommands: ['gJ'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 3) return null

      const candidates: number[] = []
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].length > 0 && lines[i + 1].length > 0) {
          candidates.push(i)
        }
      }
      if (candidates.length === 0) return null

      const lineIdx = candidates[rng.nextInt(0, candidates.length - 1)]
      const joinedLine = lines[lineIdx] + lines[lineIdx + 1]
      const expectedLines = [...lines]
      expectedLines.splice(lineIdx, 2, joinedLine)

      const offset = pickOffsetCursor(rng, lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'gJ', description: 'Join lines without space' }]
      const solutions = computeSolutions(
        offset.line, offset.column, lineIdx, 0,
        lines[lineIdx], actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Join line ${lineIdx + 1} with line below (no space)`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
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
    id: 'uppercase-line',
    type: 'change',
    title: 'Uppercase Entire Line',
    description: 'Convert the entire line to uppercase',
    difficulty: 3,
    requiredCommands: ['gUU'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[a-z]/.test(line) && line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const expectedLines = [...lines]
      expectedLines[chosen.index] = chosen.line.toUpperCase()

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'gUU', description: 'Uppercase entire line' }]
      const solutions = computeSolutions(
        offset.line, offset.column, chosen.index, 0,
        lines[chosen.index], actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Convert line ${chosen.index + 1} to uppercase`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: chosen.line.length,
        },
      }
    },
  },

  {
    id: 'lowercase-line',
    type: 'change',
    title: 'Lowercase Entire Line',
    description: 'Convert the entire line to lowercase',
    difficulty: 3,
    requiredCommands: ['guu'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[A-Z]/.test(line) && line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const expectedLines = [...lines]
      expectedLines[chosen.index] = chosen.line.toLowerCase()

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'guu', description: 'Lowercase entire line' }]
      const solutions = computeSolutions(
        offset.line, offset.column, chosen.index, 0,
        lines[chosen.index], actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Convert line ${chosen.index + 1} to lowercase`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: chosen.line.length,
        },
      }
    },
  },

  {
    id: 'toggle-case-line',
    type: 'change',
    title: 'Toggle Case Entire Line',
    description: 'Toggle the case of every character on the line',
    difficulty: 3,
    requiredCommands: ['g~~'],
    timeLimitSeconds: 10,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[a-zA-Z]/.test(line) && line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const toggled = chosen.line.split('').map(c => {
        if (c >= 'a' && c <= 'z') return c.toUpperCase()
        if (c >= 'A' && c <= 'Z') return c.toLowerCase()
        return c
      }).join('')
      const expectedLines = [...lines]
      expectedLines[chosen.index] = toggled

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'g~~', description: 'Toggle case of entire line' }]
      const solutions = computeSolutions(
        offset.line, offset.column, chosen.index, 0,
        lines[chosen.index], actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Toggle case of line ${chosen.index + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: chosen.line.length,
        },
      }
    },
  },

  {
    id: 'join-count-lines',
    type: 'change',
    title: 'Join Multiple Lines',
    description: 'Join several lines together using a count with J',
    difficulty: 3,
    requiredCommands: ['J'],
    timeLimitSeconds: 15,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 5) return null

      const count = rng.nextInt(3, 4)
      const maxStart = lines.length - count
      if (maxStart < 0) return null

      const candidates: number[] = []
      for (let i = 0; i <= maxStart; i++) {
        let valid = true
        for (let j = 0; j < count; j++) {
          if (lines[i + j].trimStart().length < 2) { valid = false; break }
        }
        if (valid) candidates.push(i)
      }
      if (candidates.length === 0) return null

      const lineIdx = candidates[rng.nextInt(0, candidates.length - 1)]
      let joined = lines[lineIdx]
      for (let j = 1; j < count; j++) {
        joined += ' ' + lines[lineIdx + j].trimStart()
      }
      const expectedLines = [...lines]
      expectedLines.splice(lineIdx, count, joined)

      const offset = pickOffsetCursor(rng, lineIdx, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: `${count}J`, description: `Join ${count} lines` }]
      const solutions = computeSolutions(
        offset.line, offset.column, lineIdx, 0,
        lines[lineIdx], actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Join ${count} lines starting at line ${lineIdx + 1}`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: lineIdx,
          fromCol: 0,
          toLine: lineIdx + count - 1,
          toCol: lines[lineIdx + count - 1].length,
        },
      }
    },
  },

  {
    id: 'scroll-uppercase-line',
    type: 'change',
    title: 'Scroll and Uppercase Line',
    description: 'Navigate to a distant line and convert it to uppercase',
    difficulty: 5,
    requiredCommands: ['gUU', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[a-z]/.test(line) && line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const expectedLines = [...lines]
      expectedLines[chosen.index] = chosen.line.toUpperCase()

      const offset = pickFarCursor(rng, chosen.index, lines.length)
      const actionSteps: SolutionStep[] = [{ keys: 'gUU', description: 'Uppercase entire line' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, 0,
        lines[chosen.index], lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Scroll to line ${chosen.index + 1} and uppercase it`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: chosen.line.length,
        },
      }
    },
  },

  {
    id: 'scroll-lowercase-line',
    type: 'change',
    title: 'Scroll and Lowercase Line',
    description: 'Navigate to a distant line and convert it to lowercase',
    difficulty: 5,
    requiredCommands: ['guu', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[A-Z]/.test(line) && line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const expectedLines = [...lines]
      expectedLines[chosen.index] = chosen.line.toLowerCase()

      const offset = pickFarCursor(rng, chosen.index, lines.length)
      const actionSteps: SolutionStep[] = [{ keys: 'guu', description: 'Lowercase entire line' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, 0,
        lines[chosen.index], lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Scroll to line ${chosen.index + 1} and lowercase it`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: chosen.line.length,
        },
      }
    },
  },

  {
    id: 'scroll-change-inside-word',
    type: 'change',
    title: 'Scroll and Change Word',
    description: 'Navigate to a distant word and change it using ciw',
    difficulty: 5,
    requiredCommands: ['ciw', 'G'],
    timeLimitSeconds: 25,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates: Array<{ lineIdx: number; start: number; end: number; word: string }> = []
      for (let i = 0; i < lines.length; i++) {
        const wordRegex = /\b(\w{3,8})\b/g
        let m: RegExpExecArray | null
        while ((m = wordRegex.exec(lines[i])) !== null) {
          candidates.push({ lineIdx: i, start: m.index, end: m.index + m[0].length, word: m[0] })
        }
      }
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const replacements = ['foo', 'bar', 'baz', 'tmp', 'val', 'key']
      const replacement = replacements[rng.nextInt(0, replacements.length - 1)]

      const line = lines[chosen.lineIdx]
      const newLine = line.slice(0, chosen.start) + replacement + line.slice(chosen.end)
      const expectedLines = [...lines]
      expectedLines[chosen.lineIdx] = newLine

      const offset = pickFarCursor(rng, chosen.lineIdx, lines.length)
      const actionSteps: SolutionStep[] = [
        { keys: `ciw${replacement}`, description: `Change word to '${replacement}'` },
        { keys: 'Escape', description: 'Exit insert mode' },
      ]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.lineIdx, chosen.start,
        lines[chosen.lineIdx], lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Scroll to and change '${chosen.word}' to '${replacement}'`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.lineIdx,
          fromCol: chosen.start,
          toLine: chosen.lineIdx,
          toCol: chosen.end,
        },
      }
    },
  },

  {
    id: 'scroll-toggle-case-line',
    type: 'change',
    title: 'Scroll and Toggle Case Line',
    description: 'Navigate to a distant line and toggle the case of every character',
    difficulty: 5,
    requiredCommands: ['g~~', 'G'],
    timeLimitSeconds: 20,
    generateChallenge(snippet: CodeSnippet, seed: number): GeneratedChallenge | null {
      const rng = new SeededRandom(seed)
      const lines = snippet.content.split('\n')
      if (lines.length < 20) return null

      const candidates = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => /[a-zA-Z]/.test(line) && line.trimStart().length >= 3)
      if (candidates.length === 0) return null

      const chosen = candidates[rng.nextInt(0, candidates.length - 1)]
      const toggled = chosen.line.split('').map(c => {
        if (c >= 'a' && c <= 'z') return c.toUpperCase()
        if (c >= 'A' && c <= 'Z') return c.toLowerCase()
        return c
      }).join('')
      const expectedLines = [...lines]
      expectedLines[chosen.index] = toggled

      const offset = pickFarCursor(rng, chosen.index, lines.length)
      const actionSteps: SolutionStep[] = [{ keys: 'g~~', description: 'Toggle case of entire line' }]
      const solutions = computeScrollSolutions(
        offset.line, offset.column, chosen.index, 0,
        lines[chosen.index], lines.length, actionSteps,
      )

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        expectedContent: expectedLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Scroll to line ${chosen.index + 1} and toggle its case`,
        timeLimit: this.timeLimitSeconds,
        difficulty: this.difficulty,
        requiredCommands: this.requiredCommands,
        optimalSolutions: solutions,
        targetHighlight: {
          fromLine: chosen.index,
          fromCol: 0,
          toLine: chosen.index,
          toCol: chosen.line.length,
        },
      }
    },
  },
]
