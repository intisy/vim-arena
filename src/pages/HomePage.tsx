import { useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Zap, Swords, ArrowRight } from 'lucide-react'
import { StatsOverview } from '@/components/StatsOverview'

export function HomePage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Home | vim-arena'
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA' ||
      document.activeElement?.closest('.cm-editor')
    ) return

    if (e.key === '1') { e.preventDefault(); navigate('/lessons') }
    else if (e.key === '2') { e.preventDefault(); navigate('/challenges') }
  }, [navigate])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-12 py-8">
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

        <div className="p-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-muted)] flex flex-col gap-4 relative overflow-hidden opacity-80">
          <div className="absolute top-4 right-4 bg-[var(--theme-warning)] text-[var(--theme-background)] text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
            Coming Soon
          </div>
          <div className="w-12 h-12 rounded-lg bg-[var(--theme-warning)]/10 flex items-center justify-center">
            <Swords size={28} className="text-[var(--theme-warning)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--theme-foreground)]">PvP Arena</h2>
          <p className="text-[var(--theme-muted-foreground)] flex-1">
            Go head-to-head against other developers in real-time Vim battles.
          </p>
          <span className="text-[var(--theme-muted-foreground)] font-bold mt-2 cursor-not-allowed flex items-center gap-1">
            Join Waitlist <ArrowRight size={16} />
          </span>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-[var(--theme-foreground)] mb-4 uppercase tracking-wider border-b border-[var(--theme-border)] pb-2">
          Your Progress
        </h2>
        <StatsOverview />
      </section>
    </div>
  )
}

export default HomePage
