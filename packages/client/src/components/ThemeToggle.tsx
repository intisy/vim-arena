import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme()

  const next = () => {
    const idx = themes.findIndex(t => t.className === theme.className)
    const nextTheme = themes[(idx + 1) % themes.length]
    setTheme(nextTheme.className)
  }

  return (
    <button
      onClick={next}
      title={`Theme: ${theme.name} (click to cycle)`}
      className="px-3 py-1 rounded border text-sm font-mono"
      style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-muted-foreground)' }}
    >
      🎨 {theme.name}
    </button>
  )
}
