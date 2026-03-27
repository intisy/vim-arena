import type { EloRating } from '../types/stats'

const INITIAL_RATING = 1000
const K_FACTOR = 32
const MIN_RATING = 100
const MAX_RATING = 3000
const HISTORY_LIMIT = 50

export function createInitialElo(): EloRating {
  return {
    rating: INITIAL_RATING,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    peakRating: INITIAL_RATING,
    history: [],
  }
}

function difficultyToRating(difficulty: 1 | 2 | 3 | 4 | 5): number {
  const map: Record<number, number> = {
    1: 600,
    2: 900,
    3: 1200,
    4: 1600,
    5: 2000,
  }
  return map[difficulty]
}

export function ratingToDifficulty(rating: number): 1 | 2 | 3 | 4 | 5 {
  if (rating < 750) return 1
  if (rating < 1050) return 2
  if (rating < 1400) return 3
  if (rating < 1800) return 4
  return 5
}

function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
}

export function updateElo(
  current: EloRating,
  difficulty: 1 | 2 | 3 | 4 | 5,
  score: number,
  timedOut: boolean,
): EloRating {
  const opponentRating = difficultyToRating(difficulty)
  const expected = expectedScore(current.rating, opponentRating)

  const isWin = !timedOut && score >= 50
  const actual = isWin ? Math.min(1, score / 100 + 0.2) : Math.max(0, score / 200)

  const delta = Math.round(K_FACTOR * (actual - expected))
  const newRating = Math.max(MIN_RATING, Math.min(MAX_RATING, current.rating + delta))

  const historyEntry = {
    rating: newRating,
    timestamp: Date.now(),
    difficulty,
    score,
  }

  return {
    rating: newRating,
    gamesPlayed: current.gamesPlayed + 1,
    wins: current.wins + (isWin ? 1 : 0),
    losses: current.losses + (isWin ? 0 : 1),
    peakRating: Math.max(current.peakRating, newRating),
    history: [historyEntry, ...current.history].slice(0, HISTORY_LIMIT),
  }
}

export type DifficultyWeights = Record<1 | 2 | 3 | 4 | 5, number>

const WEIGHT_TABLE: Record<number, DifficultyWeights> = {
  1: { 1: 60, 2: 25, 3: 10, 4: 4, 5: 1 },
  2: { 1: 20, 2: 50, 3: 20, 4: 8, 5: 2 },
  3: { 1: 5, 2: 20, 3: 50, 4: 20, 5: 5 },
  4: { 1: 2, 2: 8, 3: 20, 4: 50, 5: 20 },
  5: { 1: 1, 2: 4, 3: 10, 4: 25, 5: 60 },
}

export function getDifficultyWeights(rating: number): DifficultyWeights {
  const base = ratingToDifficulty(rating)
  return WEIGHT_TABLE[base]
}

export function getTimeMultiplier(playerDifficulty: 1 | 2 | 3 | 4 | 5, challengeDifficulty: 1 | 2 | 3 | 4 | 5): number {
  const gap = challengeDifficulty - playerDifficulty
  if (gap <= 0) return 1
  return 1 + gap * 0.5
}

export function getRatingLabel(rating: number): string {
  if (rating < 600) return 'Novice'
  if (rating < 900) return 'Beginner'
  if (rating < 1200) return 'Intermediate'
  if (rating < 1500) return 'Advanced'
  if (rating < 1800) return 'Expert'
  if (rating < 2200) return 'Master'
  return 'Grandmaster'
}

export function getRatingColor(rating: number): string {
  if (rating < 600) return '#6b7280'
  if (rating < 900) return '#22c55e'
  if (rating < 1200) return '#3b82f6'
  if (rating < 1500) return '#a855f7'
  if (rating < 1800) return '#f59e0b'
  if (rating < 2200) return '#ef4444'
  return '#ff6b6b'
}
