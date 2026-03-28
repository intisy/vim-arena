// PvP shared types used by both client and server

export type RacePhase = 'waiting' | 'countdown' | 'racing' | 'finished'

export interface PvpRaceConfig {
  matchId: string
  challengeSeed: number
  challengeTemplateId: string
  challengeDifficulty: 1 | 2 | 3 | 4 | 5
  timeLimit: number
  player1Id: string
  player2Id: string
  player1Username: string
  player2Username: string
  player1Elo: number
  player2Elo: number
}

// Realtime broadcast message types
export interface RaceCountdownMessage {
  type: 'countdown'
  matchId: string
  seconds: number
}

export interface RaceStartMessage {
  type: 'race_start'
  matchId: string
  startedAt: string
}

export interface RaceProgressMessage {
  type: 'progress'
  matchId: string
  playerId: string
  keystrokeCount: number
  completionPercent: number // 0-100
}

export interface RaceCompleteMessage {
  type: 'race_complete'
  matchId: string
  playerId: string
  timeSeconds: number
  keystrokeCount: number
}

export interface RaceResultMessage {
  type: 'race_result'
  matchId: string
  winnerId: string | null
  player1: {
    id: string
    username: string
    timeSeconds: number | null
    keystrokeCount: number | null
    completed: boolean
    eloBefore: number
    eloAfter: number
  }
  player2: {
    id: string
    username: string
    timeSeconds: number | null
    keystrokeCount: number | null
    completed: boolean
    eloBefore: number
    eloAfter: number
  }
  status: 'completed' | 'forfeit' | 'timeout'
}

export interface MatchFoundMessage {
  type: 'match_found'
  matchId: string
  config: PvpRaceConfig
}

export type PvpRealtimeMessage =
  | RaceCountdownMessage
  | RaceStartMessage
  | RaceProgressMessage
  | RaceCompleteMessage
  | RaceResultMessage
  | MatchFoundMessage

// Replay snapshot — recorded periodically during a race
export interface ReplaySnapshot {
  /** Seconds since race start */
  t: number
  /** Editor content at this moment */
  c: string
  /** Cursor line (0-based) */
  l: number
  /** Cursor column (0-based) */
  col: number
}

// Match history entry returned by get_pvp_history RPC
export interface MatchHistoryEntry {
  matchId: string
  status: 'completed' | 'forfeit' | 'timeout'
  winnerId: string | null
  startedAt: string
  finishedAt: string | null
  challengeTemplateId: string
  challengeDifficulty: number
  myId: string
  myUsername: string
  opponentId: string
  opponentUsername: string
  myTimeSeconds: number | null
  myKeystrokes: number | null
  myCompleted: boolean
  myEloBefore: number
  myEloAfter: number | null
  opponentTimeSeconds: number | null
  opponentKeystrokes: number | null
  opponentCompleted: boolean
  opponentEloBefore: number
  opponentEloAfter: number | null
  hasReplay: boolean
}

// Full replay data returned by get_match_replay RPC
export interface MatchReplayPlayer {
  id: string
  username: string
  timeSeconds: number | null
  keystrokeCount: number | null
  completed: boolean
  eloBefore: number
  eloAfter: number | null
  replay: ReplaySnapshot[] | null
}

export interface MatchReplayData {
  matchId: string
  status: 'completed' | 'forfeit' | 'timeout'
  winnerId: string | null
  challengeSeed: number
  challengeTemplateId: string
  challengeDifficulty: 1 | 2 | 3 | 4 | 5
  timeLimit: number
  startedAt: string
  finishedAt: string | null
  player1: MatchReplayPlayer
  player2: MatchReplayPlayer
}

// PvP Elo calculation (2-player, symmetric)
const PVP_K_FACTOR = 32
const PVP_MIN_RATING = 100
const PVP_MAX_RATING = 3000

function pvpExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
}

export interface PvpEloResult {
  winnerNewElo: number
  loserNewElo: number
  winnerDelta: number
  loserDelta: number
}

export function calculatePvpElo(
  winnerElo: number,
  loserElo: number,
): PvpEloResult {
  const winnerExpected = pvpExpectedScore(winnerElo, loserElo)
  const loserExpected = pvpExpectedScore(loserElo, winnerElo)

  const winnerDelta = Math.round(PVP_K_FACTOR * (1 - winnerExpected))
  const loserDelta = Math.round(PVP_K_FACTOR * (0 - loserExpected))

  const winnerNewElo = Math.max(PVP_MIN_RATING, Math.min(PVP_MAX_RATING, winnerElo + winnerDelta))
  const loserNewElo = Math.max(PVP_MIN_RATING, Math.min(PVP_MAX_RATING, loserElo + loserDelta))

  return { winnerNewElo, loserNewElo, winnerDelta, loserDelta }
}

export function calculatePvpEloDraw(
  player1Elo: number,
  player2Elo: number,
): { player1NewElo: number; player2NewElo: number; player1Delta: number; player2Delta: number } {
  const p1Expected = pvpExpectedScore(player1Elo, player2Elo)
  const p2Expected = pvpExpectedScore(player2Elo, player1Elo)

  const p1Delta = Math.round(PVP_K_FACTOR * (0.5 - p1Expected))
  const p2Delta = Math.round(PVP_K_FACTOR * (0.5 - p2Expected))

  return {
    player1NewElo: Math.max(PVP_MIN_RATING, Math.min(PVP_MAX_RATING, player1Elo + p1Delta)),
    player2NewElo: Math.max(PVP_MIN_RATING, Math.min(PVP_MAX_RATING, player2Elo + p2Delta)),
    player1Delta: p1Delta,
    player2Delta: p2Delta,
  }
}
