import { render, screen } from '@testing-library/react'
import { StatsOverview } from '@/components/StatsOverview'
import { vi } from 'vitest'

vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => ({
    userStats: {
      challengesAttempted: 42,
      averageChallengeScore: 85,
      streakDays: 7,
    }
  })
}))

vi.mock('@/hooks/useLessonProgress', () => ({
  useLessonProgress: () => ({
    completedCount: 15
  })
}))

describe('StatsOverview', () => {
  test('renders stats correctly', () => {
    render(<StatsOverview />)
    
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Lessons Done')).toBeInTheDocument()
    
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Challenges')).toBeInTheDocument()
    
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('Avg Score')).toBeInTheDocument()
    
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Day Streak')).toBeInTheDocument()
  })
})
