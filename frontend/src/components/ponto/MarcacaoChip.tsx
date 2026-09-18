import { Clock3, Pencil } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatInstant, hora } from '@/lib/format'
import type { ChipKind, ChipMarcacao } from '@/lib/marcacoes'
import { chipsDoDia } from '@/lib/marcacoes'
import type { Marcacao } from '@/types/api'

const kindClass: Record<ChipKind, string> = {
  normal: 'border-line-2 bg-surface text-fg',
  ajustada: 'border-brand-500/30 bg-brand-500/8 text-brand-700 dark:text-brand-200',
  pendente: 'border-dashed border-warn/60 bg-warn/8 text-[#8a5200] dark:text-warn',
  desconsiderada: 'border-line bg-surface-2 text-fg-3 line-through decoration-danger/70',
  'desconsiderar-pendente': 'border-dashed border-warn/60 bg-surface text-fg-2 line-through decoration-warn',
  rejeitada: 'border-line bg-surface-2 text-fg-3 opacity-70',
}

function descricao(chip: ChipMarcacao): string {
  const m = chip.marcacao
  const base = m.origem === 'Registro' ? `Registro NSR ${m.nsr}` : 'Inclusão manual'
  const extras: string[] = [base]
  if (chip.kind === 'ajustada') extras.push(`aprovada por ${m.decididoPor ?? '—'} em ${formatInstant(m.decididoEm)}`)
  if (chip.kind === 'pendente') extras.push('aguardando aprovação')
  if (chip.kind === 'desconsiderada') extras.push('desconsiderada por ajuste aprovado')
  if (chip.kind === 'desconsiderar-pendente') extras.push('pedido de desconsideração pendente')
  if (chip.kind === 'rejeitada') extras.push('inclusão rejeitada')
  if (m.justificativa) extras.push(`“${m.justificativa}”`)
  return extras.join(' · ')
}

export function MarcacaoChip({ chip, size = 'sm' }: { chip: ChipMarcacao; size?: 'sm' | 'md' }) {
  const { kind, marcacao } = chip
  return (
    <span
      title={descricao(chip)}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border font-mono font-semibold tabular',
        size === 'sm' ? 'px-1.5 py-0.5 text-[0.76rem]' : 'px-2.5 py-1 text-sm',
        kindClass[kind],
      )}
    >
      {kind === 'ajustada' && <Pencil className="size-3" aria-label="ajuste aprovado" />}
      {(kind === 'pendente' || kind === 'desconsiderar-pendente') && <Clock3 className="size-3 no-underline" aria-hidden />}
      {hora(marcacao.dataHora)}
      {kind === 'pendente' && <span className="font-sans text-[0.62rem] font-bold tracking-wide uppercase">pendente</span>}
    </span>
  )
}

export function MarcacoesDoDia({ marcacoes, empty = '—', size }: { marcacoes: Marcacao[]; empty?: string; size?: 'sm' | 'md' }) {
  const chips = chipsDoDia(marcacoes)
  if (chips.length === 0) return <span className="text-fg-3">{empty}</span>
  return (
    <span className="flex flex-wrap gap-1 xl:flex-nowrap">
      {chips.map((chip) => (
        <MarcacaoChip key={chip.marcacao.id} chip={chip} size={size} />
      ))}
    </span>
  )
}
