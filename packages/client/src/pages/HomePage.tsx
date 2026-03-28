import { useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Zap, Swords, ArrowRight, Github } from 'lucide-react'
import { StatsOverview } from '@/components/StatsOverview'
import { useAuth } from '@/contexts/AuthContext'

function LoginSection() {
  const { signInWithGitHub, signInWithGoogle } = useAuth()

  return (
    <section className="text-center flex flex-col items-center gap-6 py-12">
      <h1 className="text-6xl font-black tracking-tighter text-[var(--theme-primary)] drop-shadow-md flex items-center gap-3">
        vim-arena <Swords size={48} className="text-[var(--theme-accent)]" />
      </h1>
      <p className="text-2xl text-[var(--theme-foreground)] font-medium">
        Master Vim. Compete. Dominate.
      </p>
      <p className="text-[var(--theme-muted-foreground)] max-w-md">
        Sign in to track your progress, earn Elo ratings, and compete in PvP matches.
      </p>
      <div className="flex flex-col gap-3 mt-4 w-64">
        <button
          onClick={signInWithGitHub}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#24292e] text-white font-bold rounded-lg text-base hover:bg-[#2f363d] transition-colors"
        >
          <Github size={20} />
          Sign in with GitHub
        </button>
        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-800 font-bold rounded-lg text-base hover:bg-gray-100 transition-colors border border-gray-300"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </section>
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
    <div className="max-w-5xl mx-auto flex flex-col gap-12 py-8">
      {!user ? (
        <LoginSection />
      ) : (
        <>
          {/* Hero Section */}
          <section className="text-center flex flex-col items-center gap-6 py-12">
            <h1 className="text-6xl font-black tracking-tighter text-[var(--theme-primary)] drop-shadow-md flex items-center gap-3">
              vim-arena <Swords size={48} className="text-[var(--theme-accent)]" />
            </h1>
            <p className="text-2xl text-[var(--theme-foreground)] font-medium">
              Master Vim. Compete. Dominate.
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                to="/lessons"
                className="relative px-8 py-4 bg-[var(--theme-primary)] text-[var(--theme-background)] font-bold rounded-lg text-lg hover:opacity-90 transition-opacity shadow-[0_0_15px_var(--theme-primary)]"
              >
                Start Learning
                <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">1</kbd>
              </Link>
              <Link
                to="/challenges"
                className="relative px-8 py-4 bg-transparent border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] font-bold rounded-lg text-lg hover:bg-[var(--theme-muted)] transition-colors"
              >
                Try Challenges
                <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">2</kbd>
              </Link>
              <Link
                to="/pvp"
                className="relative px-8 py-4 bg-[var(--theme-warning)] text-[var(--theme-background)] font-bold rounded-lg text-lg hover:opacity-90 transition-opacity shadow-[0_0_15px_var(--theme-warning)]"
              >
                PvP Arena
                <kbd className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/80 text-white rounded shadow">3</kbd>
              </Link>
            </div>
          </section>

          {/* Feature Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col gap-4 hover:border-[var(--theme-primary)] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                <BookOpen size={28} className="text-[var(--theme-primary)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--theme-foreground)]">Lessons</h2>
              <p className="text-[var(--theme-muted-foreground)] flex-1">
                Interactive tutorials to build muscle memory. From basic motions to advanced text objects.
              </p>
              <Link to="/lessons" className="text-[var(--theme-primary)] font-bold hover:underline mt-2 flex items-center gap-1">
                Browse Lessons <ArrowRight size={16} />
              </Link>
            </div>

            <div className="p-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col gap-4 hover:border-[var(--theme-accent)] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[var(--theme-accent)]/10 flex items-center justify-center">
                <Zap size={28} className="text-[var(--theme-accent)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--theme-foreground)]">Challenges</h2>
              <p className="text-[var(--theme-muted-foreground)] flex-1">
                Test your speed and efficiency. Solve real-world editing tasks with the fewest keystrokes.
              </p>
              <Link to="/challenges" className="text-[var(--theme-accent)] font-bold hover:underline mt-2 flex items-center gap-1">
                View Challenges <ArrowRight size={16} />
              </Link>
            </div>

            <div className="p-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] flex flex-col gap-4 hover:border-[var(--theme-warning)] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[var(--theme-warning)]/10 flex items-center justify-center">
                <Swords size={28} className="text-[var(--theme-warning)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--theme-foreground)]">PvP Arena</h2>
              <p className="text-[var(--theme-muted-foreground)] flex-1">
                Go head-to-head against other developers in real-time Vim battles.
              </p>
              <Link to="/pvp" className="text-[var(--theme-warning)] font-bold hover:underline mt-2 flex items-center gap-1">
                Enter Arena <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          {/* Stats Overview */}
          <section className="mt-8">
            <h2 className="text-xl font-bold text-[var(--theme-foreground)] mb-4 uppercase tracking-wider border-b border-[var(--theme-border)] pb-2">
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
