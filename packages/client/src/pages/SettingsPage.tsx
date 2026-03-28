import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export function SettingsPage() {
  const { theme, setTheme, themes } = useTheme()

  useEffect(() => {
    document.title = 'Settings | vim-arena'
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) return

      // Number keys 1-N select themes
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= themes.length) {
        e.preventDefault()
        setTheme(themes[num - 1].className)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [themes, setTheme])

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-12">
      <header>
        <h1 className="text-4xl font-bold text-[var(--theme-foreground)] mb-2">Settings</h1>
        <p className="text-[var(--theme-muted-foreground)]">
          Customize your vim-arena experience.
        </p>
      </header>

      <section>
        <h2 className="text-2xl font-bold text-[var(--theme-foreground)] mb-6 border-b border-[var(--theme-border)] pb-2">
          Theme
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {themes.map((t, i) => {
            const isActive = t.className === theme.className
            return (
              <button
                key={t.className}
                onClick={() => setTheme(t.className)}
                className={`relative flex flex-col gap-4 p-6 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-muted)] shadow-[0_0_10px_var(--theme-primary)]'
                    : 'border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-muted-foreground)]'
                }`}
              >
                <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">{i + 1}</kbd>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl font-bold text-[var(--theme-foreground)]">
                    {t.name}
                  </span>
                  {isActive && (
                    <span className="text-xs font-bold bg-[var(--theme-primary)] text-[var(--theme-background)] px-2 py-1 rounded uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                
                {/* Theme Preview */}
                <div 
                  className="w-full h-24 rounded-md border flex flex-col overflow-hidden"
                  style={{ 
                    backgroundColor: t.colors.background,
                    borderColor: t.colors.border
                  }}
                >
                  <div 
                    className="h-6 w-full flex items-center px-2 border-b text-xs font-mono"
                    style={{ 
                      backgroundColor: t.colors.muted,
                      borderColor: t.colors.border,
                      color: t.colors.mutedForeground
                    }}
                  >
                    preview.ts
                  </div>
                  <div className="p-2 font-mono text-sm flex flex-col gap-1">
                    <div style={{ color: t.colors.primary }}>function hello() {'{'}</div>
                    <div className="pl-4" style={{ color: t.colors.foreground }}>
                      console.log(<span style={{ color: t.colors.accent }}>"world"</span>)
                    </div>
                    <div style={{ color: t.colors.primary }}>{'}'}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
