import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { classeCor, classeLabel } from '@/lib/labels'
import { formatMinutes } from '@/lib/duracao'
import { hora } from '@/lib/format'
import { minutosDesde } from '@/lib/marcacoes'
import { cn } from '@/lib/cn'
import type { ClasseSegmento, Intervalo, Marcacao, Segmento } from '@/types/api'

interface Barra {
  inicio: number
  fim: number
  label: string
  cor: string
  classe?: ClasseSegmento
}

function Track({ titulo, barras, min, span, className }: { titulo: string; barras: Barra[]; min: number; span: number; className?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-right text-[0.72rem] font-semibold text-fg-3">{titulo}</span>
      <div className={cn('relative h-7 flex-1 rounded-lg bg-surface-2', className)}>
        {barras.map((barra, i) => {
          const left = ((barra.inicio - min) / span) * 100
          const width = Math.max(0.35, ((barra.fim - barra.inicio) / span) * 100)
          return (
            <motion.span
              key={`${barra.inicio}-${i}`}
              title={barra.label}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.05 + i * 0.04, duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              className={cn('absolute inset-y-1 origin-left rounded-md', barra.classe === 'Tolerado' && 'bg-stripes')}
              style={{ left: `${left}%`, width: `${width}%`, backgroundColor: barra.cor } as CSSProperties}
            />
          )
        })}
      </div>
    </div>
  )
}

export function TimelineDia({ data, previsto, segmentos, marcacoes }: { data: string; previsto: Intervalo[]; segmentos: Segmento[]; marcacoes: Marcacao[] }) {
  const pontos: number[] = []
  for (const p of previsto) pontos.push(minutosDesde(p.inicio, data), minutosDesde(p.fim, data))
  for (const s of segmentos) pontos.push(minutosDesde(s.inicio, data), minutosDesde(s.fim, data))
  for (const m of marcacoes) pontos.push(minutosDesde(m.dataHora, data))

  if (pontos.length === 0) {
    return <p className="rounded-xl border border-dashed border-line-2 px-4 py-6 text-center text-sm text-fg-3">Sem horário previsto nem marcações neste dia.</p>
  }

  const min = Math.floor((Math.min(...pontos) - 30) / 60) * 60
  const max = Math.ceil((Math.max(...pontos) + 30) / 60) * 60
  const span = Math.max(60, max - min)
  const passo = span > 16 * 60 ? 180 : span > 10 * 60 ? 120 : 60
  const ticks: number[] = []
  for (let t = Math.ceil(min / passo) * passo; t <= max; t += passo) ticks.push(t)

  const barrasPrevisto: Barra[] = previsto.map((p) => ({
    inicio: minutosDesde(p.inicio, data),
    fim: minutosDesde(p.fim, data),
    label: `Previsto ${hora(p.inicio)}–${hora(p.fim)}`,
    cor: 'color-mix(in oklab, var(--color-brand-500) 30%, transparent)',
  }))

  const realizados = segmentos.filter((s) => s.classe !== 'Noturno')
  const noturnos = segmentos.filter((s) => s.classe === 'Noturno')
  const toBarra = (s: Segmento): Barra => {
    const inicio = minutosDesde(s.inicio, data)
    const fim = minutosDesde(s.fim, data)
    return { inicio, fim, classe: s.classe, cor: classeCor[s.classe], label: `${classeLabel[s.classe]} ${hora(s.inicio)}–${hora(s.fim)} (${formatMinutes(fim - inicio)})` }
  }

  const presentes = new Set(segmentos.map((s) => s.classe))
  const legenda = (Object.keys(classeLabel) as ClasseSegmento[]).filter((c) => presentes.has(c))

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0" />
        <div className="relative h-5 flex-1">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 font-mono text-[0.66rem] text-fg-3 tabular" style={{ left: `${((t - min) / span) * 100}%` }}>
              {String(((Math.floor(t / 60) % 24) + 24) % 24).padStart(2, '0')}h
            </span>
          ))}
        </div>
      </div>
      <div className="relative flex flex-col gap-2">
        <div className="pointer-events-none absolute inset-y-0 right-0 left-[92px]">
          {ticks.map((t) => (
            <span key={t} className="absolute inset-y-0 w-px bg-line" style={{ left: `${((t - min) / span) * 100}%` }} />
          ))}
        </div>
        <Track titulo="Previsto" barras={barrasPrevisto} min={min} span={span} />
        <div className="relative">
          <Track titulo="Realizado" barras={realizados.map(toBarra)} min={min} span={span} />
          <div className="pointer-events-none absolute inset-y-0 right-0 left-[92px]">
            {marcacoes.map((m) => (
              <span
                key={m.id}
                title={`Marcação ${hora(m.dataHora)}`}
                className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-fg"
                style={{ left: `${((minutosDesde(m.dataHora, data) - min) / span) * 100}%` }}
              />
            ))}
          </div>
        </div>
        {noturnos.length > 0 && <Track titulo="Noturno" barras={noturnos.map(toBarra)} min={min} span={span} className="h-4" />}
      </div>
      {legenda.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 pl-[92px] text-[0.72rem] text-fg-2">
          {legenda.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-sm', c === 'Tolerado' && 'bg-stripes')} style={{ backgroundColor: classeCor[c] }} />
              {classeLabel[c]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-0.5 rounded-full bg-fg" />
            Marcação
          </span>
        </div>
      )}
    </div>
  )
}
