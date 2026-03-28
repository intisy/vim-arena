import { render, screen } from '@testing-library/react'
import App from './App'

// Mock localStorage used by ThemeProvider
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  // BrowserRouter basename="/vim-arena" requires URL to start with /vim-arena
  window.history.pushState({}, '', '/vim-arena/')
})

test('renders main navigation', () => {
  render(<App />)
  // The MainLayout sidebar always renders — check for nav links
  expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
})

test('renders home page content by default', () => {
  render(<App />)
  // HomePage renders at the index route
  expect(screen.getByText(/vim-arena/i)).toBeInTheDocument()
})
