import { Badge } from '@/components/ui/Display'
import type { Tone } from '@/lib/labels'
import type { ApuracaoDia } from '@/types/api'

export function SituacaoBadge({ dia }: { dia: ApuracaoDia }) {
  if (dia.hoje) return <Badge tone="info" dot>Em andamento</Badge>
  if (!dia.calculado) {
    if (dia.tipoDia === 'Descanso') return <Badge>Descanso</Badge>
    if (dia.tipoDia === 'Feriado') return <Badge tone="night">{dia.feriadoNome ? `Feriado · ${dia.feriadoNome}` : 'Feriado'}</Badge>
    return <span className="text-xs text-fg-3">Sem apuração</span>
  }
  const map: Record<string, { tone: Tone; label: string }> = {
    Normal: { tone: 'ok', label: 'Normal' },
    Falta: { tone: 'danger', label: 'Falta' },
    Descanso: { tone: 'neutral', label: 'Descanso' },
    Feriado: { tone: 'night', label: dia.feriadoNome ? `Feriado · ${dia.feriadoNome}` : 'Feriado' },
    TrabalhoEmDescanso: { tone: 'info', label: 'Trabalho em descanso' },
    Inconsistente: { tone: 'warn', label: 'Inconsistente' },
  }
  const item = map[dia.situacao] ?? { tone: 'neutral' as Tone, label: dia.situacao || '—' }
  return (
    <Badge tone={item.tone} title={dia.feriadoNome}>
      {item.label}
    </Badge>
  )
}
