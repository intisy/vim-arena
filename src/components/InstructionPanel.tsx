import type { LessonStep } from '@/types/lesson'

interface InstructionPanelProps {
  step: LessonStep
  hint: string | null
  attempts: number
}

function formatInstruction(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-[var(--color-foreground)]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-[var(--color-border)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--color-foreground)]">{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}

export function InstructionPanel({ step, hint, attempts }: InstructionPanelProps) {
  return (
    <div className="flex flex-col gap-6 p-6 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg h-full overflow-y-auto">
      <div className="text-lg text-[var(--color-foreground)] leading-relaxed">
        {formatInstruction(step.instruction)}
      </div>
      
      {step.requiredCommands.length > 0 && (
        <div className="mt-2">
          <h3 className="text-xs font-bold text-[var(--color-muted)] mb-3 uppercase tracking-wider">Required Commands</h3>
          <div className="flex flex-wrap gap-2">
            {step.requiredCommands.map((cmd, i) => (
              <kbd key={i} className="px-2.5 py-1 bg-[var(--color-background)] border border-[var(--color-border)] rounded text-sm font-mono text-[var(--color-foreground)] shadow-sm">
                {cmd}
              </kbd>
            ))}
          </div>
        </div>
      )}

      {hint && (
        <div className="mt-auto pt-6 border-t border-[var(--color-border)]">
          <div className="flex items-start gap-3 text-amber-500 bg-amber-500/10 p-4 rounded-md border border-amber-500/20">
            <span className="text-xl leading-none">💡</span>
            <div className="text-sm">
              <span className="font-semibold block mb-1 text-amber-600">Hint (Attempt {attempts})</span>
              <span className="text-amber-700/90">{hint}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
