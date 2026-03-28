import { getAdminClient } from '../lib/supabase.js'
import type { PvpRaceConfig, MatchFoundMessage } from '@vim-arena/shared'

// Matchmaking configuration
const POLL_INTERVAL_MS = 3000        // Check queue every 3 seconds
const MAX_ELO_DIFF_START = 100       // Initial Elo range for pairing
const MAX_ELO_DIFF_EXPAND = 50       // Expand range per interval
const MAX_ELO_DIFF_CAP = 500         // Maximum Elo diff allowed
const QUEUE_WAIT_EXPAND_MS = 10000   // Expand range after 10s waiting

// Template IDs available for PvP (difficulty 2-3 for fair races)
const PVP_TEMPLATE_IDS = [
  'delete-char',
  'delete-word',
  'change-word',
  'delete-line',
  'join-lines',
]

const PVP_DIFFICULTY_MIN = 2
const PVP_DIFFICULTY_MAX = 3
const DEFAULT_TIME_LIMIT = 60

let pollingTimer: ReturnType<typeof setInterval> | null = null

interface QueueEntry {
  id: string
  user_id: string
  pvp_elo: number
  queued_at: string
}

/**
 * Try to pair two players from the matchmaking queue.
 * Players are paired by Elo proximity, with the Elo window
 * expanding the longer each player has been waiting.
 */
async function tryPairPlayers(): Promise<void> {
  const supabase = getAdminClient()

  // Fetch all queued players, ordered by queue time (oldest first)
  const { data: queue, error } = await supabase
    .from('matchmaking_queue')
    .select('id, user_id, pvp_elo, queued_at')
    .order('queued_at', { ascending: true })

  if (error || !queue || queue.length < 2) {
    return // Not enough players
  }

  const now = Date.now()
  const paired = new Set<string>()

  for (let i = 0; i < queue.length; i++) {
    const p1 = queue[i] as QueueEntry
    if (paired.has(p1.user_id)) continue

    const p1WaitMs = now - new Date(p1.queued_at).getTime()
    const p1MaxDiff = Math.min(
      MAX_ELO_DIFF_CAP,
      MAX_ELO_DIFF_START + Math.floor(p1WaitMs / QUEUE_WAIT_EXPAND_MS) * MAX_ELO_DIFF_EXPAND,
    )

    for (let j = i + 1; j < queue.length; j++) {
      const p2 = queue[j] as QueueEntry
      if (paired.has(p2.user_id)) continue

      const p2WaitMs = now - new Date(p2.queued_at).getTime()
      const p2MaxDiff = Math.min(
        MAX_ELO_DIFF_CAP,
        MAX_ELO_DIFF_START + Math.floor(p2WaitMs / QUEUE_WAIT_EXPAND_MS) * MAX_ELO_DIFF_EXPAND,
      )

      const eloDiff = Math.abs(p1.pvp_elo - p2.pvp_elo)
      const allowedDiff = Math.max(p1MaxDiff, p2MaxDiff)

      if (eloDiff <= allowedDiff) {
        // Match found — create it
        await createMatch(p1, p2)
        paired.add(p1.user_id)
        paired.add(p2.user_id)
        break // p1 is paired, move to next unpaired
      }
    }
  }
}

async function createMatch(p1: QueueEntry, p2: QueueEntry): Promise<void> {
  const supabase = getAdminClient()

  // Pick random template and difficulty
  const templateId = PVP_TEMPLATE_IDS[Math.floor(Math.random() * PVP_TEMPLATE_IDS.length)]
  const difficulty = (PVP_DIFFICULTY_MIN + Math.floor(Math.random() * (PVP_DIFFICULTY_MAX - PVP_DIFFICULTY_MIN + 1))) as 1 | 2 | 3 | 4 | 5
  const seed = Math.floor(Math.random() * 2_147_483_647)

  // Fetch usernames
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', [p1.user_id, p2.user_id])

  const p1Name = profiles?.find((p: { id: string }) => p.id === p1.user_id)?.username ?? 'Player 1'
  const p2Name = profiles?.find((p: { id: string }) => p.id === p2.user_id)?.username ?? 'Player 2'

  // Insert match row
  const { data: match, error: matchError } = await supabase
    .from('pvp_matches')
    .insert({
      player1_id: p1.user_id,
      player2_id: p2.user_id,
      challenge_seed: seed,
      challenge_template_id: templateId,
      challenge_difficulty: difficulty,
      player1_elo_before: p1.pvp_elo,
      player2_elo_before: p2.pvp_elo,
      time_limit: DEFAULT_TIME_LIMIT,
    })
    .select('id')
    .single()

  if (matchError || !match) {
    console.error('[matchmaker] Failed to create match:', matchError?.message)
    return
  }

  const matchId = match.id as string

  // Remove both players from queue
  await supabase
    .from('matchmaking_queue')
    .delete()
    .in('user_id', [p1.user_id, p2.user_id])

  // Build config payload
  const config: PvpRaceConfig = {
    matchId,
    challengeSeed: seed,
    challengeTemplateId: templateId,
    challengeDifficulty: difficulty,
    timeLimit: DEFAULT_TIME_LIMIT,
    player1Id: p1.user_id,
    player2Id: p2.user_id,
    player1Username: p1Name,
    player2Username: p2Name,
    player1Elo: p1.pvp_elo,
    player2Elo: p2.pvp_elo,
  }

  const message: MatchFoundMessage = {
    type: 'match_found',
    matchId,
    config,
  }

  // Broadcast to both players via Supabase Realtime
  // Each player subscribes to channel `matchmaking:{userId}`
  const channel1 = supabase.channel(`matchmaking:${p1.user_id}`)
  const channel2 = supabase.channel(`matchmaking:${p2.user_id}`)

  await channel1.send({
    type: 'broadcast',
    event: 'match_found',
    payload: message,
  })

  await channel2.send({
    type: 'broadcast',
    event: 'match_found',
    payload: message,
  })

  // Cleanup channels
  supabase.removeChannel(channel1)
  supabase.removeChannel(channel2)

  console.log(`[matchmaker] Matched ${p1Name} (${p1.pvp_elo}) vs ${p2Name} (${p2.pvp_elo}) — match ${matchId}`)
}

/** Start the matchmaking polling loop */
export function startMatchmaker(): void {
  if (pollingTimer) {
    console.warn('[matchmaker] Already running')
    return
  }

  console.log(`[matchmaker] Starting — polling every ${POLL_INTERVAL_MS}ms`)

  pollingTimer = setInterval(async () => {
    try {
      await tryPairPlayers()
    } catch (err) {
      console.error('[matchmaker] Poll error:', err)
    }
  }, POLL_INTERVAL_MS)
}

/** Stop the matchmaking polling loop */
export function stopMatchmaker(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
    console.log('[matchmaker] Stopped')
  }
}
