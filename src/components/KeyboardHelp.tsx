import { useEffect, useState } from 'react'

export function KeyboardHelp() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setIsOpen(true)
      } else if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
      data-testid="keyboard-help-backdrop"
    >
      <div 
        className="bg-[var(--theme-background)] border border-[var(--theme-border)] rounded-xl p-8 max-w-2xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-[var(--theme-border)] pb-4">
          <h2 className="text-2xl font-bold text-[var(--theme-foreground)]">Keyboard Shortcuts</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4">Navigation</h3>
            <ul className="space-y-3">
              <li className="flex justify-between items-center">
                <span className="text-[var(--theme-foreground)]">Home</span>
                <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">g h</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--theme-foreground)]">Lessons</span>
                <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">g l</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--theme-foreground)]">Challenges</span>
                <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">g c</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--theme-foreground)]">Settings</span>
                <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">g s</kbd>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-[var(--theme-accent)] mb-4">Editor</h3>
            <ul className="space-y-3">
              <li className="flex justify-between items-center">
                <span className="text-[var(--theme-foreground)]">Normal Mode</span>
                <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">Esc</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--theme-foreground)]">Insert Mode</span>
                <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">i</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--theme-foreground)]">Visual Mode</span>
                <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">v</kbd>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--theme-foreground)]">Show Help</span>
                <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">?</kbd>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[var(--theme-border)] text-center text-sm text-[var(--theme-muted-foreground)]">
          Press <kbd className="px-1.5 py-0.5 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  )
}
