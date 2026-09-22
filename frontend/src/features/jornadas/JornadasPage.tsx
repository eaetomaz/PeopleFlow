import { useNavigate } from 'react-router'
import { CalendarClock, Plus, Repeat, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/Button'
import { Badge, Card, Skeleton } from '@/components/ui/Display'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, type Column } from '@/components/ui/Table'
import { useJornadas } from '@/hooks/data'
import { usePermissoes } from '@/lib/authContext'
import { useEmpresa } from '@/lib/empresaContext'
import { errorMessage } from '@/lib/api'
import { formatMinutes } from '@/lib/duracao'
import type { Jornada } from '@/types/api'

function resumoDias(j: Jornada) {
  const trabalho = j.dias.filter((d) => !d.folga)
  if (j.tipo === 'Ciclica') return `ciclo de ${j.dias.length} ${j.dias.length === 1 ? 'dia' : 'dias'}, ${trabalho.length} de trabalho`
  return `${trabalho.length} ${trabalho.length === 1 ? 'dia' : 'dias'} de trabalho por semana`
}

export default function JornadasPage() {
  const navigate = useNavigate()
  const { cadastros } = usePermissoes()
  const { empresaId, empresa } = useEmpresa()
  const jornadas = useJornadas(empresaId, !!empresaId)

  const columns: Column<Jornada>[] = [
    {
      key: 'nome',
      header: 'Jornada',
      cell: (j) => (
        <span className="block">
          <span className="flex items-center gap-2 font-semibold">
            {j.nome}
            {!j.ativa && <Badge>Inativa</Badge>}
          </span>
          <span className="block text-xs text-fg-3">{resumoDias(j)}</span>
        </span>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      cell: (j) => (
        <Badge tone={j.tipo === 'Semanal' ? 'brand' : 'night'}>
          {j.tipo === 'Semanal' ? <CalendarClock className="size-3" /> : <Repeat className="size-3" />}
          {j.tipo === 'Semanal' ? 'Semanal' : 'Cíclica'}
        </Badge>
      ),
    },
    { key: 'carga', header: 'Carga do ciclo', align: 'right', cell: (j) => <span className="font-mono font-semibold tabular">{formatMinutes(j.cargaCicloMinutos)}</span> },
    { key: 'virada', header: 'Virada', align: 'right', cell: (j) => <span className="font-mono text-fg-2 tabular">{j.horaVirada}</span> },
    {
      key: 'vinculados',
      header: 'Vinculados',
      align: 'right',
      cell: (j) => (
        <span className="inline-flex items-center gap-1.5 tabular">
          <Users className="size-3.5 text-fg-3" />
          {j.funcionariosVinculados}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Jornadas"
        description={`${empresa?.nomeFantasia ?? 'Empresa'} · horários previstos usados na apuração`}
        icon={<CalendarClock className="size-6" />}
        actions={
          cadastros && (
            <LinkButton to="/jornadas/nova" icon={<Plus className="size-4" />}>
              Nova jornada
            </LinkButton>
          )
        }
      />
      {jornadas.isError ? (
        <Card>
          <ErrorState description={errorMessage(jornadas.error)} onRetry={() => jornadas.refetch()} />
        </Card>
      ) : !jornadas.data ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : (
        <Table
          columns={columns}
          rows={jornadas.data}
          rowKey={(j) => j.id}
          onRowClick={(j) => navigate(`/jornadas/${j.id}`)}
          rowLabel={(j) => `Abrir jornada ${j.nome}`}
          empty={<EmptyState icon={<CalendarClock className="size-7" />} title="Nenhuma jornada nesta empresa" description="Crie a primeira jornada para vincular aos funcionários." />}
        />
      )}
    </div>
  )
}
