import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, competenciaAtual, competenciaLabel, inicial } from '@/lib/format'
import { cn } from '@/lib/cn'

export function CompetenciaNav({ value, onChange, className, allowFuture = false }: { value: string; onChange: (value: string) => void; className?: string; allowFuture?: boolean }) {
  const atual = competenciaAtual()
  const next = addMonths(value, 1)
  const bloquearProximo = !allowFuture && next > atual
  const button = 'grid size-9 place-items-center rounded-xl text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-35 disabled:hover:bg-transparent'
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-soft', className)}>
      <button type="button" className={button} onClick={() => onChange(addMonths(value, -1))} aria-label="Mês anterior">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-40 px-2 text-center text-sm font-bold text-fg" aria-live="polite">
        {inicial(competenciaLabel(value))}
      </span>
      <button type="button" className={button} onClick={() => onChange(next)} disabled={bloquearProximo} aria-label="Próximo mês">
        <ChevronRight className="size-4" />
      </button>
      {value !== atual && (
        <button type="button" onClick={() => onChange(atual)} className="ml-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-500/10 dark:text-brand-300">
          Mês atual
        </button>
      )}
    </div>
  )
}
