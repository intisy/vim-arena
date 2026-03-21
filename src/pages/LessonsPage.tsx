import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALL_LESSONS } from '@/data/lessons/index'

export default function LessonsPage() {
  const navigate = useNavigate()
  
  useEffect(() => {
    if (ALL_LESSONS.length > 0) {
      navigate(`/lessons/${ALL_LESSONS[0].id}`, { replace: true })
    }
  }, [navigate])

  return null
}
