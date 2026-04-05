import { useEffect, useState } from 'react'
import {
  Settings2, Palette, Code2, Swords, Accessibility, Database,
  Download, Trash2, RotateCcw, AlertTriangle,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useSettings } from '@/hooks/useSettings'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-[var(--theme-primary)]' : 'bg-[var(--theme-border)]'
      }`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-[22px]' : 'translate-x-0.5'
      }`} />
    </button>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--theme-foreground)]">{label}</div>
        {description && (
          <div className="text-xs text-[var(--theme-muted-foreground)] mt-0.5">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function SectionCard({ icon: Icon, iconColor, title, children }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconColor: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="glass-card glow-border rounded-xl overflow-hidden">
      <div className="p-5 border-b border-[var(--theme-border)] flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center`}>
          <Icon size={16} />
        </div>
        <h2 className="text-lg font-bold text-[var(--theme-foreground)]">{title}</h2>
      </div>
      <div className="px-5 divide-y divide-[var(--theme-border)]">
        {children}
      </div>
    </section>
  )
}

function ConfirmButton({ label, icon: Icon, variant, onConfirm }: {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  variant: 'danger' | 'neutral'
  onConfirm: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timer)
  }, [confirming])

  if (confirming) {
    return (
      <button
        onClick={() => { onConfirm(); setConfirming(false) }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-error)] text-white transition-all"
      >
        <AlertTriangle size={12} />
        Confirm?
      </button>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        variant === 'danger'
          ? 'border border-[var(--theme-error)]/30 text-[var(--theme-error)] hover:bg-[var(--theme-error)]/10'
          : 'border border-[var(--theme-border)] text-[var(--theme-muted-foreground)] hover:bg-[var(--theme-muted)]'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}

export function SettingsPage() {
  const { theme, setTheme, themes } = useTheme()
  const {
    settings, updateSetting, resetSettings,
    exportData, clearChallengeHistory, clearLessonProgress, clearAllData,
  } = useSettings()

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
    <div className="max-w-4xl mx-auto py-8 flex flex-col gap-10 animate-fade-in-up">
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

      {/* Theme */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-purple-400/10 flex items-center justify-center">
            <Palette size={16} className="text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-[var(--theme-foreground)]">Theme</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {themes.map((t, i) => {
            const isActive = t.className === theme.className
            return (
              <button
                key={t.className}
                onClick={() => setTheme(t.className)}
                className={`glow-border relative flex flex-col gap-3 p-5 rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 ${
                  isActive
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-muted)] shadow-[0_0_15px_var(--theme-primary)/0.2]'
                    : 'border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-muted-foreground)]'
                }`}
              >
                <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">{i + 1}</kbd>
                <div className="flex items-center justify-between w-full">
                  <span className="text-lg font-bold text-[var(--theme-foreground)]">
                    {t.name}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold bg-[var(--theme-primary)] text-[var(--theme-background)] px-2 py-1 rounded-full uppercase tracking-widest">
                      Active
                    </span>
                  )}
                </div>
                
                <div 
                  className="w-full h-20 rounded-lg border flex flex-col overflow-hidden"
                  style={{ 
                    backgroundColor: t.colors.background,
                    borderColor: t.colors.border
                  }}
                >
                  <div 
                    className="h-5 w-full flex items-center px-2 border-b text-[10px] font-mono"
                    style={{ 
                      backgroundColor: t.colors.muted,
                      borderColor: t.colors.border,
                      color: t.colors.mutedForeground
                    }}
                  >
                    preview.ts
                  </div>
                  <div className="p-1.5 font-mono text-xs flex flex-col gap-0.5">
                    <div style={{ color: t.colors.primary }}>function hello() {'{'}</div>
                    <div className="pl-3" style={{ color: t.colors.foreground }}>
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

      <div className="divider-glow" />

      {/* Editor */}
      <SectionCard icon={Code2} iconColor="bg-blue-400/10 text-blue-400" title="Editor">
        <SettingRow label="Font Size" description="Editor font size in pixels">
          <select
            value={settings.editorFontSize}
            onChange={e => updateSetting('editorFontSize', Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm font-mono bg-[var(--theme-muted)] border border-[var(--theme-border)] text-[var(--theme-foreground)] outline-none focus:border-[var(--theme-primary)]"
          >
            {[12, 13, 14, 15, 16, 18, 20].map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="Line Numbers" description="Show line numbers in the gutter">
          <Toggle checked={settings.editorShowLineNumbers} onChange={v => updateSetting('editorShowLineNumbers', v)} />
        </SettingRow>

        <SettingRow label="Relative Line Numbers" description="Show line numbers relative to cursor position">
          <Toggle checked={settings.editorRelativeLineNumbers} onChange={v => updateSetting('editorRelativeLineNumbers', v)} />
        </SettingRow>

        <SettingRow label="Editor Height" description="Default editor panel height">
          <select
            value={settings.editorHeight}
            onChange={e => updateSetting('editorHeight', e.target.value as 'compact' | 'default' | 'tall')}
            className="px-3 py-1.5 rounded-lg text-sm font-mono bg-[var(--theme-muted)] border border-[var(--theme-border)] text-[var(--theme-foreground)] outline-none focus:border-[var(--theme-primary)]"
          >
            <option value="compact">Compact (300px)</option>
            <option value="default">Default (400px)</option>
            <option value="tall">Tall (550px)</option>
          </select>
        </SettingRow>
      </SectionCard>

      {/* Challenges */}
      <SectionCard icon={Swords} iconColor="bg-amber-400/10 text-amber-400" title="Challenges">
        <SettingRow label="Default Practice Mode" description="Start challenges in practice mode by default">
          <Toggle checked={settings.challengeDefaultPractice} onChange={v => updateSetting('challengeDefaultPractice', v)} />
        </SettingRow>

        <SettingRow label="Auto-Advance" description="Automatically start next challenge on completion">
          <Toggle checked={settings.challengeAutoAdvance} onChange={v => updateSetting('challengeAutoAdvance', v)} />
        </SettingRow>

        <SettingRow label="Keyboard Shortcuts" description="Show keyboard shortcut hints in the UI">
          <Toggle checked={settings.challengeShowKeyboardHints} onChange={v => updateSetting('challengeShowKeyboardHints', v)} />
        </SettingRow>

        <SettingRow label="Solution Countdown" description="Seconds before revealing the solution">
          <select
            value={settings.challengeCountdownDuration}
            onChange={e => updateSetting('challengeCountdownDuration', Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-sm font-mono bg-[var(--theme-muted)] border border-[var(--theme-border)] text-[var(--theme-foreground)] outline-none focus:border-[var(--theme-primary)]"
          >
            {[3, 5, 10, 15, 30].map(s => (
              <option key={s} value={s}>{s}s</option>
            ))}
          </select>
        </SettingRow>
      </SectionCard>

      {/* Accessibility */}
      <SectionCard icon={Accessibility} iconColor="bg-teal-400/10 text-teal-400" title="Accessibility">
        <SettingRow label="Reduce Motion" description="Disable animations and transitions">
          <Toggle checked={settings.accessibilityReduceMotion} onChange={v => updateSetting('accessibilityReduceMotion', v)} />
        </SettingRow>

        <SettingRow label="High Contrast" description="Increase contrast for better readability">
          <Toggle checked={settings.accessibilityHighContrast} onChange={v => updateSetting('accessibilityHighContrast', v)} />
        </SettingRow>
      </SectionCard>

      {/* Data Management */}
      <SectionCard icon={Database} iconColor="bg-red-400/10 text-red-400" title="Data Management">
        <SettingRow label="Export Data" description="Download all your vim-arena data as JSON">
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--theme-primary)]/30 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 transition-all"
          >
            <Download size={12} />
            Export
          </button>
        </SettingRow>

        <SettingRow label="Clear Challenge History" description="Remove all Elo rating and challenge score data">
          <ConfirmButton label="Clear" icon={Trash2} variant="danger" onConfirm={clearChallengeHistory} />
        </SettingRow>

        <SettingRow label="Clear Lesson Progress" description="Reset all lesson completion progress">
          <ConfirmButton label="Clear" icon={Trash2} variant="danger" onConfirm={clearLessonProgress} />
        </SettingRow>

        <SettingRow label="Reset All Settings" description="Restore all settings to default values">
          <ConfirmButton label="Reset" icon={RotateCcw} variant="neutral" onConfirm={resetSettings} />
        </SettingRow>

        <div className="py-3">
          <ConfirmButton label="Delete All Data" icon={Trash2} variant="danger" onConfirm={clearAllData} />
          <p className="text-[10px] text-[var(--theme-muted-foreground)] mt-2">
            Permanently removes all vim-arena data including settings, progress, and ratings.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}

export default SettingsPage
