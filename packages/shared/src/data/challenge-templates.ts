import type { ChallengeTemplate, CodeSnippet, GeneratedChallenge, SolutionStep, ChallengeSolution } from '../types/challenge'
import { SeededRandom } from '../engine/ChallengeGenerator'

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
  lines: string[],
): { line: number; column: number } {
  if (totalLines <= 2) {
    const offsetLine = targetLine === 0 ? 1 : 0
    const lineLen = lines[offsetLine]?.length ?? 0
    const col = lineLen > 1 ? rng.nextInt(0, lineLen - 1) : 0
    return { line: offsetLine, column: col }
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

  const lineLen = lines[offsetLine]?.length ?? 0
  const col = lineLen > 1 ? rng.nextInt(0, lineLen - 1) : 0

  return { line: offsetLine, column: col }
}

function countStepKeys(step: SolutionStep): number {
  if (step.keys === 'Escape') return 1
  return step.keys.length
}

function simulateW(line: string, startCol: number): number {
  let col = startCol
  const len = line.length
  if (col >= len) return len

  const isWord = (c: string) => /\w/.test(c)
  const isSpace = (c: string) => /\s/.test(c)

  if (isWord(line[col])) {
    while (col < len && isWord(line[col])) col++
  } else if (!isSpace(line[col])) {
    while (col < len && !isWord(line[col]) && !isSpace(line[col])) col++
  }

  while (col < len && isSpace(line[col])) col++

  return col >= len ? len : col
}

function countWMotions(line: string, targetCol: number): number | null {
  if (targetCol === 0) return null
  let col = 0
  let count = 0
  while (col < targetCol && col < line.length) {
    const next = simulateW(line, col)
    if (next <= col) return null
    count++
    if (next === targetCol) return count
    if (next > targetCol) return null
    col = next
  }
  return null
}

function verticalStep(fromLine: number, toLine: number): SolutionStep | null {
  const diff = toLine - fromLine
  if (diff === 0) return null
  const dir = diff > 0 ? 'j' : 'k'
  const dist = Math.abs(diff)
  if (dist === 1) return { keys: dir, description: `Move ${diff > 0 ? 'down' : 'up'}` }
  return { keys: `${dist}${dir}`, description: `Move ${diff > 0 ? 'down' : 'up'} ${dist} lines` }
}

function horizontalOptions(fromCol: number, targetCol: number, lineContent: string): SolutionStep[] {
  if (fromCol === targetCol) return []

  const opts: SolutionStep[] = []
  const diff = targetCol - fromCol

  if (diff > 0) {
    if (diff === 1) {
      opts.push({ keys: 'l', description: 'Move right' })
    } else {
      opts.push({ keys: `${diff}l`, description: `Move right ${diff}` })
    }
  } else {
    const absDiff = Math.abs(diff)
    if (absDiff === 1) {
      opts.push({ keys: 'h', description: 'Move left' })
    } else {
      opts.push({ keys: `${absDiff}h`, description: `Move left ${absDiff}` })
    }
  }

  if (targetCol === 0) {
    opts.push({ keys: '0', description: 'Start of line' })
  }

  if (targetCol < lineContent.length) {
    const ch = lineContent[targetCol]
    if (/[^\s]/.test(ch)) {
      const searchFrom = diff > 0 ? fromCol + 1 : 0
      const first = lineContent.indexOf(ch, searchFrom)
      if (first === targetCol && diff > 0) {
        opts.push({ keys: `f${ch}`, description: `Find '${ch}'` })
      }
    }
  }

  const firstNonWs = lineContent.length - lineContent.trimStart().length
  if (targetCol === firstNonWs && firstNonWs > 0) {
    opts.push({ keys: '^', description: 'First non-whitespace' })
  }

  if (lineContent.length > 0 && targetCol === lineContent.length - 1) {
    opts.push({ keys: '$', description: 'End of line' })
  }

  if (diff > 0 && fromCol === 0) {
    const wCount = countWMotions(lineContent, targetCol)
    if (wCount !== null && wCount > 0) {
      if (wCount <= 4) {
        opts.push({ keys: 'w'.repeat(wCount), description: wCount === 1 ? 'Next word' : `${wCount} words forward` })
      } else {
        opts.push({ keys: `${wCount}w`, description: `${wCount} words forward` })
      }
    }
  }

  return opts
}

function computeSolutions(
  fromLine: number,
  fromCol: number,
  toLine: number,
  toCol: number,
  lineContent: string,
  actionSteps: SolutionStep[],
): ChallengeSolution[] {
  const vStep = verticalStep(fromLine, toLine)
  const hOpts = horizontalOptions(fromCol, toCol, lineContent)

  const actionCost = actionSteps.reduce((n, s) => n + countStepKeys(s), 0)
  const vCost = vStep ? countStepKeys(vStep) : 0

  const solutions: ChallengeSolution[] = []

  if (hOpts.length === 0) {
    const steps: SolutionStep[] = []
    if (vStep) steps.push(vStep)
    steps.push(...actionSteps)
    solutions.push({ label: 'Optimal', steps, totalKeystrokes: vCost + actionCost })
  } else {
    for (const hOpt of hOpts) {
      const hCost = countStepKeys(hOpt)
      const steps: SolutionStep[] = []
      if (vStep) steps.push(vStep)
      steps.push(hOpt)
      steps.push(...actionSteps)
      solutions.push({
        label: `Via ${hOpt.keys}`,
        steps,
        totalKeystrokes: vCost + hCost + actionCost,
      })
    }
  }

  solutions.sort((a, b) => a.totalKeystrokes - b.totalKeystrokes)
  return solutions
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

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: 'x', description: 'Delete character' }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Remove the stray '${chosen.line[col]}' character from the code`,
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

      const offset = pickOffsetCursor(rng, chosen.index, lines.length, lines)
      const actionSteps: SolutionStep[] = [{ keys: `r${replacement}`, description: `Replace with '${replacement}'` }]
      const solutions = computeSolutions(offset.line, offset.column, chosen.index, col, chosen.line, actionSteps)

      return {
        templateId: this.id,
        snippetId: snippet.id,
        initialContent: snippet.content,
        initialCursor: offset,
        targetCursor: { line: chosen.index, column: col },
        expectedContent: newLines.join('\n'),
        referenceKeystrokeCount: solutions[0].totalKeystrokes,
        description: `Fix the typo: replace '${chosen.line[col]}' with '${replacement}'`,
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
        description: `Remove the unnecessary '${deletedWord}' token`,
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
]
