import { useState } from 'react'
import { motion } from 'motion/react'
import { useInView } from '@/hooks/ui'
import { formatMinutes } from '@/lib/duracao'
import { formatDateMedium, formatDiaMes, inicial, weekdayIndex } from '@/lib/format'
import type { SerieDia } from '@/types/api'

export function ExtrasDebitosChart({ serie }: { serie: SerieDia[] }) {
  const [ref, visible] = useInView<HTMLDivElement>({ threshold: 0.2 })
  const [hover, setHover] = useState<number | null>(null)
  const height = 190
  const max = Math.max(60, ...serie.map((d) => Math.max(d.extrasMinutos, d.debitosMinutos)))
  const niceMax = Math.ceil(max / 60) * 60
  const ticks = [0, niceMax / 2, niceMax]

  return (
    <div ref={ref} className="relative">
      <div className="mb-4 flex items-center gap-4 text-xs text-fg-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-extra" />
          Horas extras
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-danger" />
          Débitos (atrasos, saídas e faltas)
        </span>
      </div>
      <div className="flex gap-3">
        <div className="relative flex w-9 shrink-0 flex-col justify-between text-right font-mono text-[0.66rem] text-fg-3 tabular" style={{ height }}>
          {[...ticks].reverse().map((t) => (
            <span key={t}>{formatMinutes(t)}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height }}>
            {ticks.map((t) => (
              <span key={t} className="h-px w-full bg-line" />
            ))}
          </div>
          <div className="relative flex items-end gap-[3px]" style={{ height }} onMouseLeave={() => setHover(null)}>
            {serie.map((dia, i) => {
              const fimDeSemana = [0, 6].includes(weekdayIndex(dia.data))
              const active = hover === i
              return (
                <div
                  key={dia.data}
                  tabIndex={0}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${formatDateMedium(dia.data)}: ${formatMinutes(dia.extrasMinutos)} de extras e ${formatMinutes(dia.debitosMinutos)} de débitos`}
                  className={`relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-md ${active ? 'bg-surface-2' : fimDeSemana ? 'bg-surface-2/40' : ''}`}
                >
                  {[
                    { valor: dia.extrasMinutos, cor: 'var(--color-extra)' },
                    { valor: dia.debitosMinutos, cor: 'var(--color-danger)' },
                  ].map((barra, j) => (
                    <motion.span
                      key={j}
                      className="w-[42%] max-w-3 rounded-t-[3px]"
                      style={{ background: barra.valor > 0 ? barra.cor : 'var(--app-surface-3)', minHeight: 2, opacity: active || hover === null ? 1 : 0.55 }}
                      initial={{ height: 0 }}
                      animate={{ height: visible ? `${Math.max((barra.valor / niceMax) * 100, barra.valor > 0 ? 2 : 1)}%` : 0 }}
                      transition={{ delay: visible ? i * 0.012 : 0, type: 'spring', stiffness: 140, damping: 20 }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
          {hover !== null && serie[hover] && (
            <div
              className="pointer-events-none absolute -top-3 z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 text-xs whitespace-nowrap shadow-float"
              style={{ left: `${((hover + 0.5) / serie.length) * 100}%` }}
            >
              <p className="font-semibold text-fg">{inicial(formatDateMedium(serie[hover].data))}</p>
              <p className="text-fg-2">
                Extras <span className="font-mono font-semibold text-ok tabular">{formatMinutes(serie[hover].extrasMinutos)}</span>
              </p>
              <p className="text-fg-2">
                Débitos <span className="font-mono font-semibold text-danger tabular">{formatMinutes(serie[hover].debitosMinutos)}</span>
              </p>
            </div>
          )}
          {serie.length > 0 && (
            <div className="mt-2 flex justify-between text-[0.68rem] text-fg-3">
              <span>{formatDiaMes(serie[0].data)}</span>
              <span>{formatDiaMes(serie[serie.length - 1].data)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
