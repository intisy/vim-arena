import { type ReactNode, useState, useEffect } from 'react'

const MIN_WIDTH = 1024

export function DesktopGate({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MIN_WIDTH)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MIN_WIDTH)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
          fontFamily: 'monospace',
          backgroundColor: '#0a0a0a',
          color: '#00ff41',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⌨️</div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>vim-arena requires a keyboard</h1>
        <p style={{ color: '#00aa2b', maxWidth: '400px' }}>
          Vim is a keyboard-driven editor. Please open vim-arena on a desktop or laptop computer.
        </p>
        <p style={{ color: '#003d12', marginTop: '1rem', fontSize: '0.875rem' }}>
          Minimum width: {MIN_WIDTH}px. Current: {window.innerWidth}px
        </p>
      </div>
    )
  }

  return <>{children}</>
}
