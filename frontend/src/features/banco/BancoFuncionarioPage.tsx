import { useState } from 'react'
import { useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { CalendarClock, Plus, PiggyBank, ScrollText, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/Button'
import { Alert, Badge, Card, CardHeader, Skeleton } from '@/components/ui/Display'
import { Input, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toastContext'
import { useBancoFuncionario } from '@/hooks/data'
import { usePermissoes } from '@/lib/authContext'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { invalidarApuracao } from '@/lib/queryClient'
import { formatHoras, formatMinutes, formatSigned, parseDuracao, signTone } from '@/lib/duracao'
import { formatDate, hojeIso } from '@/lib/format'
import { lancamentoLabel } from '@/lib/labels'
import { cn } from '@/lib/cn'
import type { BancoHoras, CreditoAVencer, Lancamento } from '@/types/api'

function LancamentoModal({ open, onClose, funcionarioId, nome }: { open: boolean; onClose: () => void; funcionarioId: string; nome: string }) {
  const toast = useToast()
  const [data, setData] = useState(hojeIso())
  const [tipo, setTipo] = useState<'credito' | 'debito'>('credito')
  const [duracao, setDuracao] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const parsed = parseDuracao(duracao)
  const minutos = parsed === null ? null : duracao.trim().startsWith('-') || duracao.trim().startsWith('+') ? parsed : tipo === 'debito' ? -Math.abs(parsed) : Math.abs(parsed)

  const mutation = useMutation({
    mutationFn: () => http.post<BancoHoras>('/api/banco-horas/lancamentos', { funcionarioId, data, minutos, descricao: descricao.trim() }),
    onSuccess: async (b) => {
      toast.success('Lançamento registrado', `Novo saldo de ${nome}: ${formatSigned(b.saldoMinutos)}`)
      await invalidarApuracao()
      onClose()
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      setErros(campos)
      if (!campos.minutos && !campos.descricao && !campos.data) toast.error('Não foi possível lançar', errorMessage(error))
    },
  })

  const enviar = () => {
    const local: Record<string, string> = {}
    if (minutos === null || minutos === 0) local.minutos = 'Informe a quantidade, como 1:30 ou 90 (minutos).'
    if (descricao.trim().length < 10) local.descricao = 'Descreva com ao menos 10 caracteres.'
    if (!data) local.data = 'Informe a data.'
    setErros(local)
    if (Object.keys(local).length === 0) mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lançamento manual"
      description={`${nome} · crédito ou débito direto no banco de horas`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={enviar} loading={mutation.isPending}>
            Lançar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface-2 p-1" role="radiogroup" aria-label="Tipo de lançamento">
          {(['credito', 'debito'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              onClick={() => setTipo(t)}
              className={cn('rounded-lg py-2 text-sm font-semibold transition', tipo === t ? (t === 'credito' ? 'bg-surface text-ok shadow-soft' : 'bg-surface text-danger shadow-soft') : 'text-fg-3 hover:text-fg')}
            >
              {t === 'credito' ? 'Crédito' : 'Débito'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input type="date" label="Data" value={data} max={hojeIso()} onChange={(event) => setData(event.target.value)} error={erros.data} />
          <Input
            label="Quantidade"
            placeholder="1:30"
            value={duracao}
            onChange={(event) => setDuracao(event.target.value)}
            error={erros.minutos}
            className="font-mono"
            hint={minutos !== null && minutos !== 0 ? <span className={signTone(minutos)}>{formatSigned(minutos)} ({formatHoras(minutos)})</span> : 'h:mm ou minutos; use - para débito'}
          />
        </div>
        <Textarea label="Descrição" value={descricao} onChange={(event) => setDescricao(event.target.value)} maxLength={300} placeholder="Ex.: compensação acordada com o gestor em 20/09." error={erros.descricao} hint="De 10 a 300 caracteres. Fica no extrato com seu nome." />
      </div>
    </Modal>
  )
}

export default function BancoFuncionarioPage() {
  const { funcionarioId } = useParams()
  const { cadastros, user } = usePermissoes()
  const banco = useBancoFuncionario(funcionarioId)
  const [lancando, setLancando] = useState(false)
  const b = banco.data
  const proprio = funcionarioId === user.funcionarioId

  const creditosCols: Column<CreditoAVencer>[] = [
    { key: 'data', header: 'Origem', cell: (c) => <span className="tabular">{formatDate(c.data)}</span> },
    { key: 'minutos', header: 'Em aberto', align: 'right', cell: (c) => <span className="font-mono font-semibold text-ok tabular">{formatMinutes(c.minutos)}</span> },
    {
      key: 'vence',
      header: 'Vence em',
      cell: (c) => (
        <span className="flex items-center gap-2 tabular">
          {formatDate(c.venceEm)}
          {c.vencido && <Badge tone="danger">Vencido</Badge>}
        </span>
      ),
    },
  ]

  const extratoCols: Column<Lancamento>[] = [
    { key: 'data', header: 'Data', cell: (l) => <span className="tabular">{formatDate(l.data)}</span> },
    { key: 'tipo', header: 'Tipo', cell: (l) => <Badge tone={l.tipo === 'Apuracao' ? 'neutral' : 'brand'}>{lancamentoLabel[l.tipo]}</Badge> },
    { key: 'descricao', header: 'Descrição', cell: (l) => <span className="text-fg-2">{l.descricao}</span>, className: 'min-w-56' },
    { key: 'minutos', header: 'Minutos', align: 'right', cell: (l) => <span className={cn('font-mono font-semibold tabular', signTone(l.minutos))}>{formatSigned(l.minutos)}</span> },
    { key: 'saldo', header: 'Saldo após', align: 'right', cell: (l) => <span className={cn('font-mono tabular', signTone(l.saldoApos))}>{formatSigned(l.saldoApos)}</span> },
    { key: 'por', header: 'Criado por', cell: (l) => <span className="text-fg-3">{l.criadoPor ?? 'Apuração automática'}</span> },
  ]

  return (
    <div>
      <PageHeader
        title={proprio ? 'Meu banco de horas' : 'Banco de horas'}
        description={b ? `${b.funcionario.nome} · ${b.funcionario.matricula} · ${b.funcionario.cargo}` : 'Saldo, créditos a vencer e extrato.'}
        crumbs={proprio ? undefined : [{ label: 'Banco de horas', to: '/banco-horas' }, { label: b?.funcionario.nome ?? 'Funcionário' }]}
        icon={<PiggyBank className="size-6" />}
        actions={
          <>
            <LinkButton to={proprio ? '/ponto/espelho' : `/ponto/espelho/${funcionarioId}`} variant="secondary" icon={<ScrollText className="size-4" />}>
              Espelho de ponto
            </LinkButton>
            {cadastros && b && (
              <Button icon={<Plus className="size-4" />} onClick={() => setLancando(true)}>
                Lançamento manual
              </Button>
            )}
          </>
        }
      />

      {banco.isError ? (
        <Card>
          <ErrorState description={errorMessage(banco.error)} onRetry={() => banco.refetch()} />
        </Card>
      ) : !b ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Skeleton className="h-60 rounded-3xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl bg-ink-900 p-7 text-white shadow-float">
              <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.55),transparent_65%)] blur-2xl" />
              <p className="relative text-sm font-semibold text-white/70">Saldo atual</p>
              <p className={cn('relative mt-2 font-mono text-[3.4rem] leading-none font-extrabold tracking-tight tabular', b.saldoMinutos < 0 ? 'text-red-300' : 'text-white')}>{formatSigned(b.saldoMinutos)}</p>
              <p className="relative mt-2 text-sm text-white/60">{formatHoras(b.saldoMinutos)} · validade dos créditos de {b.validadeMeses} meses</p>
              <div className="relative mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/8 px-4 py-3">
                  <p className="text-xs text-white/60">Créditos</p>
                  <p className="font-mono text-xl font-bold text-emerald-300 tabular">{formatSigned(b.creditosMinutos)}</p>
                </div>
                <div className="rounded-2xl bg-white/8 px-4 py-3">
                  <p className="text-xs text-white/60">Débitos</p>
                  <p className="font-mono text-xl font-bold text-red-300 tabular">{formatSigned(-Math.abs(b.debitosMinutos))}</p>
                </div>
              </div>
            </motion.section>

            <Card>
              <CardHeader title="Créditos em aberto" description="Consumidos na ordem em que foram gerados (FIFO)" action={<CalendarClock className="size-5 text-fg-3" />} />
              <div className="p-4">
                {b.vencidoMinutos > 0 && (
                  <Alert tone="danger" icon={<TriangleAlert className="size-4" />} className="mb-3" title={`${formatMinutes(b.vencidoMinutos)} de créditos vencidos`}>
                    Esses créditos passaram da validade e precisam ser pagos ou compensados conforme o acordo de banco de horas (CLT art. 59, § 5º).
                  </Alert>
                )}
                <Table dense columns={creditosCols} rows={b.creditosEmAberto} rowKey={(c, i) => `${c.data}-${i}`} maxHeight={300} empty={<EmptyState compact icon={<PiggyBank className="size-5" />} title="Nenhum crédito em aberto" />} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Extrato" description="Lançamentos mais recentes primeiro" />
            <div className="p-4">
              <Table dense minWidth={760} columns={extratoCols} rows={b.extrato} rowKey={(l) => l.id} maxHeight={560} empty={<EmptyState compact icon={<ScrollText className="size-5" />} title="Sem lançamentos ainda" />} />
            </div>
          </Card>
        </div>
      )}

      {b && funcionarioId && lancando && <LancamentoModal open={lancando} onClose={() => setLancando(false)} funcionarioId={funcionarioId} nome={b.funcionario.nome} />}
    </div>
  )
}
