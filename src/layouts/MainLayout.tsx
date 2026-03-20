import { NavLink, Outlet } from 'react-router-dom'
import { Suspense } from 'react'

const NAV_LINKS = [
  { to: '/', label: '🏠 Home', end: true },
  { to: '/lessons', label: '📚 Lessons', end: false },
  { to: '/challenges', label: '⚡ Challenges', end: false },
  { to: '/settings', label: '⚙️ Settings', end: false },
]

export function MainLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav
        aria-label="Main navigation"
        style={{
          width: '220px',
          flexShrink: 0,
          borderRight: '1px solid var(--theme-border, #333)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1rem',
          gap: '0.5rem',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '2rem', fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold' }}>
          vim-arena ⚔️
        </div>

        {/* Nav links */}
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'block',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontFamily: 'monospace',
              color: isActive ? 'var(--theme-primary, #00ff41)' : 'var(--theme-foreground, #ccc)',
              backgroundColor: isActive ? 'var(--theme-muted, #0d1f0d)' : 'transparent',
              fontWeight: isActive ? 'bold' : 'normal',
            })}
          >
            {label}
          </NavLink>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer — ThemeToggle will be inserted here by App.tsx later */}
        <div id="theme-toggle-slot" />
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <Suspense fallback={<div style={{ fontFamily: 'monospace' }}>Loading...</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
