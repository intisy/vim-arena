import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { themes, defaultTheme, type Theme } from '@/themes'

interface ThemeContextValue {
  theme: Theme
  setTheme: (className: string) => void
  themes: Theme[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeClass, setThemeClass] = useState<string>(() => {
    return localStorage.getItem('vim-arena-theme') ?? defaultTheme
  })

  const theme = themes.find(t => t.className === themeClass) ?? themes[0]

  useEffect(() => {
    const html = document.documentElement
    // Remove all theme classes
    themes.forEach(t => html.classList.remove(t.className))
    // Add current
    html.classList.add(theme.className)
    // Set CSS custom properties
    const colors = theme.colors
    Object.entries(colors).forEach(([key, value]) => {
      html.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
    })
    localStorage.setItem('vim-arena-theme', theme.className)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeClass, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
