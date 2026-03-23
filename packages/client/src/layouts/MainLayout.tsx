import { NavLink, Outlet, Link } from 'react-router-dom'
import { Suspense, useState, useRef, useEffect } from 'react'
import { BookOpen, Zap, Swords, Settings, BarChart3 } from 'lucide-react'
import { Avatar } from '@/components/Avatar'

const NAV_LINKS = [
  { to: '/lessons', label: 'Lessons', icon: BookOpen, end: false, hint: 'g l' },
  { to: '/challenges', label: 'Challenges', icon: Zap, end: false, hint: 'g c' },
]

export function MainLayout() {
  const [avatarOpen, setAvatarOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!avatarOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [avatarOpen])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
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
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <Link
          to="/"
          style={{
            marginBottom: '2rem',
            fontFamily: 'monospace',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            color: 'var(--theme-foreground, #ccc)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          vim-arena <Swords size={20} color="var(--theme-accent, #ff79c6)" />
        </Link>

        {NAV_LINKS.map(({ to, label, icon: Icon, end, hint }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontFamily: 'monospace',
              color: isActive ? 'var(--theme-primary, #00ff41)' : 'var(--theme-foreground, #ccc)',
              backgroundColor: isActive ? 'var(--theme-muted, #0d1f0d)' : 'transparent',
              fontWeight: isActive ? 'bold' : 'normal',
            })}
          >
            <Icon size={16} />
            <span style={{ flex: 1 }}>{label}</span>
            <kbd style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              padding: '1px 5px',
              borderRadius: '3px',
              backgroundColor: 'rgba(0,0,0,0.4)',
              color: 'var(--theme-muted-foreground, #666)',
              border: '1px solid var(--theme-border, #333)',
            }}>{hint}</kbd>
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setAvatarOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: avatarOpen ? 'var(--theme-muted, #0d1f0d)' : 'transparent',
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'var(--theme-foreground, #ccc)',
            }}
          >
            <Avatar seed="vim-arena-user" size={5} pixelSize={6} />
            <span>Profile</span>
          </button>

          {avatarOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '4px',
                background: 'var(--theme-background, #0d1117)',
                border: '1px solid var(--theme-border, #333)',
                borderRadius: '6px',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              <NavLink
                to="/stats"
                onClick={() => setAvatarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  textDecoration: 'none',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: isActive ? 'var(--theme-primary, #00ff41)' : 'var(--theme-foreground, #ccc)',
                  backgroundColor: isActive ? 'var(--theme-muted, #0d1f0d)' : 'transparent',
                })}
              >
                <BarChart3 size={14} />
                <span style={{ flex: 1 }}>Stats</span>
                <kbd style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'var(--theme-muted-foreground, #666)',
                  border: '1px solid var(--theme-border, #333)',
                }}>g t</kbd>
              </NavLink>
              <NavLink
                to="/settings"
                onClick={() => setAvatarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  textDecoration: 'none',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: isActive ? 'var(--theme-primary, #00ff41)' : 'var(--theme-foreground, #ccc)',
                  backgroundColor: isActive ? 'var(--theme-muted, #0d1f0d)' : 'transparent',
                })}
              >
                <Settings size={14} />
                <span style={{ flex: 1 }}>Settings</span>
                <kbd style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'var(--theme-muted-foreground, #666)',
                  border: '1px solid var(--theme-border, #333)',
                }}>g s</kbd>
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <Suspense fallback={<div style={{ fontFamily: 'monospace' }}>Loading...</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
