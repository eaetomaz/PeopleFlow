import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { CalendarDays, ClipboardCheck, Moon, PiggyBank, ScrollText, Timer, TrendingDown, TrendingUp, UserX, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Card, Skeleton, Stat } from '@/components/ui/Display'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { LinkButton } from '@/components/ui/Button'
import { Table, type Column } from '@/components/ui/Table'
import { CompetenciaNav } from '@/components/ponto/CompetenciaNav'
import { FuncionarioPicker } from '@/components/ponto/FuncionarioPicker'
import { MarcacoesDoDia } from '@/components/ponto/MarcacaoChip'
import { SituacaoBadge } from '@/components/ponto/SituacaoBadge'
import { DiaDrawer } from '@/components/ponto/DiaDrawer'
import { useEspelho } from '@/hooks/data'
import { usePermissoes } from '@/lib/authContext'
import { useEmpresa } from '@/lib/empresaContext'
import { formatMinutes, formatOrDash, formatSigned, signTone } from '@/lib/duracao'
import { competenciaAtual, formatDiaMes, hora, isCompetencia, weekdayShort } from '@/lib/format'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { ApuracaoDia } from '@/types/api'

export default function EspelhoPage() {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const { user, gestao } = usePermissoes()
  const { empresaId } = useEmpresa()
  const funcionarioId = params.funcionarioId ?? user.funcionarioId
  const competencia = isCompetencia(search.get('competencia')) ? (search.get('competencia') as string) : competenciaAtual()
  const espelho = useEspelho(funcionarioId, competencia)
  const [dia, setDia] = useState<string | null>(null)
  const e = espelho.data

  const setCompetencia = (value: string) => {
    const next = new URLSearchParams(search)
    next.set('competencia', value)
    setSearch(next, { replace: true })
  }

  const escolher = (id: string) => {
    navigate(`/ponto/espelho/${id}?competencia=${competencia}`)
  }

  const columns: Column<ApuracaoDia>[] = [
    {
      key: 'dia',
      header: 'Dia',
      cell: (d) => (
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="font-mono font-semibold tabular">{formatDiaMes(d.data)}</span>
          <span className="text-xs text-fg-3">{weekdayShort(d.data)}</span>
        </span>
      ),
    },
    {
      key: 'previsto',
      header: 'Previsto',
      cell: (d) =>
        d.previsto.length === 0 ? (
          <span className="text-fg-3">—</span>
        ) : (
          <span className="flex flex-col font-mono text-[0.72rem] leading-tight whitespace-nowrap text-fg-2 tabular">
            {d.previsto.map((p) => (
              <span key={p.inicio}>
                {hora(p.inicio)}–{hora(p.fim)}
              </span>
            ))}
          </span>
        ),
    },
    { key: 'marcacoes', header: 'Marcações', cell: (d) => <MarcacoesDoDia marcacoes={d.marcacoes} />, className: 'min-w-44' },
    {
      key: 'trabalhado',
      header: 'Trabalhado',
      align: 'right',
      cell: (d) => <span className={cn('font-mono tabular', !d.trabalhadoMinutos && 'text-fg-3')}>{d.calculado && (d.trabalhadoMinutos || d.tipoDia === 'Util') ? formatMinutes(d.trabalhadoMinutos) : '—'}</span>,
    },
    {
      key: 'saldo',
      header: 'Saldo',
      align: 'right',
      cell: (d) => (d.calculado && (d.saldoMinutos || d.tipoDia === 'Util') ? <span className={cn('font-mono font-semibold tabular', signTone(d.saldoMinutos))}>{formatSigned(d.saldoMinutos)}</span> : <span className="text-fg-3">—</span>),
    },
    {
      key: 'extras',
      header: 'Extras',
      align: 'right',
      cell: (d) =>
        d.extrasMinutos ? (
          <span className="font-mono whitespace-nowrap text-ok tabular">
            {formatMinutes(d.extrasMinutos)} <span className="text-[0.68rem] text-fg-3">+{d.extrasPercentual}%</span>
          </span>
        ) : (
          <span className="text-fg-3">—</span>
        ),
    },
    {
      key: 'atraso',
      header: 'Atraso/saída',
      align: 'right',
      cell: (d) => {
        const total = d.atrasoMinutos + d.saidaAntecipadaMinutos + d.ausenciaParcialMinutos
        return total ? <span className="font-mono text-danger tabular">{formatMinutes(total)}</span> : <span className="text-fg-3">—</span>
      },
    },
    { key: 'noturno', header: 'Noturno', align: 'right', cell: (d) => (d.noturnoFictoMinutos ? <span className="font-mono text-night tabular">{formatMinutes(d.noturnoFictoMinutos)}</span> : <span className="text-fg-3">—</span>) },
    {
      key: 'situacao',
      header: 'Situação',
      cell: (d) => (
        <span className="flex flex-wrap items-center gap-1">
          <SituacaoBadge dia={d} />
          {d.inconsistencias.map((i) => (
            <Badge key={i} tone="warn">
              {i}
            </Badge>
          ))}
        </span>
      ),
    },
  ]

  const temNoturno = !!e?.dias.some((d) => d.noturnoFictoMinutos > 0)
  const colunas = temNoturno ? columns : columns.filter((c) => c.key !== 'noturno')
  const t = e?.totais
  const descricao = e ? `${e.funcionario.nome} · ${e.funcionario.matricula} · ${e.funcionario.cargo} · ${e.funcionario.empresa}` : 'Dia a dia da jornada, com marcações, extras e saldos.'

  return (
    <div>
      <PageHeader
        title="Espelho de ponto"
        description={descricao}
        icon={<ScrollText className="size-6" />}
        actions={
          funcionarioId && (
            <LinkButton to={`/banco-horas/${funcionarioId}`} variant="secondary" icon={<PiggyBank className="size-4" />}>
              Banco de horas
            </LinkButton>
          )
        }
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        {gestao ? <FuncionarioPicker className="w-full md:max-w-sm" label="Funcionário" empresaId={empresaId} value={funcionarioId} onChange={escolher} /> : <span />}
        <CompetenciaNav value={competencia} onChange={setCompetencia} />
      </div>

      {!funcionarioId ? (
        <Card>
          <EmptyState icon={<CalendarDays className="size-7" />} title="Escolha um funcionário" description="Seu usuário não tem ponto próprio. Selecione alguém da equipe para ver o espelho." />
        </Card>
      ) : espelho.isError ? (
        <Card>
          <ErrorState description={errorMessage(espelho.error)} onRetry={() => espelho.refetch()} />
        </Card>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {!t || !e ? (
              Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[84px] rounded-2xl" />)
            ) : (
              <>
                <Stat label="Trabalhado" value={formatMinutes(t.trabalhadoMinutos)} hint={`previsto ${formatMinutes(t.previstoMinutos)}`} icon={<Timer className="size-5" />} />
                <Stat label="Extras" value={<span className="text-ok">{formatMinutes(t.extrasMinutos)}</span>} hint={t.extrasNoturnasMinutos ? `${formatMinutes(t.extrasNoturnasMinutos)} noturnas` : `${t.diasTrabalhados} dias trabalhados`} icon={<TrendingUp className="size-5" />} tone="var(--color-extra)" />
                <Stat label="Noturno ficto" value={formatOrDash(t.noturnoFictoMinutos)} hint="hora noturna reduzida" icon={<Moon className="size-5" />} tone="var(--color-night)" />
                <Stat
                  label="Atrasos e saídas"
                  value={<span className={t.atrasoMinutos + t.saidaAntecipadaMinutos ? 'text-danger' : undefined}>{formatMinutes(t.atrasoMinutos + t.saidaAntecipadaMinutos + t.ausenciaParcialMinutos)}</span>}
                  hint={`atraso ${formatMinutes(t.atrasoMinutos)} · saída ${formatMinutes(t.saidaAntecipadaMinutos)}`}
                  icon={<TrendingDown className="size-5" />}
                  tone="var(--color-danger)"
                />
                <Stat label="Faltas" value={`${t.diasComFalta} ${t.diasComFalta === 1 ? 'dia' : 'dias'}`} hint={t.faltaMinutos ? formatMinutes(t.faltaMinutos) : 'nenhuma falta'} icon={<UserX className="size-5" />} tone="var(--color-danger)" />
                <Stat label="Saldo do período" value={<span className={signTone(t.saldoMinutos)}>{formatSigned(t.saldoMinutos)}</span>} hint="sem contar hoje" icon={<Wallet className="size-5" />} tone="var(--color-info)" />
                <Stat label="Banco de horas" value={<span className={signTone(e.saldoBancoMinutos)}>{formatSigned(e.saldoBancoMinutos)}</span>} hint="saldo atual" icon={<PiggyBank className="size-5" />} tone="var(--color-brand-500)" />
                <Stat label="Ajustes pendentes" value={e.ajustesPendentes} hint={t.diasInconsistentes ? `${t.diasInconsistentes} dias inconsistentes` : 'sem inconsistências'} icon={<ClipboardCheck className="size-5" />} tone="var(--color-warn)" />
              </>
            )}
          </section>

          {!e ? (
            <Skeleton className="h-[480px] rounded-2xl" />
          ) : (
            <Table
              dense
              minWidth={temNoturno ? 1000 : 900}
              columns={colunas}
              rows={e.dias}
              rowKey={(d) => d.data}
              onRowClick={(d) => setDia(d.data)}
              rowLabel={(d) => `Abrir detalhes de ${formatDiaMes(d.data)}`}
              rowClassName={(d) => cn(d.tipoDia !== 'Util' && d.trabalhadoMinutos === 0 && 'bg-surface-2/50 text-fg-3', d.hoje && 'bg-info/5', dia === d.data && 'bg-brand-500/8')}
            />
          )}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-3">
            <span>Clique em um dia para ver a linha do tempo e as regras aplicadas.</span>
            <span className="inline-flex items-center gap-1">
              <span className="rounded border border-brand-500/30 bg-brand-500/8 px-1 font-mono text-[0.65rem] text-brand-600">✎</span> ajuste aprovado
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="rounded border border-dashed border-warn/60 bg-warn/8 px-1 font-mono text-[0.65rem]">00:00</span> pendente
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-[0.7rem] line-through">00:00</span> desconsiderada
            </span>
          </p>
        </>
      )}

      <DiaDrawer funcionarioId={funcionarioId} funcionarioNome={e?.funcionario.nome} data={dia} onClose={() => setDia(null)} podeAjustar />
    </div>
  )
}
