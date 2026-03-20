import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'

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
    expect(within(nav).getByText(/home/i)).toBeInTheDocument()
    expect(within(nav).getByText(/lessons/i)).toBeInTheDocument()
    expect(within(nav).getByText(/challenges/i)).toBeInTheDocument()
    expect(within(nav).getByText(/settings/i)).toBeInTheDocument()
  })

  test('renders the vim-arena logo/title', () => {
    renderWithRouter('/')
    expect(screen.getByText(/vim-arena/i)).toBeInTheDocument()
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
