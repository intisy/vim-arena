import { useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Zap, Swords, ArrowRight, Github, Terminal, Trophy, Clock } from 'lucide-react'
import { StatsOverview } from '@/components/StatsOverview'
import { useAuth } from '@/contexts/AuthContext'

function LoginSection() {
  const { signInWithGitHub, signInWithGoogle } = useAuth()

  return (
    <div className="flex flex-col items-center gap-12 py-16">
      {/* Hero */}
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-muted)] text-xs font-bold text-[var(--theme-muted-foreground)] uppercase tracking-wider mb-6">
          <Terminal size={14} className="text-[var(--theme-primary)]" />
          Free &amp; Open Source
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[var(--theme-foreground)] mb-4">
          Master <span className="text-[var(--theme-primary)]">Vim</span> by doing.
        </h1>
        <p className="text-lg text-[var(--theme-muted-foreground)] max-w-lg mx-auto leading-relaxed">
          Interactive lessons, timed challenges, and PvP battles.
          Build real muscle memory — not just theory.
        </p>
      </div>

      {/* Auth buttons */}
      <div className="flex flex-col gap-3 w-72">
        <button
          onClick={signInWithGitHub}
          className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#24292e] text-white font-bold rounded-xl text-sm hover:bg-[#2f363d] transition-colors shadow-lg shadow-black/20"
        >
          <Github size={20} />
          Continue with GitHub
        </button>
        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white text-gray-800 font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors border border-gray-200 shadow-lg shadow-black/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <p className="text-center text-xs text-[var(--theme-muted-foreground)] mt-1">
          Or <Link to="/challenges" className="text-[var(--theme-primary)] hover:underline font-medium">try challenges</Link> without an account
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
        <div className="flex flex-col items-center text-center gap-2 p-5">
          <div className="w-10 h-10 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center mb-1">
            <BookOpen size={20} className="text-[var(--theme-primary)]" />
          </div>
          <h3 className="font-bold text-[var(--theme-foreground)] text-sm">60+ Lessons</h3>
          <p className="text-xs text-[var(--theme-muted-foreground)] leading-relaxed">
            From basic motions to advanced text objects
          </p>
        </div>
        <div className="flex flex-col items-center text-center gap-2 p-5">
          <div className="w-10 h-10 rounded-lg bg-[var(--theme-accent)]/10 flex items-center justify-center mb-1">
            <Clock size={20} className="text-[var(--theme-accent)]" />
          </div>
          <h3 className="font-bold text-[var(--theme-foreground)] text-sm">Timed Challenges</h3>
          <p className="text-xs text-[var(--theme-muted-foreground)] leading-relaxed">
            Adaptive difficulty with Elo rating system
          </p>
        </div>
        <div className="flex flex-col items-center text-center gap-2 p-5">
          <div className="w-10 h-10 rounded-lg bg-[var(--theme-warning)]/10 flex items-center justify-center mb-1">
            <Swords size={20} className="text-[var(--theme-warning)]" />
          </div>
          <h3 className="font-bold text-[var(--theme-foreground)] text-sm">PvP Battles</h3>
          <p className="text-xs text-[var(--theme-muted-foreground)] leading-relaxed">
            Race against other developers in real-time
          </p>
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    document.title = 'Home | vim-arena'
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA' ||
      document.activeElement?.closest('.cm-editor')
    ) return

    if (!user) return

    if (e.key === '1') { e.preventDefault(); navigate('/lessons') }
    else if (e.key === '2') { e.preventDefault(); navigate('/challenges') }
    else if (e.key === '3') { e.preventDefault(); navigate('/pvp') }
  }, [navigate, user])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-12">
      {!user ? (
        <LoginSection />
      ) : (
        <>
          {/* Welcome header */}
          <section className="pt-8">
            <h1 className="text-3xl font-bold text-[var(--theme-foreground)] mb-1">
              Welcome back
            </h1>
            <p className="text-[var(--theme-muted-foreground)]">
              Pick up where you left off.
            </p>
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/lessons"
              className="group relative flex flex-col gap-3 p-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-primary)] hover:shadow-lg hover:shadow-[var(--theme-primary)]/5 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                  <BookOpen size={20} className="text-[var(--theme-primary)]" />
                </div>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-muted)] border border-[var(--theme-border)] text-[var(--theme-muted-foreground)]">1</kbd>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--theme-foreground)] mb-1">Lessons</h2>
                <p className="text-sm text-[var(--theme-muted-foreground)] leading-relaxed">
                  Interactive tutorials to build muscle memory
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-[var(--theme-primary)] mt-auto">
                Continue <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>

            <Link
              to="/challenges"
              className="group relative flex flex-col gap-3 p-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-accent)] hover:shadow-lg hover:shadow-[var(--theme-accent)]/5 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[var(--theme-accent)]/10 flex items-center justify-center">
                  <Zap size={20} className="text-[var(--theme-accent)]" />
                </div>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-muted)] border border-[var(--theme-border)] text-[var(--theme-muted-foreground)]">2</kbd>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--theme-foreground)] mb-1">Challenges</h2>
                <p className="text-sm text-[var(--theme-muted-foreground)] leading-relaxed">
                  Test your speed with the fewest keystrokes
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-[var(--theme-accent)] mt-auto">
                Play <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>

            <Link
              to="/pvp"
              className="group relative flex flex-col gap-3 p-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] hover:border-[var(--theme-warning)] hover:shadow-lg hover:shadow-[var(--theme-warning)]/5 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[var(--theme-warning)]/10 flex items-center justify-center">
                  <Trophy size={20} className="text-[var(--theme-warning)]" />
                </div>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--theme-muted)] border border-[var(--theme-border)] text-[var(--theme-muted-foreground)]">3</kbd>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--theme-foreground)] mb-1">PvP Arena</h2>
                <p className="text-sm text-[var(--theme-muted-foreground)] leading-relaxed">
                  Real-time battles against other devs
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-[var(--theme-warning)] mt-auto">
                Enter <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </section>

          {/* Stats Overview */}
          <section>
            <h2 className="text-sm font-bold text-[var(--theme-muted-foreground)] uppercase tracking-wider mb-4">
              Your Progress
            </h2>
            <StatsOverview />
          </section>
        </>
      )}
    </div>
  )
}

export default HomePage
