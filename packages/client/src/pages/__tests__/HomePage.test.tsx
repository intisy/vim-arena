import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { vi } from 'vitest'

// Mock StatsOverview since it uses hooks that need context/storage
vi.mock('@/components/StatsOverview', () => ({
  StatsOverview: () => <div data-testid="stats-overview">Stats Overview</div>
}))

// Mock useAuth to simulate logged-in user
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@test.com' },
    session: null,
    loading: false,
    signInWithGitHub: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}))

describe('HomePage', () => {
  beforeEach(() => {
    document.title = ''
  })

  test('renders hero section and feature cards', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    
    expect(screen.getByText(/vim-arena/i)).toBeInTheDocument()
    expect(screen.getByText(/Master Vim. Compete. Dominate./i)).toBeInTheDocument()
    expect(screen.getByText(/Start Learning/i)).toBeInTheDocument()
    expect(screen.getByText(/Try Challenges/i)).toBeInTheDocument()
    
    // Feature cards
    expect(screen.getByText('Lessons')).toBeInTheDocument()
    expect(screen.getByText('Challenges')).toBeInTheDocument()
    // PvP Arena appears in both hero button and feature card
    expect(screen.getAllByText('PvP Arena')).toHaveLength(2)
    expect(screen.getByText('Enter Arena')).toBeInTheDocument()
    
    // Stats overview
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument()
  })

  test('updates document title', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(document.title).toBe('Home | vim-arena')
  })
})
