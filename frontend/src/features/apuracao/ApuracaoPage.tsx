import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { RefreshCcw, Sheet, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Alert, Card, Skeleton } from '@/components/ui/Display'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toastContext'
import { CompetenciaNav } from '@/components/ponto/CompetenciaNav'
import { useResumoEmpresa } from '@/hooks/data'
import { usePermissoes } from '@/lib/authContext'
import { useEmpresa } from '@/lib/empresaContext'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { invalidarApuracao } from '@/lib/queryClient'
import { formatMinutes, formatOrDash, formatSigned, signTone } from '@/lib/duracao'
import { competenciaAtual, competenciaIntervalo, competenciaLabel, hojeIso, isCompetencia } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Reprocessamento, ResumoEmpresaLinha, TotaisPeriodo } from '@/types/api'

const debitos = (t: TotaisPeriodo) => t.atrasoMinutos + t.saidaAntecipadaMinutos + t.ausenciaParcialMinutos + t.faltaMinutos

function ReprocessarModal({ open, onClose, empresaId, competencia }: { open: boolean; onClose: () => void; empresaId: string; competencia: string }) {
  const toast = useToast()
  const intervalo = competenciaIntervalo(competencia)
  const hoje = hojeIso()
  const [de, setDe] = useState(intervalo.de)
  const [ate, setAte] = useState(intervalo.ate > hoje ? hoje : intervalo.ate)
  const [erros, setErros] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => http.post<Reprocessamento>('/api/apuracao/reprocessar', { empresaId, de, ate }),
    onSuccess: async (r) => {
      toast.success(`${r.dias} ${r.dias === 1 ? 'dia recalculado' : 'dias recalculados'}`, `${r.funcionarios} ${r.funcionarios === 1 ? 'funcionário' : 'funcionários'} no período.`)
      await invalidarApuracao()
      onClose()
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      setErros(campos)
      if (!campos.de && !campos.ate) toast.error('Não foi possível reprocessar', errorMessage(error))
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reprocessar período"
      description="Recalcula a apuração de todos os funcionários da empresa com a política e as jornadas vigentes em cada dia."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} icon={<RefreshCcw className="size-4" />} onClick={() => mutation.mutate()}>
            Reprocessar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Input type="date" label="De" value={de} onChange={(event) => setDe(event.target.value)} error={erros.de} />
        <Input type="date" label="Até" value={ate} onChange={(event) => setAte(event.target.value)} error={erros.ate} />
      </div>
      <Alert tone="neutral" className="mt-4">
        Dias futuros são ignorados e o dia de hoje continua provisório. Lançamentos manuais do banco de horas não são alterados.
      </Alert>
    </Modal>
  )
}

export default function ApuracaoPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const { cadastros } = usePermissoes()
  const { empresaId, empresa } = useEmpresa()
  const competencia = isCompetencia(search.get('competencia')) ? (search.get('competencia') as string) : competenciaAtual()
  const resumo = useResumoEmpresa(empresaId, competencia)
  const [reprocessar, setReprocessar] = useState(false)
  const r = resumo.data

  const setCompetencia = (value: string) => setSearch({ competencia: value }, { replace: true })

  const minutos = (valor: (t: TotaisPeriodo) => number, tone?: string, signed?: boolean) => ({
    cell: (l: ResumoEmpresaLinha) => {
      const v = valor(l.totais)
      return <span className={cn('font-mono tabular', v ? tone : 'text-fg-3', signed && signTone(v))}>{signed ? formatSigned(v) : formatOrDash(v)}</span>
    },
    footer: r ? <span className={cn('font-mono tabular', signed && signTone(valor(r.totais)))}>{signed ? formatSigned(valor(r.totais)) : formatMinutes(valor(r.totais))}</span> : null,
  })

  const columns: Column<ResumoEmpresaLinha>[] = [
    {
      key: 'nome',
      header: 'Funcionário',
      cell: (l) => (
        <span className="block min-w-44">
          <span className="block font-semibold">{l.nome}</span>
          <span className="block text-xs text-fg-3">
            {l.matricula} · {l.cargo}
          </span>
        </span>
      ),
      footer: r ? `Total · ${r.linhas.length} ${r.linhas.length === 1 ? 'pessoa' : 'pessoas'}` : null,
    },
    { key: 'trabalhado', header: 'Trabalhado', align: 'right', ...minutos((t) => t.trabalhadoMinutos) },
    { key: 'extras', header: 'Extras', align: 'right', ...minutos((t) => t.extrasMinutos, 'text-ok') },
    { key: 'noturno', header: 'Noturno', align: 'right', ...minutos((t) => t.noturnoFictoMinutos, 'text-night') },
    { key: 'debitos', header: 'Débitos', align: 'right', ...minutos(debitos, 'text-danger') },
    {
      key: 'faltas',
      header: 'Faltas',
      align: 'right',
      cell: (l) => <span className={cn('tabular', l.totais.diasComFalta ? 'font-semibold text-danger' : 'text-fg-3')}>{l.totais.diasComFalta || '—'}</span>,
      footer: r ? <span className="tabular">{r.totais.diasComFalta}</span> : null,
    },
    {
      key: 'inconsistentes',
      header: 'Inconsist.',
      align: 'right',
      cell: (l) => <span className={cn('tabular', l.totais.diasInconsistentes ? 'font-semibold text-warn' : 'text-fg-3')}>{l.totais.diasInconsistentes || '—'}</span>,
      footer: r ? <span className="tabular">{r.totais.diasInconsistentes}</span> : null,
    },
    { key: 'saldo', header: 'Saldo período', align: 'right', ...minutos((t) => t.saldoMinutos, undefined, true) },
    {
      key: 'banco',
      header: 'Saldo banco',
      align: 'right',
      cell: (l) => <span className={cn('font-mono font-semibold tabular', signTone(l.saldoBancoMinutos))}>{formatSigned(l.saldoBancoMinutos)}</span>,
      footer: r ? (
        <span className={cn('font-mono tabular', signTone(r.linhas.reduce((a, l) => a + l.saldoBancoMinutos, 0)))}>{formatSigned(r.linhas.reduce((a, l) => a + l.saldoBancoMinutos, 0))}</span>
      ) : null,
    },
    {
      key: 'pendentes',
      header: 'Ajustes',
      align: 'right',
      cell: (l) => <span className={cn('tabular', l.ajustesPendentes ? 'font-semibold text-warn' : 'text-fg-3')}>{l.ajustesPendentes || '—'}</span>,
      footer: r ? <span className="tabular">{r.linhas.reduce((a, l) => a + l.ajustesPendentes, 0)}</span> : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Apuração"
        description={
          <>
            {empresa?.nomeFantasia ?? 'Empresa'} · consolidado de {competenciaLabel(competencia)}, sem contar o dia de hoje
          </>
        }
        icon={<Sheet className="size-6" />}
        actions={
          cadastros &&
          empresaId && (
            <Button variant="secondary" icon={<RefreshCcw className="size-4" />} onClick={() => setReprocessar(true)}>
              Reprocessar período
            </Button>
          )
        }
      />
      <div className="mb-5">
        <CompetenciaNav value={competencia} onChange={setCompetencia} />
      </div>

      {resumo.isError ? (
        <Card>
          <ErrorState description={errorMessage(resumo.error)} onRetry={() => resumo.refetch()} />
        </Card>
      ) : !r ? (
        <Skeleton className="h-[420px] rounded-2xl" />
      ) : (
        <Table
          dense
          showFooter
          minWidth={940}
          columns={columns}
          rows={r.linhas}
          rowKey={(l) => l.funcionarioId}
          onRowClick={(l) => navigate(`/ponto/espelho/${l.funcionarioId}?competencia=${competencia}`)}
          rowLabel={(l) => `Abrir espelho de ${l.nome}`}
          empty={<EmptyState icon={<Users className="size-7" />} title="Ninguém na competência" description="Não há funcionários ativos neste mês para a empresa escolhida." />}
        />
      )}
      {empresaId && reprocessar && <ReprocessarModal open={reprocessar} onClose={() => setReprocessar(false)} empresaId={empresaId} competencia={competencia} />}
    </div>
  )
}
