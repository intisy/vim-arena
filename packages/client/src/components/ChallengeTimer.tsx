interface ChallengeTimerProps {
  timeLimit: number
  elapsed: number
  isActive: boolean
}

export function ChallengeTimer({ timeLimit, elapsed, isActive }: ChallengeTimerProps) {
  const remaining = Math.max(0, timeLimit - elapsed)
  const progress = Math.min(1, elapsed / timeLimit)
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  let colorClass = 'text-green-500'
  let barColorClass = 'bg-green-500'
  let pulseClass = ''

  if (progress >= 0.95) {
    colorClass = 'text-red-500'
    barColorClass = 'bg-red-500'
    pulseClass = 'animate-pulse'
  } else if (progress >= 0.9) {
    colorClass = 'text-red-500'
    barColorClass = 'bg-red-500'
  } else if (progress >= 0.75) {
    colorClass = 'text-orange-500'
    barColorClass = 'bg-orange-500'
  } else if (progress >= 0.5) {
    colorClass = 'text-yellow-500'
    barColorClass = 'bg-yellow-500'
  }

  return (
    <div className="flex flex-col items-end w-32">
      <div className={`text-2xl font-mono font-bold ${isActive ? colorClass : 'text-gray-500'} ${isActive ? pulseClass : ''}`}>
        {isActive ? formatTime(remaining) : '--:--'}
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full mt-1 overflow-hidden">
        <div 
          className={`h-full transition-all duration-100 ease-linear ${isActive ? barColorClass : 'bg-gray-600'}`}
          style={{ width: `${isActive ? (1 - progress) * 100 : 100}%` }}
        />
      </div>
    </div>
  )
}
