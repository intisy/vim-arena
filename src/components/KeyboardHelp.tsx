import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'

export function KeyboardHelp() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingG, setPendingG] = useState(false)

  const navigate = useCallback((path: string) => {
    window.location.hash = '#' + path
  }, [])

  useEffect(() => {
    let gTimeout: ReturnType<typeof setTimeout> | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.closest('.cm-editor')
      ) {
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setIsOpen(true)
        return
      }

      if (e.key === 'Escape') {
        if (isOpen) setIsOpen(false)
        if (pendingG) setPendingG(false)
        return
      }

      if (pendingG) {
        setPendingG(false)
        if (gTimeout) clearTimeout(gTimeout)

        const routes: Record<string, string> = {
          h: '/',
          l: '/lessons',
          c: '/challenges',
          s: '/settings',
          t: '/stats',
        }

        const target = routes[e.key]
        if (target) {
          e.preventDefault()
          navigate(target)
        }
        return
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setPendingG(true)
        gTimeout = setTimeout(() => setPendingG(false), 1000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (gTimeout) clearTimeout(gTimeout)
    }
  }, [isOpen, pendingG, navigate])

  return (
    <>
      {pendingG && (
        <div className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-lg bg-[var(--theme-muted)] border border-[var(--theme-border)] font-mono text-sm text-[var(--theme-foreground)] animate-in fade-in duration-100">
          g-
        </div>
      )}

      {isOpen && (
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
                <X size={18} />
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
                    <span className="text-[var(--theme-foreground)]">Stats</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">g t</kbd>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Settings</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">g s</kbd>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--theme-accent)] mb-4">Challenge Results</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Next Challenge</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">n</kbd>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Retry</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">r</kbd>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Back</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">b</kbd>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Toggle Practice</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">p</kbd>
                  </li>
                </ul>

                <h3 className="text-lg font-bold text-[var(--theme-accent)] mb-4 mt-6">Challenges Page</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Start Challenge</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">Enter</kbd>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Reset Rating</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">Ctrl+⌫</kbd>
                  </li>
                </ul>

                <h3 className="text-lg font-bold text-[var(--theme-accent)] mb-4 mt-6">Settings</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Select Theme</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">1-9</kbd>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Reset All Data</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">Ctrl+⌫</kbd>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4">Lesson Completion</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Next Lesson</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">n</kbd>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">All Lessons</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">b</kbd>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--theme-primary)] mb-4">General</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Show Help</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">?</kbd>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--theme-foreground)]">Close / Cancel</span>
                    <kbd className="px-2 py-1 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded text-sm font-mono text-[var(--theme-muted-foreground)]">Esc</kbd>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--theme-border)] text-center text-sm text-[var(--theme-muted-foreground)]">
              Press <kbd className="px-1.5 py-0.5 bg-[var(--theme-muted)] border border-[var(--theme-border)] rounded font-mono">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}
