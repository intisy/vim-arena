import { useState, useCallback } from 'react'
import { storageProvider } from '@/storage/LocalStorageProvider'
import { STORAGE_KEYS } from '@/storage/keys'
import type { EloRating } from '@/types/stats'
import { createInitialElo, updateElo, ratingToDifficulty } from '@/engine/EloRating'

export function useEloRating() {
  const [elo, setElo] = useState<EloRating>(() => {
    return storageProvider.get<EloRating>(STORAGE_KEYS.CHALLENGE_ELO) ?? createInitialElo()
  })

  const recordChallengeResult = useCallback(
    (difficulty: 1 | 2 | 3 | 4 | 5, score: number, timedOut: boolean) => {
      setElo((prev) => {
        const updated = updateElo(prev, difficulty, score, timedOut)
        storageProvider.set(STORAGE_KEYS.CHALLENGE_ELO, updated)
        return updated
      })
    },
    [],
  )

  const getMatchedDifficulty = useCallback((): 1 | 2 | 3 | 4 | 5 => {
    return ratingToDifficulty(elo.rating)
  }, [elo.rating])

  const resetElo = useCallback(() => {
    const initial = createInitialElo()
    storageProvider.set(STORAGE_KEYS.CHALLENGE_ELO, initial)
    setElo(initial)
  }, [])

  return { elo, recordChallengeResult, getMatchedDifficulty, resetElo }
}
