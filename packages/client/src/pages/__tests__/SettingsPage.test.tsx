import { render, screen } from '@testing-library/react'
import { SettingsPage } from '@/pages/SettingsPage'
import { ThemeProvider } from '@/contexts/ThemeContext'

describe('SettingsPage', () => {
  beforeEach(() => {
    document.title = ''
  })

  test('renders theme picker', () => {
    render(
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    )
    
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  test('updates document title', () => {
    render(
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    )
    expect(document.title).toBe('Settings | vim-arena')
  })
})
