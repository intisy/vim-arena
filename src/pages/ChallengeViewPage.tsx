import { useParams } from 'react-router-dom'

export default function ChallengeViewPage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  return (
    <div>
      <h1>Challenge: {challengeId}</h1>
    </div>
  )
}
