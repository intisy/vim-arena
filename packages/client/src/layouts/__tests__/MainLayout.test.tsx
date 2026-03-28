import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { vi } from 'vitest'

// Mock useAuth since MainLayout uses it
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

function renderWithRouter(initialPath: string = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<div>Home Content</div>} />
          <Route path="lessons" element={<div>Lessons Content</div>} />
          <Route path="challenges" element={<div>Challenges Content</div>} />
          <Route path="settings" element={<div>Settings Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('MainLayout', () => {
  test('renders all navigation links', () => {
    renderWithRouter('/')
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(within(nav).getByText(/lessons/i)).toBeInTheDocument()
    expect(within(nav).getByText(/challenges/i)).toBeInTheDocument()
  })

  test('renders the vim-arena logo/title as home link', () => {
    renderWithRouter('/')
    const logo = screen.getByText(/vim-arena/i)
    expect(logo).toBeInTheDocument()
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  test('renders outlet content', () => {
    renderWithRouter('/')
    expect(screen.getByText('Home Content')).toBeInTheDocument()
  })

  test('renders lessons content at /lessons', () => {
    renderWithRouter('/lessons')
    expect(screen.getByText('Lessons Content')).toBeInTheDocument()
  })

  test('nav has accessible label', () => {
    renderWithRouter('/')
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })
})
