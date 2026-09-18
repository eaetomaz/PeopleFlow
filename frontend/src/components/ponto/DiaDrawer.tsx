import { useState, type ReactNode } from 'react'
import { BookOpenCheck, CirclePlus, Eraser, Scale, X } from 'lucide-react'
import { Drawer } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Alert, Badge, Skeleton } from '@/components/ui/Display'
import { ErrorState } from '@/components/ui/States'
import { useDetalheDia } from '@/hooks/data'
import { formatMinutes, formatOrDash, formatSigned, signTone } from '@/lib/duracao'
import { formatDateLong, formatInstant, hora, inicial } from '@/lib/format'
import { marcacoesEfetivas } from '@/lib/marcacoes'
import { statusAjusteLabel, statusAjusteTone, tipoAjusteLabel } from '@/lib/labels'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { Marcacao, TipoAjuste } from '@/types/api'
import { AjusteModal } from './AjusteModal'
import { SituacaoBadge } from './SituacaoBadge'
import { TimelineDia } from './TimelineDia'

function Numero({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/60 px-3 py-2">
      <p className="text-[0.68rem] font-semibold tracking-wide text-fg-3 uppercase">{label}</p>
      <p className={cn('font-mono text-[0.95rem] font-bold tabular text-fg', className)}>{value}</p>
    </div>
  )
}

function MarcacaoLinha({ m }: { m: Marcacao }) {
  const ajuste = m.origem === 'AjusteManual'
  return (
    <li className="flex gap-3 rounded-xl border border-line px-3 py-2.5">
      <span className={cn('font-mono text-base font-bold tabular', m.desconsiderada ? 'text-fg-3 line-through' : 'text-fg')}>{hora(m.dataHora)}</span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {ajuste ? (
            <>
              <Badge tone="brand">{m.tipoAjuste ? tipoAjusteLabel[m.tipoAjuste] : 'Ajuste'}</Badge>
              {m.status && <Badge tone={statusAjusteTone[m.status]}>{statusAjusteLabel[m.status]}</Badge>}
            </>
          ) : (
            <Badge>Registro · NSR {m.nsr}</Badge>
          )}
          {m.desconsiderada && <Badge tone="danger">Desconsiderada</Badge>}
        </div>
        {ajuste && (
          <div className="mt-1.5 space-y-0.5 text-xs text-fg-2">
            {m.justificativa && <p className="text-fg">“{m.justificativa}”</p>}
            <p>
              Solicitado por {m.solicitadoPor ?? '—'} em {formatInstant(m.solicitadoEm)}
            </p>
            {m.decididoEm && (
              <p>
                Decidido por {m.decididoPor ?? '—'} em {formatInstant(m.decididoEm)}
                {m.motivoDecisao ? ` · motivo: ${m.motivoDecisao}` : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

interface DiaDrawerProps {
  funcionarioId?: string
  funcionarioNome?: string
  data: string | null
  onClose: () => void
  podeAjustar: boolean
}

export function DiaDrawer({ funcionarioId, funcionarioNome, data, onClose, podeAjustar }: DiaDrawerProps) {
  const { data: detalhe, isLoading, isError, error, refetch } = useDetalheDia(funcionarioId, data ?? undefined)
  const [ajuste, setAjuste] = useState<TipoAjuste | null>(null)
  const dia = detalhe?.dia

  return (
    <>
      <Drawer open={!!data} onClose={onClose} width="min(720px,94vw)" label="Detalhe do dia">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-fg-3 uppercase">{funcionarioNome ?? 'Detalhe do dia'}</p>
              <h2 className="mt-0.5 text-xl font-extrabold">{data ? inicial(formatDateLong(data)) : ''}</h2>
              {dia && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <SituacaoBadge dia={dia} />
                  {dia.inconsistencias.map((i) => (
                    <Badge key={i} tone="warn">
                      {i}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-xl text-fg-3 transition hover:rotate-90 hover:bg-surface-2 hover:text-fg">
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-40" />
                <Skeleton className="h-32" />
              </div>
            ) : isError || !detalhe || !dia ? (
              <ErrorState compact description={errorMessage(error)} onRetry={() => refetch()} />
            ) : (
              <div className="flex flex-col gap-6">
                {dia.provisorio && (
                  <Alert tone={dia.hoje ? 'info' : 'warn'} title={dia.hoje ? 'Dia em andamento' : 'Resultado provisório'}>
                    {dia.hoje ? 'O resultado é parcial e nada vai para o banco de horas até o dia terminar.' : 'Há pendências neste dia. Nada vai para o banco de horas até elas serem resolvidas.'}
                  </Alert>
                )}

                <section>
                  <h3 className="mb-3 text-sm font-bold">Linha do tempo</h3>
                  <div className="rounded-2xl border border-line p-4">
                    <TimelineDia data={dia.data} previsto={dia.previsto} segmentos={detalhe.segmentos} marcacoes={marcacoesEfetivas(dia.marcacoes)} />
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Numero label="Previsto" value={formatMinutes(dia.previstoMinutos)} />
                  <Numero label="Trabalhado" value={formatMinutes(dia.trabalhadoMinutos)} />
                  <Numero label={`Extras${dia.extrasMinutos ? ` (${dia.extrasPercentual}%)` : ''}`} value={formatOrDash(dia.extrasMinutos)} className={dia.extrasMinutos ? 'text-ok' : undefined} />
                  <Numero label="Saldo" value={formatSigned(dia.saldoMinutos)} className={signTone(dia.saldoMinutos)} />
                  <Numero label="Atraso" value={formatOrDash(dia.atrasoMinutos)} className={dia.atrasoMinutos ? 'text-danger' : undefined} />
                  <Numero label="Saída antecipada" value={formatOrDash(dia.saidaAntecipadaMinutos)} className={dia.saidaAntecipadaMinutos ? 'text-danger' : undefined} />
                  <Numero label="Ausência parcial" value={formatOrDash(dia.ausenciaParcialMinutos)} />
                  <Numero label="Falta" value={formatOrDash(dia.faltaMinutos)} />
                  <Numero label="Noturno real" value={formatOrDash(dia.noturnoRealMinutos)} />
                  <Numero label="Noturno ficto" value={formatOrDash(dia.noturnoFictoMinutos)} />
                  <Numero label="Intervalo" value={formatOrDash(dia.intervaloRealMinutos)} />
                  <Numero label="Intervalo suprimido" value={formatOrDash(dia.intervaloSuprimidoMinutos)} />
                  <Numero label="Tolerância" value={formatOrDash(dia.toleranciaDesconsideradaMinutos)} />
                  <Numero label="Crédito banco" value={formatOrDash(dia.creditoBancoMinutos)} />
                  <Numero label="Débito banco" value={formatOrDash(dia.debitoBancoMinutos)} />
                  <Numero label="Extras a pagar" value={formatOrDash(dia.extrasAPagarMinutos)} />
                </section>

                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Scale className="size-4 text-brand-500" />
                    Regras aplicadas
                  </h3>
                  {detalhe.regras.length === 0 ? (
                    <p className="text-sm text-fg-3">{dia.calculado ? 'Nenhuma regra especial neste dia.' : 'Este dia ainda não foi apurado.'}</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {detalhe.regras.map((regra, i) => (
                        <li key={`${regra.codigo}-${i}`} className="flex gap-3 rounded-xl bg-surface-2/70 px-3 py-2.5">
                          <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-brand-500" />
                          <div className="text-sm">
                            <p className="text-fg">{regra.texto}</p>
                            {regra.base && <p className="mt-0.5 text-xs text-fg-3">{regra.base}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Marcações</h3>
                    {podeAjustar && funcionarioId && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" icon={<CirclePlus className="size-4" />} onClick={() => setAjuste('Inclusao')}>
                          Incluir marcação
                        </Button>
                        <Button size="sm" variant="secondary" icon={<Eraser className="size-4" />} onClick={() => setAjuste('Desconsideracao')}>
                          Desconsiderar
                        </Button>
                      </div>
                    )}
                  </div>
                  {dia.marcacoes.length === 0 ? (
                    <p className="text-sm text-fg-3">Nenhuma marcação neste dia.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {dia.marcacoes.map((m) => (
                        <MarcacaoLinha key={m.id} m={m} />
                      ))}
                    </ul>
                  )}
                </section>

                <section className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-2xl border border-line px-4 py-3 text-sm">
                  <div>
                    <p className="text-xs text-fg-3">Jornada</p>
                    <p className="font-semibold">{detalhe.jornada ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-fg-3">Versão da política</p>
                    <p className="font-semibold">{detalhe.politicaVersao ? `v${detalhe.politicaVersao}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-fg-3">Versão do motor</p>
                    <p className="font-semibold">v{detalhe.versaoMotor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-fg-3">Calculado em</p>
                    <p className="font-semibold">{formatInstant(detalhe.calculadoEm)}</p>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </Drawer>
      {funcionarioId && data && dia && (
        <AjusteModal
          open={ajuste !== null}
          onClose={() => setAjuste(null)}
          funcionarioId={funcionarioId}
          funcionarioNome={funcionarioNome}
          data={data}
          marcacoes={dia.marcacoes}
          tipoInicial={ajuste ?? 'Inclusao'}
        />
      )}
    </>
  )
}
