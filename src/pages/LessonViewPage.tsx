import { useParams } from 'react-router-dom'

export default function LessonViewPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  return (
    <div>
      <h1>Lesson: {lessonId}</h1>
    </div>
  )
}
