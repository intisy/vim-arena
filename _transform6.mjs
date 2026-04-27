import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = '.'

// Update useChallengeStats.ts to expose global recent results
{
  const file = join(root, 'packages/client/src/hooks/useChallengeStats.ts')
  let c = readFileSync(file, 'utf-8')
  
  c = c.replace(
    'type StatsMap = Record<string, ChallengeStats>',
    'type StatsMap = Record<string, ChallengeStats>\nexport interface GlobalStatsData {\n  map: StatsMap\n  recentResults: ChallengeResult[]\n}'
  )
  
  c = c.replace(
    'async function fetchStats(userId: string): Promise<StatsMap> {',
    'async function fetchStats(userId: string): Promise<GlobalStatsData> {'
  )
  
  c = c.replace(
    '  return map\n}',
    `  const globalRecentResults = (resultsRows ?? []).slice(0, 20).map(r => ({
    templateId: r.template_id,
    snippetId: r.snippet_id,
    completedAt: new Date(r.created_at).getTime(),
    timeSeconds: r.time_seconds,
    keystrokeCount: r.keystroke_count,
    referenceKeystrokeCount: r.reference_keystroke_count,
    efficiencyScore: r.efficiency_score,
    speedScore: r.speed_score,
    totalScore: r.total_score,
    timedOut: r.timed_out,
    replayData: r.replay_data
  }))
  return { map, recentResults: globalRecentResults }
}`
  )
  
  c = c.replace(
    'const { data: stats = {}, isLoading } = useQuery({',
    'const { data, isLoading } = useQuery({'
  )
  
  c = c.replace(
    'queryFn: () => fetchStats(userId!),',
    'queryFn: () => fetchStats(userId!),'
  )
  
  c = c.replace(
    '  const getStats = useCallback(',
    '  const stats = data?.map ?? {}\n  const recentResults = data?.recentResults ?? []\n\n  const getStats = useCallback('
  )
  
  c = c.replace(
    '  return { stats, getStats, getBestScore, isLoading }',
    '  return { stats, recentResults, getStats, getBestScore, isLoading }'
  )
  
  writeFileSync(file + '.tmp', c, 'utf-8')
}
