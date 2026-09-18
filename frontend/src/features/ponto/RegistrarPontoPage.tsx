import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, ClipboardPen, Fingerprint, Info, LogIn, LogOut, ScrollText, Timer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/Button'
import { Alert, Badge, Card, CardHeader, Skeleton } from '@/components/ui/Display'
import { ErrorState } from '@/components/ui/States'
import { useToast } from '@/components/ui/toastContext'
import { AjusteModal } from '@/components/ponto/AjusteModal'
import { MarcacaoChip } from '@/components/ponto/MarcacaoChip'
import { SituacaoBadge } from '@/components/ponto/SituacaoBadge'
import { usePontoHoje } from '@/hooks/data'
import { useNow } from '@/hooks/ui'
import { ApiError, errorMessage, http } from '@/lib/api'
import { invalidarApuracao } from '@/lib/queryClient'
import { formatMinutes, formatOrDash, formatSigned, signTone } from '@/lib/duracao'
import { formatDateLong, hora, inicial, toIsoDate } from '@/lib/format'
import { chipsDoDia, marcacoesEfetivas } from '@/lib/marcacoes'
import { cn } from '@/lib/cn'
import type { RegistroPonto } from '@/types/api'

function RelogioGrande() {
  const now = useNow(1000)
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-semibold text-white/70">{inicial(formatDateLong(toIsoDate(now)))}</p>
      <p className="mt-2 font-mono text-[clamp(3.4rem,8vw,5.4rem)] leading-none font-extrabold tracking-tight tabular" aria-live="off">
        {hh}:{mm}
        <span className="text-[0.45em] text-white/55">:{ss}</span>
      </p>
    </div>
  )
}

export default function RegistrarPontoPage() {
  const toast = useToast()
  const hoje = usePontoHoje()
  const [ajusteAberto, setAjusteAberto] = useState(false)
  const [ultimo, setUltimo] = useState<RegistroPonto | null>(null)
  const [conflito, setConflito] = useState<string | null>(null)

  const registrar = useMutation({
    mutationFn: () => http.post<RegistroPonto>('/api/ponto/registrar'),
    onSuccess: async (registro) => {
      setUltimo(registro)
      setConflito(null)
      toast.success(`Ponto registrado às ${hora(registro.dataHora)} (NSR ${registro.nsr})`)
      await invalidarApuracao()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setConflito(errorMessage(error))
        toast.warning('Registro não feito', errorMessage(error))
      } else toast.error('Não foi possível registrar', errorMessage(error))
    },
  })

  const d = hoje.data
  const efetivas = d ? marcacoesEfetivas(d.dia.marcacoes) : []
  const proximaEhEntrada = efetivas.length % 2 === 0

  return (
    <div>
      <PageHeader
        title="Registrar ponto"
        description={d ? `${d.funcionario.nome} · ${d.funcionario.cargo}` : 'Registre entradas e saídas com um clique.'}
        icon={<Fingerprint className="size-6" />}
        actions={
          <LinkButton to="/ponto/espelho" variant="secondary" icon={<ScrollText className="size-4" />}>
            Espelho de ponto
          </LinkButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-10 text-white shadow-float sm:px-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,#000,transparent)]" />
            <div className="absolute -top-28 left-1/2 size-[420px] -translate-x-1/2 animate-drift rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.5),transparent_65%)] blur-2xl" />
            <div className="absolute -right-20 -bottom-28 size-72 animate-drift rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.3),transparent_65%)] blur-2xl [animation-delay:-5s]" />
          </div>
          <div className="relative flex flex-col items-center text-center">
            <RelogioGrande />
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={registrar.isPending || !d}
              onClick={() => registrar.mutate()}
              className="group relative mt-9 grid size-44 place-items-center rounded-full bg-brand-gradient shadow-[0_24px_60px_-18px_rgba(13,148,136,0.95)] transition hover:scale-[1.03] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand-300 disabled:opacity-60"
              aria-label="Registrar ponto agora"
            >
              <span className="absolute inset-0 animate-pulse-ring rounded-full text-brand-300" />
              <span className="absolute inset-2 rounded-full border border-white/25" />
              <span className="relative flex flex-col items-center gap-2">
                <Fingerprint className={cn('size-12 transition-transform group-hover:scale-110', registrar.isPending && 'animate-pulse')} />
                <span className="text-base font-bold">{registrar.isPending ? 'Registrando…' : 'Registrar ponto'}</span>
              </span>
            </motion.button>
            <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/80">
              {proximaEhEntrada ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
              {d ? (proximaEhEntrada ? 'O próximo registro será uma entrada' : 'O próximo registro será uma saída') : 'Carregando seu dia…'}
            </p>
            {d?.proximoPrevisto && <p className="mt-1 text-xs text-white/50">Próximo horário previsto: {hora(d.proximoPrevisto)}</p>}
            <AnimatePresence>
              {ultimo && (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold">
                  Último registro às {hora(ultimo.dataHora)} · NSR {ultimo.nsr}
                </motion.p>
              )}
            </AnimatePresence>
            {conflito && <p className="mt-3 max-w-md text-sm text-amber-200">{conflito}</p>}
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {hoje.isError ? (
            <Card>
              <ErrorState description={errorMessage(hoje.error)} onRetry={() => hoje.refetch()} />
            </Card>
          ) : !d ? (
            <>
              <Skeleton className="h-52 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader
                  title="Marcações de hoje"
                  description={
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" />
                      {d.jornada ?? 'Sem jornada vigente'}
                    </span>
                  }
                  action={
                    <Button size="sm" variant="soft" icon={<ClipboardPen className="size-4" />} onClick={() => setAjusteAberto(true)}>
                      Solicitar ajuste
                    </Button>
                  }
                />
                <div className="px-5 pt-4 pb-5">
                  {d.dia.previsto.length > 0 ? (
                    <p className="mb-4 text-sm text-fg-2">
                      Previsto: <span className="font-mono font-semibold text-fg tabular">{d.dia.previsto.map((p) => `${hora(p.inicio)}–${hora(p.fim)}`).join(' · ')}</span>
                    </p>
                  ) : (
                    <p className="mb-4 text-sm text-fg-2">Hoje não tem horário previsto na sua jornada.</p>
                  )}
                  {chipsDoDia(d.dia.marcacoes, true).length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line-2 px-4 py-6 text-center text-sm text-fg-3">Nenhuma marcação hoje ainda.</p>
                  ) : (
                    <ol className="relative flex flex-col gap-3 border-l-2 border-line pl-5">
                      {chipsDoDia(d.dia.marcacoes, true).map((chip, i) => (
                        <motion.li key={chip.marcacao.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative flex items-center gap-3">
                          <span className={cn('absolute -left-[27px] size-3 rounded-full ring-4 ring-surface', i % 2 === 0 ? 'bg-brand-500' : 'bg-fg-3')} />
                          <MarcacaoChip chip={chip} size="md" />
                          <span className="text-xs text-fg-3">{chip.marcacao.origem === 'Registro' ? `NSR ${chip.marcacao.nsr}` : 'ajuste manual'}</span>
                        </motion.li>
                      ))}
                    </ol>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="Resultado do dia" description="Apuração parcial com as marcações até agora" action={<SituacaoBadge dia={d.dia} />} />
                <div className="px-5 pt-4 pb-5">
                  {d.dia.provisorio && (
                    <Alert tone="info" icon={<Info className="size-4" />} className="mb-4">
                      Dia em andamento: o resultado é parcial.
                    </Alert>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-surface-2/70 px-3 py-2.5">
                      <p className="flex items-center gap-1 text-xs text-fg-3">
                        <Timer className="size-3.5" /> Trabalhado
                      </p>
                      <p className="font-mono text-lg font-bold tabular">{formatMinutes(d.dia.trabalhadoMinutos)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/70 px-3 py-2.5">
                      <p className="text-xs text-fg-3">Previsto</p>
                      <p className="font-mono text-lg font-bold tabular">{formatMinutes(d.dia.previstoMinutos)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/70 px-3 py-2.5">
                      <p className="text-xs text-fg-3">Saldo</p>
                      <p className={cn('font-mono text-lg font-bold tabular', signTone(d.dia.saldoMinutos))}>{formatSigned(d.dia.saldoMinutos)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge tone="ok">Extras {formatOrDash(d.dia.extrasMinutos)}</Badge>
                    <Badge tone="danger">Atraso {formatOrDash(d.dia.atrasoMinutos)}</Badge>
                    <Badge tone="night">Noturno {formatOrDash(d.dia.noturnoFictoMinutos)}</Badge>
                    {d.dia.inconsistencias.map((i) => (
                      <Badge key={i} tone="warn">
                        {i}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {d && (
        <AjusteModal open={ajusteAberto} onClose={() => setAjusteAberto(false)} funcionarioId={d.funcionario.id} funcionarioNome={d.funcionario.nome} data={d.diaReferencia} marcacoes={d.dia.marcacoes} />
      )}
    </div>
  )
}
