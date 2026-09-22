import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Search, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/Button'
import { Badge, Card, Skeleton } from '@/components/ui/Display'
import { Input } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Navigation'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, type Column } from '@/components/ui/Table'
import { useFuncionarios } from '@/hooks/data'
import { useDebounced } from '@/hooks/ui'
import { usePermissoes } from '@/lib/authContext'
import { useEmpresa } from '@/lib/empresaContext'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { FuncionarioLista } from '@/types/api'

type Filtro = 'ativos' | 'inativos' | 'todos'

export default function FuncionariosPage() {
  const navigate = useNavigate()
  const { cadastros } = usePermissoes()
  const { empresaId, empresa } = useEmpresa()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('ativos')
  const termo = useDebounced(busca.trim(), 300)
  const lista = useFuncionarios({ empresaId, busca: termo || undefined, ativo: filtro === 'todos' ? undefined : filtro === 'ativos' }, !!empresaId)

  const columns: Column<FuncionarioLista>[] = [
    { key: 'matricula', header: 'Matrícula', cell: (f) => <span className="font-mono text-fg-2 tabular">{f.matricula}</span> },
    {
      key: 'nome',
      header: 'Nome',
      cell: (f) => (
        <span className="flex items-center gap-2 font-semibold">
          {f.nome}
          {!f.ativo && <Badge>{f.dataDemissao ? 'Desligado' : 'Inativo'}</Badge>}
        </span>
      ),
    },
    { key: 'cargo', header: 'Cargo', cell: (f) => <span className="text-fg-2">{f.cargo}</span> },
    { key: 'departamento', header: 'Departamento', cell: (f) => <span className="text-fg-2">{f.departamento ?? '—'}</span> },
    { key: 'gestor', header: 'Gestor', cell: (f) => <span className="text-fg-2">{f.gestor ?? '—'}</span> },
    { key: 'jornada', header: 'Jornada atual', cell: (f) => (f.jornadaAtual ? <Badge tone="brand">{f.jornadaAtual}</Badge> : <span className="text-xs text-warn">sem jornada</span>) },
    { key: 'admissao', header: 'Admissão', cell: (f) => <span className="tabular">{formatDate(f.dataAdmissao)}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Funcionários"
        description={`${empresa?.nomeFantasia ?? 'Empresa'}${cadastros ? '' : ' · sua equipe'}`}
        icon={<Users className="size-6" />}
        actions={
          cadastros && (
            <LinkButton to="/funcionarios/novo" icon={<Plus className="size-4" />}>
              Novo funcionário
            </LinkButton>
          )
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          wrapperClassName="w-full sm:max-w-sm"
          placeholder="Buscar por nome, matrícula, cargo ou CPF"
          aria-label="Buscar funcionários"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          leading={<Search className="size-4" />}
        />
        <Segmented
          ariaLabel="Situação"
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'ativos', label: 'Ativos' },
            { value: 'inativos', label: 'Inativos' },
            { value: 'todos', label: 'Todos' },
          ]}
        />
        {lista.data && <span className="text-sm text-fg-3 sm:ml-auto">{lista.data.length} {lista.data.length === 1 ? 'pessoa' : 'pessoas'}</span>}
      </div>
      {lista.isError ? (
        <Card>
          <ErrorState description={errorMessage(lista.error)} onRetry={() => lista.refetch()} />
        </Card>
      ) : !lista.data ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <Table
          minWidth={880}
          columns={columns}
          rows={lista.data}
          rowKey={(f) => f.id}
          onRowClick={(f) => navigate(`/funcionarios/${f.id}`)}
          rowLabel={(f) => `Abrir cadastro de ${f.nome}`}
          rowClassName={(f) => (f.ativo ? undefined : 'text-fg-3')}
          empty={<EmptyState icon={<Users className="size-7" />} title="Ninguém encontrado" description={termo ? 'Tente outro termo de busca.' : 'Não há funcionários com este filtro.'} />}
        />
      )}
    </div>
  )
}
