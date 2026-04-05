import { NavLink, Outlet, Link } from 'react-router-dom'
import { Suspense, useState, useRef, useEffect } from 'react'
import { BookOpen, Zap, Swords, Settings, BarChart3, LogOut, Menu, X } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { useAuth } from '@/contexts/AuthContext'

const NAV_LINKS = [
  { to: '/lessons', label: 'Lessons', icon: BookOpen, end: false, hint: 'g l' },
  { to: '/challenges', label: 'Challenges', icon: Zap, end: false, hint: 'g c' },
  { to: '/pvp', label: 'PvP Arena', icon: Swords, end: false, hint: 'g p' },
]

const PROFILE_LINKS = [
  { to: '/stats', label: 'Stats', icon: BarChart3, hint: 'g t' },
  { to: '/settings', label: 'Settings', icon: Settings, hint: 'g s' },
]

export function MainLayout() {
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, signOut } = useAuth()

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

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [])

  const sidebarContent = (
    <>
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2.5 px-3 py-3 mb-2 text-[var(--theme-foreground)] hover:text-[var(--theme-primary)] transition-colors group"
        onClick={() => setMobileOpen(false)}
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center group-hover:bg-[var(--theme-primary)]/20 transition-colors">
          <Swords size={18} className="text-[var(--theme-primary)]" />
        </div>
        <span className="text-lg font-black tracking-tight">vim-arena</span>
      </Link>

      <div className="divider-glow my-3" />

      {/* Section label */}
      <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted-foreground)]">
        Train
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-1 mb-6">
        {NAV_LINKS.map(({ to, label, icon: Icon, end, hint }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] shadow-sm shadow-[var(--theme-primary)]/5 border border-[var(--theme-primary)]/20'
                  : 'text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] hover:bg-[var(--theme-muted)] border border-transparent'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-background)] border border-[var(--theme-border)] text-[var(--theme-muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity">
              {hint}
            </kbd>
          </NavLink>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Profile section */}
      <div className="pt-3 mt-3">
        <div className="divider-glow mb-3" />
        {user ? (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setAvatarOpen(prev => !prev)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                avatarOpen
                  ? 'bg-[var(--theme-muted)] text-[var(--theme-foreground)] border border-[var(--theme-border)]'
                  : 'text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] hover:bg-[var(--theme-muted)] border border-transparent'
              }`}
            >
              <Avatar seed="vim-arena-user" size={5} pixelSize={6} />
              <span className="flex-1 text-left truncate">{user.email?.split('@')[0] ?? 'Profile'}</span>
            </button>

            {avatarOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] shadow-lg shadow-black/30 overflow-hidden z-50 animate-fade-in">
                {PROFILE_LINKS.map(({ to, label, icon: Icon, hint }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => { setAvatarOpen(false); setMobileOpen(false) }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-[var(--theme-primary)] bg-[var(--theme-muted)]'
                          : 'text-[var(--theme-muted-foreground)] hover:text-[var(--theme-foreground)] hover:bg-[var(--theme-muted)]'
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span className="flex-1">{label}</span>
                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-background)] border border-[var(--theme-border)] text-[var(--theme-muted-foreground)]">
                      {hint}
                    </kbd>
                  </NavLink>
                ))}
                <button
                  onClick={() => { signOut(); setAvatarOpen(false); setMobileOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[var(--theme-error)] hover:bg-[var(--theme-muted)] transition-colors border-t border-[var(--theme-border)]"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--theme-primary)] hover:bg-[var(--theme-muted)] transition-colors"
          >
            <Avatar seed="guest" size={5} pixelSize={6} />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-[var(--theme-background)]">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(prev => !prev)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-[var(--theme-muted)] border border-[var(--theme-border)] text-[var(--theme-foreground)] shadow-lg"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        aria-label="Main navigation"
        className={`fixed lg:sticky top-0 left-0 h-screen w-[240px] flex-shrink-0 flex flex-col p-4 border-r border-[var(--theme-border)] bg-[var(--theme-background)] z-40 overflow-y-auto transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-grid">
        <div className="max-w-[1200px] mx-auto p-6 lg:p-8">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64 text-[var(--theme-muted-foreground)] font-mono animate-pulse">
              Loading...
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
