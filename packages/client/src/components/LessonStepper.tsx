interface LessonStepperProps {
  totalSteps: number
  currentStep: number // 0-based index
}

export function LessonStepper({ totalSteps, currentStep }: LessonStepperProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="text-sm text-[var(--color-muted)] font-medium">
        Step {Math.min(currentStep + 1, totalSteps)} of {totalSteps}
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          
          return (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-colors ${
                isCompleted
                  ? 'bg-green-500'
                  : isCurrent
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-border)]'
              }`}
              title={`Step ${index + 1}`}
            />
          )
        })}
      </div>
    </div>
  )
}
