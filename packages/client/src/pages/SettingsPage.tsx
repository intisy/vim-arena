import { useEffect } from 'react'
import { Settings2 } from 'lucide-react'
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
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-12 animate-fade-in-up">
      <header>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center">
            <Settings2 size={22} className="text-[var(--theme-primary)]" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--theme-foreground)]">Settings</h1>
        </div>
        <p className="text-[var(--theme-muted-foreground)]">
          Customize your vim-arena experience.
        </p>
      </header>

      <div className="divider-glow" />

      <section>
        <h2 className="section-heading text-2xl font-bold text-[var(--theme-foreground)] mb-6 pb-2">
          Theme
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 stagger">
          {themes.map((t, i) => {
            const isActive = t.className === theme.className
            return (
              <button
                key={t.className}
                onClick={() => setTheme(t.className)}
                className={`glow-border relative flex flex-col gap-4 p-6 rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 ${
                  isActive
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-muted)] shadow-[0_0_15px_var(--theme-primary)/0.2]'
                    : 'border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-muted-foreground)]'
                }`}
              >
                <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">{i + 1}</kbd>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl font-bold text-[var(--theme-foreground)]">
                    {t.name}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold bg-[var(--theme-primary)] text-[var(--theme-background)] px-2 py-1 rounded-full uppercase tracking-widest">
                      Active
                    </span>
                  )}
                </div>
                
                <div 
                  className="w-full h-24 rounded-lg border flex flex-col overflow-hidden"
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
