import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, TriangleAlert, Users, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Card, Skeleton, Stat } from '@/components/ui/Display'
import { Input } from '@/components/ui/Field'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, type Column } from '@/components/ui/Table'
import { useSaldosBanco } from '@/hooks/data'
import { useEmpresa } from '@/lib/empresaContext'
import { errorMessage } from '@/lib/api'
import { formatMinutes, formatSigned, signTone } from '@/lib/duracao'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { SaldoFuncionario } from '@/types/api'

export default function BancoHorasPage() {
  const navigate = useNavigate()
  const { empresaId, empresa } = useEmpresa()
  const saldos = useSaldosBanco(empresaId)
  const [busca, setBusca] = useState('')
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'nome', direction: 'asc' })

  const linhas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const base = (saldos.data ?? []).filter((s) => !q || s.funcionario.nome.toLowerCase().includes(q) || s.funcionario.matricula.toLowerCase().includes(q))
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...base].sort((a, b) => {
      if (sort.key === 'saldo') return (a.saldoMinutos - b.saldoMinutos) * dir
      if (sort.key === 'vencido') return (a.vencidoMinutos - b.vencidoMinutos) * dir
      if (sort.key === 'vencimento') return (a.proximoVencimento ?? '9999').localeCompare(b.proximoVencimento ?? '9999') * dir
      return a.funcionario.nome.localeCompare(b.funcionario.nome, 'pt-BR') * dir
    })
  }, [saldos.data, busca, sort])

  const todos = saldos.data ?? []
  const credito = todos.filter((s) => s.saldoMinutos > 0).reduce((a, s) => a + s.saldoMinutos, 0)
  const debito = todos.filter((s) => s.saldoMinutos < 0).reduce((a, s) => a + s.saldoMinutos, 0)
  const vencido = todos.reduce((a, s) => a + s.vencidoMinutos, 0)

  const columns: Column<SaldoFuncionario>[] = [
    {
      key: 'nome',
      header: 'Funcionário',
      sortable: true,
      cell: (s) => (
        <span className="block">
          <span className="block font-semibold">{s.funcionario.nome}</span>
          <span className="block text-xs text-fg-3">
            {s.funcionario.matricula} · {s.funcionario.cargo}
          </span>
        </span>
      ),
    },
    { key: 'saldo', header: 'Saldo', sortable: true, align: 'right', cell: (s) => <span className={cn('font-mono text-base font-bold tabular', signTone(s.saldoMinutos))}>{formatSigned(s.saldoMinutos)}</span> },
    {
      key: 'vencido',
      header: 'Vencido',
      sortable: true,
      align: 'right',
      cell: (s) => (s.vencidoMinutos ? <Badge tone="danger">{formatMinutes(s.vencidoMinutos)}</Badge> : <span className="text-fg-3">—</span>),
    },
    { key: 'vencimento', header: 'Próximo vencimento', sortable: true, cell: (s) => <span className="tabular">{formatDate(s.proximoVencimento)}</span> },
  ]

  return (
    <div>
      <PageHeader title="Banco de horas" description={`${empresa?.nomeFantasia ?? 'Empresa'} · saldos dos funcionários ativos`} icon={<Wallet className="size-6" />} />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {saldos.isLoading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[84px] rounded-2xl" />)
        ) : (
          <>
            <Stat label="Funcionários" value={todos.length} icon={<Users className="size-5" />} />
            <Stat label="Créditos" value={<span className="text-ok">{formatSigned(credito)}</span>} hint="soma dos saldos positivos" icon={<Wallet className="size-5" />} tone="var(--color-ok)" />
            <Stat label="Débitos" value={<span className="text-danger">{formatSigned(debito)}</span>} hint="soma dos saldos negativos" icon={<Wallet className="size-5" />} tone="var(--color-danger)" />
            <Stat label="Vencido" value={formatMinutes(vencido)} hint="créditos que passaram da validade" icon={<TriangleAlert className="size-5" />} tone="var(--color-warn)" />
          </>
        )}
      </section>

      <div className="mb-4 max-w-sm">
        <Input placeholder="Buscar por nome ou matrícula" value={busca} onChange={(event) => setBusca(event.target.value)} leading={<Search className="size-4" />} aria-label="Buscar funcionário" />
      </div>

      {saldos.isError ? (
        <Card>
          <ErrorState description={errorMessage(saldos.error)} onRetry={() => saldos.refetch()} />
        </Card>
      ) : saldos.isLoading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <Table
          columns={columns}
          rows={linhas}
          rowKey={(s) => s.funcionario.id}
          sort={sort}
          onSort={(key) => setSort((atual) => ({ key, direction: atual.key === key && atual.direction === 'asc' ? 'desc' : 'asc' }))}
          onRowClick={(s) => navigate(`/banco-horas/${s.funcionario.id}`)}
          rowLabel={(s) => `Abrir banco de horas de ${s.funcionario.nome}`}
          empty={<EmptyState compact icon={<Users className="size-5" />} title="Ninguém encontrado" />}
        />
      )}
    </div>
  )
}
