import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  useEffect(() => {
    document.title = '404 | vim-arena'
  }, [])

  return (
    <div>
      <h1>404 — Page Not Found</h1>
      <Link to="/">Return Home</Link>
    </div>
  )
}
