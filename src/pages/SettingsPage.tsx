import { useEffect, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { storageProvider } from '@/storage/LocalStorageProvider'

export function SettingsPage() {
  const { theme, setTheme, themes } = useTheme()
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Settings | vim-arena'
  }, [])

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      storageProvider.clear()
      setResetMessage('Progress has been reset. Reloading...')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    }
  }

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
          {themes.map((t) => {
            const isActive = t.className === theme.className
            return (
              <button
                key={t.className}
                onClick={() => setTheme(t.className)}
                className={`flex flex-col gap-4 p-6 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-muted)] shadow-[0_0_10px_var(--theme-primary)]'
                    : 'border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-muted-foreground)]'
                }`}
              >
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

      <section>
        <h2 className="text-2xl font-bold text-[var(--theme-error)] mb-6 border-b border-[var(--theme-border)] pb-2">
          Danger Zone
        </h2>
        <div className="p-6 rounded-xl border border-[var(--theme-error)] bg-[var(--theme-background)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--theme-foreground)]">Reset Progress</h3>
            <p className="text-[var(--theme-muted-foreground)]">
              Permanently delete all lesson progress, challenge stats, and history.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-[var(--theme-error)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Reset All Data
          </button>
        </div>
        {resetMessage && (
          <div className="mt-4 p-4 rounded bg-[var(--theme-success)] text-[var(--theme-background)] font-bold text-center">
            {resetMessage}
          </div>
        )}
      </section>
    </div>
  )
}

export default SettingsPage
