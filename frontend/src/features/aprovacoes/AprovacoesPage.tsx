import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Ban, Check, CheckCheck, ClipboardCheck, Clock3, Lock, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge, Card } from '@/components/ui/Display'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Field'
import { Tabs } from '@/components/ui/Navigation'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/toastContext'
import { useAjustes } from '@/hooks/data'
import { useEmpresa } from '@/lib/empresaContext'
import { errorMessage, http } from '@/lib/api'
import { invalidarApuracao } from '@/lib/queryClient'
import { formatDateMedium, formatInstant, hora, inicial } from '@/lib/format'
import { diffLista } from '@/lib/marcacoes'
import { statusAjusteLabel, statusAjusteTone, tipoAjusteLabel } from '@/lib/labels'
import { cn } from '@/lib/cn'
import type { Ajuste, StatusAjuste } from '@/types/api'

function Linha({ titulo, valores, destaque, tipo }: { titulo: string; valores: string[]; destaque: Set<number>; tipo: 'add' | 'remove' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-[0.7rem] font-semibold tracking-wide text-fg-3 uppercase">{titulo}</span>
      <span className="flex flex-wrap gap-1">
        {valores.length === 0 && <span className="text-xs text-fg-3">sem marcações</span>}
        {valores.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className={cn(
              'rounded-lg border px-1.5 py-0.5 font-mono text-[0.76rem] font-semibold tabular',
              destaque.has(i) ? (tipo === 'add' ? 'border-ok/40 bg-ok/12 text-ok' : 'border-danger/40 bg-danger/10 text-danger line-through') : 'border-line-2 bg-surface text-fg-2',
            )}
          >
            {tipo === 'add' && destaque.has(i) ? '+' : ''}
            {hora(v)}
          </span>
        ))}
      </span>
    </div>
  )
}

function AjusteCard({ ajuste, selecionado, onSelecionar, onAprovar, onRejeitar, ocupado }: { ajuste: Ajuste; selecionado: boolean; onSelecionar?: (v: boolean) => void; onAprovar: () => void; onRejeitar: () => void; ocupado: boolean }) {
  const { removidos, adicionados } = useMemo(() => diffLista(ajuste.marcacoesAntes, ajuste.marcacoesDepois), [ajuste])
  const pendente = ajuste.status === 'Pendente'
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn('flex flex-col rounded-2xl border bg-surface shadow-soft transition', selecionado ? 'border-brand-400 ring-2 ring-brand-500/20' : 'border-line')}
    >
      <header className="flex items-start gap-3 px-5 pt-4">
        {onSelecionar && <Checkbox checked={selecionado} onChange={onSelecionar} className="mt-0.5" />}
        <div className="min-w-0 flex-1">
          <Link to={`/ponto/espelho/${ajuste.funcionario.id}?competencia=${ajuste.diaReferencia.slice(0, 7)}`} className="block truncate font-bold text-fg hover:text-brand-600 dark:hover:text-brand-300">
            {ajuste.funcionario.nome}
          </Link>
          <p className="truncate text-xs text-fg-3">
            {ajuste.funcionario.matricula} · {ajuste.funcionario.cargo} · {ajuste.funcionario.empresa}
          </p>
        </div>
        <Badge tone={statusAjusteTone[ajuste.status]}>{statusAjusteLabel[ajuste.status]}</Badge>
      </header>
      <div className="flex flex-wrap items-center gap-2 px-5 pt-3 text-sm">
        <Badge tone={ajuste.tipo === 'Inclusao' ? 'ok' : 'danger'}>{tipoAjusteLabel[ajuste.tipo]}</Badge>
        <span className="font-mono text-base font-bold tabular">{hora(ajuste.dataHora)}</span>
        <span className="text-fg-2">{inicial(formatDateMedium(ajuste.diaReferencia))}</span>
      </div>
      <blockquote className="mx-5 mt-3 rounded-xl bg-surface-2/70 px-3 py-2 text-sm text-fg">“{ajuste.justificativa}”</blockquote>
      <div className="mx-5 mt-3 flex flex-col gap-1.5 rounded-xl border border-line px-3 py-2.5">
        <Linha titulo="Antes" valores={ajuste.marcacoesAntes} destaque={removidos} tipo="remove" />
        <Linha titulo="Depois" valores={ajuste.marcacoesDepois} destaque={adicionados} tipo="add" />
      </div>
      <p className="px-5 pt-3 text-xs text-fg-3">
        Solicitado por <span className="font-semibold text-fg-2">{ajuste.solicitadoPor ?? '—'}</span> em {formatInstant(ajuste.solicitadoEm)}
        {ajuste.decididoEm && (
          <>
            <br />
            {ajuste.status === 'Aprovado' ? 'Aprovado' : 'Rejeitado'} por <span className="font-semibold text-fg-2">{ajuste.decididoPor ?? '—'}</span> em {formatInstant(ajuste.decididoEm)}
            {ajuste.motivoDecisao && <> · motivo: {ajuste.motivoDecisao}</>}
          </>
        )}
      </p>
      <footer className="mt-auto px-5 pt-4 pb-4">
        {pendente &&
          (ajuste.podeDecidir ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={onAprovar} loading={ocupado} icon={<Check className="size-4" />} className="flex-1">
                Aprovar
              </Button>
              <Button size="sm" variant="secondary" onClick={onRejeitar} disabled={ocupado} icon={<X className="size-4" />} className="flex-1">
                Rejeitar
              </Button>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-fg-2">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-fg-3" />
              {ajuste.motivoBloqueio ?? 'Você não pode decidir este ajuste.'}
            </p>
          ))}
      </footer>
    </motion.article>
  )
}

export default function AprovacoesPage() {
  const toast = useToast()
  const { empresaId } = useEmpresa()
  const [tab, setTab] = useState<StatusAjuste>('Pendente')
  const pendentes = useAjustes('Pendente', empresaId, !!empresaId)
  const lista = useAjustes(tab, empresaId, !!empresaId)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [rejeitando, setRejeitando] = useState<Ajuste | null>(null)
  const [motivo, setMotivo] = useState('')
  const [motivoErro, setMotivoErro] = useState<string | null>(null)
  const [emAndamento, setEmAndamento] = useState<string | null>(null)
  const [lote, setLote] = useState(false)

  const itens = lista.data ?? []
  const decidiveis = itens.filter((a) => a.status === 'Pendente' && a.podeDecidir)

  const aprovar = useMutation({
    mutationFn: (id: string) => http.post<Ajuste>(`/api/ajustes/${id}/aprovar`),
    onMutate: (id) => setEmAndamento(id),
    onSuccess: async (a) => {
      toast.success('Ajuste aprovado', `${a.funcionario.nome} · ${hora(a.dataHora)} em ${formatDateMedium(a.diaReferencia)}`)
      await invalidarApuracao()
    },
    onError: (error) => toast.error('Não foi possível aprovar', errorMessage(error)),
    onSettled: () => setEmAndamento(null),
  })

  const rejeitar = useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: string }) => http.post<Ajuste>(`/api/ajustes/${id}/rejeitar`, { motivo: texto }),
    onSuccess: async (a) => {
      toast.info('Ajuste rejeitado', `${a.funcionario.nome} · o motivo fica registrado no espelho.`)
      setRejeitando(null)
      await invalidarApuracao()
    },
    onError: (error) => setMotivoErro(errorMessage(error)),
  })

  const aprovarSelecionados = async () => {
    const ids = decidiveis.filter((a) => selecionados.has(a.id)).map((a) => a.id)
    if (ids.length === 0) return
    setLote(true)
    let ok = 0
    const falhas: string[] = []
    for (const id of ids) {
      try {
        await http.post<Ajuste>(`/api/ajustes/${id}/aprovar`)
        ok++
      } catch (error) {
        falhas.push(errorMessage(error))
      }
    }
    setLote(false)
    setSelecionados(new Set())
    await invalidarApuracao()
    if (falhas.length === 0) toast.success(`${ok} ${ok === 1 ? 'ajuste aprovado' : 'ajustes aprovados'}`)
    else toast.warning(`${ok} aprovados, ${falhas.length} com erro`, falhas[0])
  }

  const alternar = (id: string, valor: boolean) =>
    setSelecionados((atual) => {
      const next = new Set(atual)
      if (valor) next.add(id)
      else next.delete(id)
      return next
    })

  const todosMarcados = decidiveis.length > 0 && decidiveis.every((a) => selecionados.has(a.id))
  const quantos = decidiveis.filter((a) => selecionados.has(a.id)).length

  return (
    <div>
      <PageHeader title="Aprovações" description="Pedidos de inclusão ou desconsideração de marcações, com o antes e o depois do dia." icon={<ClipboardCheck className="size-6" />} />

      <Tabs
        className="mb-5"
        value={tab}
        onChange={(v) => {
          setTab(v)
          setSelecionados(new Set())
        }}
        items={[
          { value: 'Pendente', label: 'Pendentes', icon: <Clock3 className="size-4" />, count: pendentes.data?.length },
          { value: 'Aprovado', label: 'Aprovados', icon: <CheckCheck className="size-4" /> },
          { value: 'Rejeitado', label: 'Rejeitados', icon: <Ban className="size-4" /> },
        ]}
      />

      {tab === 'Pendente' && decidiveis.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-soft">
          <Checkbox checked={todosMarcados} onChange={(v) => setSelecionados(v ? new Set(decidiveis.map((a) => a.id)) : new Set())} label="Selecionar todos que posso decidir" />
          <span className="text-sm text-fg-3">{quantos > 0 ? `${quantos} selecionado${quantos === 1 ? '' : 's'}` : ''}</span>
          <Button size="sm" className="ml-auto" disabled={quantos === 0} loading={lote} icon={<CheckCheck className="size-4" />} onClick={aprovarSelecionados}>
            Aprovar selecionados
          </Button>
        </div>
      )}

      {lista.isLoading ? (
        <GridSkeleton count={4} className="lg:grid-cols-2 xl:grid-cols-2" />
      ) : lista.isError ? (
        <Card>
          <ErrorState description={errorMessage(lista.error)} onRetry={() => lista.refetch()} />
        </Card>
      ) : itens.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="size-7" />}
            title={tab === 'Pendente' ? 'Nada para aprovar' : tab === 'Aprovado' ? 'Nenhum ajuste aprovado' : 'Nenhum ajuste rejeitado'}
            description={tab === 'Pendente' ? 'Quando alguém pedir um ajuste de ponto, ele aparece aqui.' : 'Os ajustes decididos ficam registrados nesta lista.'}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {itens.map((ajuste) => (
              <AjusteCard
                key={ajuste.id}
                ajuste={ajuste}
                selecionado={selecionados.has(ajuste.id)}
                onSelecionar={ajuste.status === 'Pendente' && ajuste.podeDecidir ? (v) => alternar(ajuste.id, v) : undefined}
                ocupado={emAndamento === ajuste.id || lote}
                onAprovar={() => aprovar.mutate(ajuste.id)}
                onRejeitar={() => {
                  setRejeitando(ajuste)
                  setMotivo('')
                  setMotivoErro(null)
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={!!rejeitando}
        onClose={() => setRejeitando(null)}
        title="Rejeitar ajuste"
        description={rejeitando ? `${rejeitando.funcionario.nome} · ${tipoAjusteLabel[rejeitando.tipo]} de ${hora(rejeitando.dataHora)} em ${formatDateMedium(rejeitando.diaReferencia)}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejeitando(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={rejeitar.isPending}
              icon={<X className="size-4" />}
              onClick={() => {
                if (!motivo.trim()) {
                  setMotivoErro('Informe o motivo da rejeição.')
                  return
                }
                if (rejeitando) rejeitar.mutate({ id: rejeitando.id, texto: motivo.trim() })
              }}
            >
              Rejeitar
            </Button>
          </>
        }
      >
        <Textarea label="Motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={500} placeholder="Explique por que o ajuste não será aceito." error={motivoErro ?? undefined} hint="O motivo fica visível para quem pediu o ajuste." />
      </Modal>
    </div>
  )
}
