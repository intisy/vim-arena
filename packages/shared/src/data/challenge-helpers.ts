import type { SolutionStep, ChallengeSolution } from '../types/challenge'
import { SeededRandom } from '../engine/ChallengeGenerator'

export function getDeleteWordRange(line: string, col: number): { start: number; end: number } {
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

export function pickOffsetCursor(
  rng: SeededRandom,
  targetLine: number,
  totalLines: number,
  _lines: string[],
): { line: number; column: number } {
  if (totalLines <= 2) {
    const offsetLine = targetLine === 0 ? 1 : 0
    return { line: offsetLine, column: 0 }
  }

  const maxDist = Math.min(3, Math.max(1, Math.floor(totalLines / 3)))
  const dist = rng.nextInt(1, maxDist)

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

  return { line: offsetLine, column: 0 }
}

export function pickFarCursor(
  rng: SeededRandom,
  targetLine: number,
  totalLines: number,
): { line: number; column: number } {
  const minDist = Math.min(10, Math.floor(totalLines / 3))
  const maxDist = Math.max(minDist, Math.floor(totalLines * 2 / 3))
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
    offsetLine = targetLine > totalLines / 2 ? 0 : totalLines - 1
  }

  return { line: offsetLine, column: 0 }
}

export function countStepKeys(step: SolutionStep): number {
  if (step.keys === 'Escape') return 1
  return step.keys.length
}

export function simulateW(line: string, startCol: number): number {
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

export function countWMotions(line: string, targetCol: number): number | null {
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

export function verticalStep(fromLine: number, toLine: number): SolutionStep | null {
  const diff = toLine - fromLine
  if (diff === 0) return null
  const dir = diff > 0 ? 'j' : 'k'
  const dist = Math.abs(diff)
  if (dist === 1) return { keys: dir, description: `Move ${diff > 0 ? 'down' : 'up'}` }
  return { keys: `${dist}${dir}`, description: `Move ${diff > 0 ? 'down' : 'up'} ${dist} lines` }
}

export function horizontalOptions(fromCol: number, targetCol: number, lineContent: string): SolutionStep[] {
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

export function computeSolutions(
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

export function scrollVerticalOptions(fromLine: number, toLine: number, totalLines: number): SolutionStep[] {
  const opts: SolutionStep[] = []
  const diff = toLine - fromLine
  if (diff === 0) return opts

  const dir = diff > 0 ? 'j' : 'k'
  const dist = Math.abs(diff)
  opts.push({ keys: `${dist}${dir}`, description: `Move ${diff > 0 ? 'down' : 'up'} ${dist} lines` })

  if (toLine === 0) {
    opts.push({ keys: 'gg', description: 'Go to first line' })
  }

  if (toLine === totalLines - 1) {
    opts.push({ keys: 'G', description: 'Go to last line' })
  }

  const lineNum = toLine + 1
  opts.push({ keys: `${lineNum}G`, description: `Go to line ${lineNum}` })

  return opts
}

export function computeScrollSolutions(
  fromLine: number,
  fromCol: number,
  toLine: number,
  toCol: number,
  lineContent: string,
  totalLines: number,
  actionSteps: SolutionStep[],
): ChallengeSolution[] {
  const vOpts = scrollVerticalOptions(fromLine, toLine, totalLines)
  const hOpts = horizontalOptions(fromCol, toCol, lineContent)
  const actionCost = actionSteps.reduce((n, s) => n + countStepKeys(s), 0)

  const solutions: ChallengeSolution[] = []

  if (vOpts.length === 0) {
    if (hOpts.length === 0) {
      solutions.push({ label: 'Direct', steps: [...actionSteps], totalKeystrokes: actionCost })
    } else {
      for (const hOpt of hOpts) {
        solutions.push({
          label: `Via ${hOpt.keys}`,
          steps: [hOpt, ...actionSteps],
          totalKeystrokes: countStepKeys(hOpt) + actionCost,
        })
      }
    }
  } else {
    for (const vOpt of vOpts) {
      const vCost = countStepKeys(vOpt)
      if (hOpts.length === 0) {
        solutions.push({
          label: `Via ${vOpt.keys}`,
          steps: [vOpt, ...actionSteps],
          totalKeystrokes: vCost + actionCost,
        })
      } else {
        for (const hOpt of hOpts) {
          solutions.push({
            label: `Via ${vOpt.keys} + ${hOpt.keys}`,
            steps: [vOpt, hOpt, ...actionSteps],
            totalKeystrokes: vCost + countStepKeys(hOpt) + actionCost,
          })
        }
      }
    }
  }

  solutions.sort((a, b) => a.totalKeystrokes - b.totalKeystrokes)
  return solutions
}
