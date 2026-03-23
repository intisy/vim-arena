/**
 * Efficiency: how close the user's keystroke count is to the reference.
 * If user uses fewer or equal keystrokes: 100 (they found a better path).
 * If user uses more: reference/actual * 100, rounded.
 */
export function calculateEfficiency(actual: number, reference: number): number {
  if (actual <= 0) return 0
  if (actual <= reference) return 100
  return Math.round((reference / actual) * 100)
}

/**
 * Speed score: 100 when time=0, 50 when time=timeLimit, 0 when time >= 2*timeLimit.
 */
export function calculateSpeedScore(timeSeconds: number, timeLimit: number): number {
  if (timeLimit <= 0) return 0
  if (timeSeconds <= 0) return 100
  if (timeSeconds >= timeLimit) return Math.max(0, Math.round(50 - ((timeSeconds - timeLimit) / timeLimit) * 50))
  return Math.round(50 + (1 - timeSeconds / timeLimit) * 50)
}

/**
 * Total: 60% efficiency + 40% speed
 */
export function calculateTotalScore(efficiency: number, speed: number): number {
  return Math.round(efficiency * 0.6 + speed * 0.4)
}
