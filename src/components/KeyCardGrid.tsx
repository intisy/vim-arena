import { useState } from 'react'
import type { KeyCard } from '@/types/lesson'

interface KeyCardGridProps {
  keyCards: KeyCard[]
}

export function KeyCardGrid({ keyCards }: KeyCardGridProps) {
  if (!keyCards || keyCards.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
      {keyCards.map((card, idx) => (
        <KeyCardItem key={idx} card={card} />
      ))}
    </div>
  )
}

function KeyCardItem({ card }: { card: KeyCard }) {
  const [showExample, setShowExample] = useState(false)

  const renderCodeWithCursor = (code: string, cursor: { line: number; column: number }) => {
    const lines = code.split('\n')
    return (
      <div className="font-mono text-xs leading-relaxed bg-[var(--theme-editor-bg)] p-3 rounded border border-[var(--theme-border)] overflow-x-auto">
        {lines.map((line, lineIdx) => {
          if (lineIdx === cursor.line) {
            const beforeCursor = line.slice(0, cursor.column)
            const cursorChar = line[cursor.column] || ' '
            const afterCursor = line.slice(cursor.column + 1)
            
            return (
              <div key={lineIdx} className="whitespace-pre">
                <span className="text-[var(--theme-muted-foreground)] mr-3 select-none">{lineIdx + 1}</span>
                <span>{beforeCursor}</span>
                <span className="bg-[var(--theme-foreground)] text-[var(--theme-background)] animate-pulse">{cursorChar}</span>
                <span>{afterCursor}</span>
              </div>
            )
          }
          
          return (
            <div key={lineIdx} className="whitespace-pre">
              <span className="text-[var(--theme-muted-foreground)] mr-3 select-none">{lineIdx + 1}</span>
              <span>{line}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col p-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] shadow-sm hover:border-[var(--theme-primary)] transition-colors h-full">
      <div className="flex items-start gap-4 mb-3">
        <kbd className="flex-shrink-0 inline-flex items-center justify-center min-w-[3rem] h-12 px-3 bg-[var(--theme-muted)] border-2 border-[var(--theme-border)] rounded-lg text-xl font-mono font-bold text-[var(--theme-foreground)] shadow-[0_2px_0_var(--theme-border)]">
          {card.key}
        </kbd>
        <p className="text-sm text-[var(--theme-foreground)] mt-1 leading-relaxed">
          {card.description}
        </p>
      </div>
      
      {card.example && (
        <div className="mt-auto pt-3 border-t border-[var(--theme-border)]">
          <button
            onClick={() => setShowExample(!showExample)}
            className="text-xs font-medium text-[var(--theme-primary)] hover:underline flex items-center gap-1"
          >
            {showExample ? 'Hide Example' : 'Show Example'}
            <span className="transition-transform duration-200 inline-block" style={{ transform: showExample ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>
          
          {showExample && (
            <div className="mt-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted-foreground)] mb-1 block">Before</span>
                {renderCodeWithCursor(card.example.before, card.example.cursorBefore)}
              </div>
              <div className="flex justify-center">
                <span className="text-[var(--theme-muted-foreground)] text-xs">↓</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted-foreground)] mb-1 block">After</span>
                {renderCodeWithCursor(card.example.after, card.example.cursorAfter)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
