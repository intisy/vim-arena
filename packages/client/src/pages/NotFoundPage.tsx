import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFoundPage() {
  useEffect(() => {
    document.title = '404 | vim-arena'
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-[var(--theme-error)]/10 flex items-center justify-center">
        <AlertTriangle size={32} className="text-[var(--theme-error)]" />
      </div>
      <div>
        <h1 className="text-5xl font-black text-[var(--theme-foreground)] mb-2">404</h1>
        <p className="text-lg text-[var(--theme-muted-foreground)]">
          This page doesn&apos;t exist. Maybe you mistyped the URL?
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--theme-primary)] text-[var(--theme-background)] font-bold text-sm hover:opacity-90 transition-opacity"
      >
        <Home size={16} />
        Back to Home
      </Link>
    </div>
  )
}
