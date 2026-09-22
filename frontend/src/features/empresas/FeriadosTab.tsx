import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CalendarHeart, Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, Badge, Card, Skeleton } from '@/components/ui/Display'
import { Input, Select } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toastContext'
import { useFeriados } from '@/hooks/data'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { invalidarApuracao, queryClient } from '@/lib/queryClient'
import { formatDate, weekdayShort } from '@/lib/format'
import { abrangenciaLabel, tipoFeriadoLabel } from '@/lib/labels'
import { ufs } from '@/lib/masks'
import type { AbrangenciaFeriado, Empresa, Feriado, SalvarFeriado, TipoFeriado } from '@/types/api'

interface Rascunho {
  id?: string
  data: string
  nome: string
  abrangencia: AbrangenciaFeriado
  uf: string
  municipio: string
  tipo: TipoFeriado
}

function FeriadoModal({ rascunho, empresa, onClose }: { rascunho: Rascunho; empresa: Empresa; onClose: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<Rascunho>(rascunho)
  const [erros, setErros] = useState<Record<string, string>>({})
  const set = <K extends keyof Rascunho>(key: K, value: Rascunho[K]) => setForm((f) => ({ ...f, [key]: value }))

  const mutation = useMutation({
    mutationFn: () => {
      const body: SalvarFeriado = {
        data: form.data,
        nome: form.nome.trim(),
        abrangencia: form.abrangencia,
        uf: form.abrangencia === 'Estadual' || form.abrangencia === 'Municipal' ? form.uf : null,
        municipio: form.abrangencia === 'Municipal' ? form.municipio.trim() : null,
        empresaId: form.abrangencia === 'Empresa' ? empresa.id : null,
        tipo: form.tipo,
      }
      return form.id ? http.put<Feriado>(`/api/feriados/${form.id}`, body) : http.post<Feriado>('/api/feriados', body)
    },
    onSuccess: async (f) => {
      toast.success(form.id ? 'Feriado atualizado' : 'Feriado incluído', `${f.nome} em ${formatDate(f.data)}. Os dias afetados foram recalculados.`)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['feriados'] }), invalidarApuracao()])
      onClose()
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      setErros(campos)
      if (Object.keys(campos).length === 0) toast.error('Não foi possível salvar', errorMessage(error))
    },
  })

  const salvar = () => {
    const local: Record<string, string> = {}
    if (!form.data) local.data = 'Informe a data.'
    if (!form.nome.trim()) local.nome = 'Informe o nome do feriado.'
    if (form.abrangencia === 'Municipal' && !form.municipio.trim()) local.municipio = 'Informe o município.'
    setErros(local)
    if (Object.keys(local).length === 0) mutation.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'Editar feriado' : 'Novo feriado'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} loading={mutation.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="date" label="Data" value={form.data} onChange={(e) => set('data', e.target.value)} error={erros.data} />
        <Select label="Tipo" value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoFeriado)} options={Object.entries(tipoFeriadoLabel).map(([value, label]) => ({ value, label }))} hint="Ponto facultativo não abona o dia." />
        <Input label="Nome" wrapperClassName="sm:col-span-2" value={form.nome} onChange={(e) => set('nome', e.target.value)} error={erros.nome} placeholder="Ex.: Aniversário da cidade" />
        <Select label="Abrangência" value={form.abrangencia} onChange={(e) => set('abrangencia', e.target.value as AbrangenciaFeriado)} options={Object.entries(abrangenciaLabel).map(([value, label]) => ({ value, label }))} />
        {(form.abrangencia === 'Estadual' || form.abrangencia === 'Municipal') && <Select label="UF" value={form.uf} onChange={(e) => set('uf', e.target.value)} options={ufs.map((u) => ({ value: u, label: u }))} error={erros.uf} />}
        {form.abrangencia === 'Municipal' && <Input label="Município" wrapperClassName="sm:col-span-2" value={form.municipio} onChange={(e) => set('municipio', e.target.value)} error={erros.municipio} />}
        {form.abrangencia === 'Empresa' && <Alert tone="neutral" className="sm:col-span-2">Vale só para {empresa.nomeFantasia}.</Alert>}
        {form.abrangencia === 'Nacional' && <Alert tone="neutral" className="sm:col-span-2">Vale para todas as empresas.</Alert>}
      </div>
    </Modal>
  )
}

export function FeriadosTab({ empresa, podeEditar }: { empresa: Empresa; podeEditar: boolean }) {
  const toast = useToast()
  const [ano, setAno] = useState(new Date().getFullYear())
  const feriados = useFeriados(ano, empresa.id)
  const [editando, setEditando] = useState<Rascunho | null>(null)
  const [excluindo, setExcluindo] = useState<Feriado | null>(null)

  const excluir = useMutation({
    mutationFn: (id: string) => http.del(`/api/feriados/${id}`),
    onSuccess: async () => {
      toast.success('Feriado excluído')
      setExcluindo(null)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['feriados'] }), invalidarApuracao()])
    },
    onError: (error) => toast.error('Não foi possível excluir', errorMessage(error)),
  })

  const columns: Column<Feriado>[] = [
    {
      key: 'data',
      header: 'Data',
      cell: (f) => (
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="font-mono tabular">{formatDate(f.data)}</span>
          <span className="text-xs text-fg-3">{weekdayShort(f.data)}</span>
        </span>
      ),
    },
    { key: 'nome', header: 'Nome', cell: (f) => <span className="font-semibold">{f.nome}</span> },
    {
      key: 'abrangencia',
      header: 'Abrangência',
      cell: (f) => (
        <span className="text-fg-2">
          {abrangenciaLabel[f.abrangencia]}
          {f.abrangencia === 'Estadual' && f.uf ? ` · ${f.uf}` : ''}
          {f.abrangencia === 'Municipal' ? ` · ${f.municipio}/${f.uf}` : ''}
        </span>
      ),
    },
    { key: 'tipo', header: 'Tipo', cell: (f) => <Badge tone={f.tipo === 'Feriado' ? 'night' : 'neutral'}>{tipoFeriadoLabel[f.tipo]}</Badge> },
    {
      key: 'vale',
      header: 'Vale aqui',
      align: 'center',
      cell: (f) => (f.valeParaEmpresa ? <Check className="mx-auto size-4 text-ok" aria-label="Sim" /> : <X className="mx-auto size-4 text-fg-3" aria-label="Não" />),
    },
  ]
  if (podeEditar)
    columns.push({
      key: 'acoes',
      header: '',
      align: 'right',
      cell: (f) => (
        <span className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar ${f.nome}`}
            onClick={() => setEditando({ id: f.id, data: f.data, nome: f.nome, abrangencia: f.abrangencia, uf: f.uf ?? empresa.uf, municipio: f.municipio ?? empresa.municipio, tipo: f.tipo })}
          >
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${f.nome}`} onClick={() => setExcluindo(f)} className="hover:text-danger">
            <Trash2 className="size-4" />
          </Button>
        </span>
      ),
    })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-soft">
          <button type="button" aria-label="Ano anterior" onClick={() => setAno((a) => a - 1)} className="grid size-9 place-items-center rounded-xl text-fg-2 hover:bg-surface-2">
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-16 text-center font-mono font-bold tabular">{ano}</span>
          <button type="button" aria-label="Próximo ano" onClick={() => setAno((a) => a + 1)} className="grid size-9 place-items-center rounded-xl text-fg-2 hover:bg-surface-2">
            <ChevronRight className="size-4" />
          </button>
        </div>
        {podeEditar && (
          <Button icon={<Plus className="size-4" />} onClick={() => setEditando({ data: `${ano}-01-01`, nome: '', abrangencia: 'Empresa', uf: empresa.uf, municipio: empresa.municipio, tipo: 'Feriado' })}>
            Novo feriado
          </Button>
        )}
      </div>
      {feriados.isError ? (
        <Card>
          <ErrorState description={errorMessage(feriados.error)} onRetry={() => feriados.refetch()} />
        </Card>
      ) : feriados.isLoading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <Table
          dense
          columns={columns}
          rows={feriados.data ?? []}
          rowKey={(f) => f.id}
          rowClassName={(f) => (f.valeParaEmpresa ? undefined : 'text-fg-3 opacity-75')}
          empty={<EmptyState compact icon={<CalendarHeart className="size-5" />} title={`Nenhum feriado em ${ano}`} />}
        />
      )}
      {editando && <FeriadoModal rascunho={editando} empresa={empresa} onClose={() => setEditando(null)} />}
      <ConfirmDialog
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={() => excluindo && excluir.mutate(excluindo.id)}
        loading={excluir.isPending}
        danger
        title="Excluir feriado?"
        description={excluindo ? `${excluindo.nome} (${formatDate(excluindo.data)}) deixa de valer e os dias afetados são recalculados.` : undefined}
        confirmLabel="Excluir"
      />
    </div>
  )
}
