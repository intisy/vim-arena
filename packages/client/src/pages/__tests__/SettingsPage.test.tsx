import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPage } from '@/pages/SettingsPage'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { storageProvider } from '@/storage/LocalStorageProvider'
import { vi } from 'vitest'

// Mock window.confirm and window.location.reload
const originalConfirm = window.confirm
const originalLocation = window.location

beforeAll(() => {
  window.confirm = vi.fn()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload: vi.fn() },
  })
})

afterAll(() => {
  window.confirm = originalConfirm
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  })
})

describe('SettingsPage', () => {
  beforeEach(() => {
    document.title = ''
    vi.clearAllMocks()
    vi.spyOn(storageProvider, 'clear')
  })

  test('renders theme picker and danger zone', () => {
    render(
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    )
    
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('Danger Zone')).toBeInTheDocument()
    expect(screen.getByText('Reset Progress')).toBeInTheDocument()
  })

  test('updates document title', () => {
    render(
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    )
    expect(document.title).toBe('Settings | vim-arena')
  })

  test('reset button calls storageProvider.clear when confirmed', () => {
    vi.mocked(window.confirm).mockReturnValue(true)
    
    render(
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    )
    
    const resetButton = screen.getByText('Reset All Data')
    fireEvent.click(resetButton)
    
    expect(window.confirm).toHaveBeenCalled()
    expect(storageProvider.clear).toHaveBeenCalled()
    expect(screen.getByText(/Progress has been reset/i)).toBeInTheDocument()
  })

  test('reset button does not call storageProvider.clear when cancelled', () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    
    render(
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    )
    
    const resetButton = screen.getByText('Reset All Data')
    fireEvent.click(resetButton)
    
    expect(window.confirm).toHaveBeenCalled()
    expect(storageProvider.clear).not.toHaveBeenCalled()
  })
})
