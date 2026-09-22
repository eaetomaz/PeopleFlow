import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, CalendarRange, CircleHelp, Copy, Minus, Moon, Plus, Repeat, Save, Sun, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Alert, Badge, Card, CardHeader, Skeleton, Tooltip } from '@/components/ui/Display'
import { Input } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Navigation'
import { Switch } from '@/components/ui/Switch'
import { ErrorState } from '@/components/ui/States'
import { useToast } from '@/components/ui/toastContext'
import { CompetenciaNav } from '@/components/ponto/CompetenciaNav'
import { useJornada, usePrevisao } from '@/hooks/data'
import { usePermissoes } from '@/lib/authContext'
import { useEmpresa } from '@/lib/empresaContext'
import { ApiError, errorMessage, http } from '@/lib/api'
import { invalidarApuracao, queryClient } from '@/lib/queryClient'
import { duracaoPeriodo, formatMinutes } from '@/lib/duracao'
import { competenciaAtual, competenciaIntervalo, diasDaSemana, hojeIso, hora, weekdayIndex } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Jornada, Periodo, PrevisaoDia, SalvarJornada, TipoJornada } from '@/types/api'

interface DiaEdit {
  folga: boolean
  periodos: Periodo[]
}

const semanaPadrao = (): DiaEdit[] =>
  Array.from({ length: 7 }, (_, i) =>
    i === 0 || i === 6
      ? { folga: true, periodos: [] }
      : {
          folga: false,
          periodos: [
            { entrada: '08:00', saida: '12:00' },
            { entrada: '13:00', saida: '17:00' },
          ],
        },
  )

const preset12x36Noturno = (): DiaEdit[] => [
  {
    folga: false,
    periodos: [
      { entrada: '19:00', saida: '01:00' },
      { entrada: '02:00', saida: '07:00' },
    ],
  },
  { folga: true, periodos: [] },
]

const preset12x36Diurno = (): DiaEdit[] => [{ folga: false, periodos: [{ entrada: '07:00', saida: '19:00' }] }, { folga: true, periodos: [] }]

const cargaDia = (d: DiaEdit) => (d.folga ? 0 : d.periodos.reduce((a, p) => a + duracaoPeriodo(p.entrada, p.saida), 0))

function DiaEditor({ titulo, dia, onChange, readOnly, destaque }: { titulo: string; dia: DiaEdit; onChange: (dia: DiaEdit) => void; readOnly: boolean; destaque?: boolean }) {
  const carga = cargaDia(dia)
  const atualizar = (i: number, campo: keyof Periodo, valor: string) => onChange({ ...dia, periodos: dia.periodos.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)) })
  const ultimo = dia.periodos[dia.periodos.length - 1]
  return (
    <motion.div layout className={cn('flex flex-col gap-3 rounded-2xl border px-4 py-3 md:flex-row md:items-start', dia.folga ? 'border-line bg-surface-2/50' : 'border-line bg-surface', destaque && 'ring-1 ring-brand-500/20')}>
      <div className="flex w-full shrink-0 items-center justify-between gap-3 md:w-44 md:flex-col md:items-start">
        <span className="text-sm font-bold text-fg">{titulo}</span>
        <label className="flex items-center gap-2 text-xs text-fg-2">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-brand-500)]"
            checked={dia.folga}
            disabled={readOnly}
            onChange={(e) => onChange({ folga: e.target.checked, periodos: e.target.checked ? [] : dia.periodos.length ? dia.periodos : [{ entrada: '08:00', saida: '12:00' }] })}
          />
          Folga
        </label>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {dia.folga ? (
          <span className="text-sm text-fg-3">Sem horário previsto (descanso)</span>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {dia.periodos.map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-1 rounded-xl border border-line-2 bg-surface px-1.5 py-1">
                  <input type="time" aria-label={`${titulo}: entrada ${i + 1}`} value={p.entrada} disabled={readOnly} onChange={(e) => atualizar(i, 'entrada', e.target.value)} className="field-input field-sm w-[6.4rem] font-mono" />
                  <span className="text-fg-3">–</span>
                  <input type="time" aria-label={`${titulo}: saída ${i + 1}`} value={p.saida} disabled={readOnly} onChange={(e) => atualizar(i, 'saida', e.target.value)} className="field-input field-sm w-[6.4rem] font-mono" />
                  {!readOnly && dia.periodos.length > 1 && (
                    <button type="button" aria-label={`Remover período ${i + 1}`} onClick={() => onChange({ ...dia, periodos: dia.periodos.filter((_, j) => j !== i) })} className="grid size-7 place-items-center rounded-lg text-fg-3 hover:bg-danger/10 hover:text-danger">
                      <Minus className="size-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {!readOnly && dia.periodos.length < 4 && (
              <button
                type="button"
                onClick={() => onChange({ ...dia, periodos: [...dia.periodos, { entrada: ultimo?.saida ?? '08:00', saida: ultimo?.saida ?? '12:00' }] })}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-dashed border-line-2 px-2.5 text-xs font-semibold text-fg-2 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300"
              >
                <Plus className="size-3.5" /> Período
              </button>
            )}
          </>
        )}
      </div>
      <span className={cn('shrink-0 self-center font-mono text-sm font-bold tabular', carga ? 'text-fg' : 'text-fg-3')}>{formatMinutes(carga)}</span>
    </motion.div>
  )
}

function Previsao({ jornada }: { jornada: Jornada }) {
  const [competencia, setCompetencia] = useState(competenciaAtual())
  const [referencia, setReferencia] = useState(hojeIso())
  const { de, ate } = competenciaIntervalo(competencia)
  const previsao = usePrevisao(jornada.id, de, ate, jornada.tipo === 'Ciclica' ? referencia : undefined)
  const dias = previsao.data ?? []
  const inicio = weekdayIndex(de)
  const total = dias.reduce((a, d) => a + d.cargaMinutos, 0)

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <CalendarRange className="size-5 text-brand-500" />
            Prévia do mês
          </span>
        }
        description={`Como a jornada salva se distribui no calendário · ${formatMinutes(total)} no mês`}
      />
      <div className="flex flex-wrap items-end gap-3 px-5 pt-4">
        <CompetenciaNav value={competencia} onChange={setCompetencia} allowFuture />
        {jornada.tipo === 'Ciclica' && <Input type="date" label="Referência do ciclo (dia 1)" value={referencia} onChange={(e) => setReferencia(e.target.value)} wrapperClassName="w-52" />}
      </div>
      <div className="p-5">
        {previsao.isError ? (
          <ErrorState compact description={errorMessage(previsao.error)} onRetry={() => previsao.refetch()} />
        ) : !previsao.data ? (
          <Skeleton className="h-72" />
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
              <span key={d} className="pb-1 text-center text-[0.68rem] font-bold tracking-wide text-fg-3 uppercase">
                {d}
              </span>
            ))}
            {Array.from({ length: inicio }, (_, i) => (
              <span key={`v-${i}`} />
            ))}
            {dias.map((d: PrevisaoDia) => (
              <div key={d.data} className={cn('min-h-20 rounded-xl border p-2 text-[0.7rem]', d.folga ? 'border-line bg-surface-2/50 text-fg-3' : 'border-brand-500/20 bg-brand-500/5')}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fg">{Number(d.data.slice(8, 10))}</span>
                  {!d.folga && <span className="font-mono font-semibold text-brand-600 tabular dark:text-brand-300">{formatMinutes(d.cargaMinutos)}</span>}
                </div>
                {d.folga ? (
                  <p className="mt-1">Folga</p>
                ) : (
                  <ul className="mt-1 space-y-0.5 font-mono text-fg-2 tabular">
                    {d.periodos.map((p, i) => (
                      <li key={i}>
                        {hora(p.inicio)}–{hora(p.fim)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function diasIniciais(j: Jornada | undefined, tipo: TipoJornada): DiaEdit[] {
  if (!j || j.tipo !== tipo) return tipo === 'Semanal' ? semanaPadrao() : preset12x36Diurno()
  const dias = [...j.dias].sort((a, b) => a.indice - b.indice).map((d) => ({ folga: d.folga, periodos: d.periodos.map((p) => ({ ...p })) }))
  if (tipo === 'Semanal') return Array.from({ length: 7 }, (_, i) => dias[i] ?? { folga: true, periodos: [] })
  return dias.length ? dias : preset12x36Diurno()
}

export default function JornadaEditorPage() {
  const { id } = useParams()
  const existente = useJornada(id)
  if (id && existente.isError)
    return (
      <Card>
        <ErrorState description={errorMessage(existente.error)} onRetry={() => existente.refetch()} />
      </Card>
    )
  if (id && !existente.data) return <Skeleton className="h-[520px] rounded-2xl" />
  return <Editor key={existente.data?.id ?? 'nova'} id={id} inicial={existente.data} />
}

function Editor({ id, inicial }: { id?: string; inicial?: Jornada }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { cadastros } = usePermissoes()
  const { empresaId, empresas } = useEmpresa()
  const readOnly = !cadastros

  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [tipo, setTipo] = useState<TipoJornada>(inicial?.tipo ?? 'Semanal')
  const [horaVirada, setHoraVirada] = useState(inicial?.horaVirada ?? '04:00')
  const [feriadosCompensados, setFeriadosCompensados] = useState(inicial?.feriadosCompensados ?? false)
  const [ativa, setAtiva] = useState(inicial?.ativa ?? true)
  const [semana, setSemana] = useState<DiaEdit[]>(() => diasIniciais(inicial, 'Semanal'))
  const [ciclo, setCiclo] = useState<DiaEdit[]>(() => diasIniciais(inicial, 'Ciclica'))
  const [erros, setErros] = useState<{ nome?: string; horaVirada?: string; dias: string[]; geral?: string }>({ dias: [] })

  const dias = tipo === 'Semanal' ? semana : ciclo
  const setDias = tipo === 'Semanal' ? setSemana : setCiclo
  const total = useMemo(() => dias.reduce((a, d) => a + cargaDia(d), 0), [dias])
  const empresaDaJornada = inicial?.empresaId ?? empresaId
  const empresa = empresas.find((e) => e.id === empresaDaJornada)

  const salvar = useMutation({
    mutationFn: () => {
      const body: SalvarJornada = {
        empresaId: empresaDaJornada ?? '',
        nome: nome.trim(),
        tipo,
        horaVirada,
        feriadosCompensados,
        ativa,
        dias: dias.map((d, indice) => ({ indice, folga: d.folga || d.periodos.length === 0, periodos: d.folga ? [] : d.periodos })),
      }
      return id ? http.put<Jornada>(`/api/jornadas/${id}`, body) : http.post<Jornada>('/api/jornadas', body)
    },
    onSuccess: async (j) => {
      toast.success(id ? 'Jornada atualizada' : 'Jornada criada', id ? 'Os dias dos funcionários vinculados foram recalculados.' : `${j.nome} já pode ser vinculada aos funcionários.`)
      setErros({ dias: [] })
      queryClient.setQueryData(['jornada', j.id], j)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['jornadas'] }), queryClient.invalidateQueries({ queryKey: ['previsao'] }), invalidarApuracao()])
      if (!id) navigate(`/jornadas/${j.id}`, { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.errors) {
        const lista = Object.entries(error.errors)
          .filter(([k]) => k.startsWith('dias'))
          .flatMap(([, v]) => v)
        setErros({ nome: error.fieldError('nome'), horaVirada: error.fieldError('horaVirada'), dias: lista, geral: error.fieldError('empresaId') ?? error.fieldError('body') })
      } else setErros({ dias: [], geral: errorMessage(error) })
      toast.error('Não foi possível salvar a jornada', errorMessage(error))
    },
  })

  const copiarSegunda = () => setSemana((s) => s.map((d, i) => (i >= 1 && i <= 5 ? { folga: s[1].folga, periodos: s[1].periodos.map((p) => ({ ...p })) } : d)))

  return (
    <div>
      <PageHeader
        title={id ? nome || 'Jornada' : 'Nova jornada'}
        description={`${empresa?.nomeFantasia ?? 'Empresa'} · ${tipo === 'Semanal' ? 'carga semanal' : `ciclo de ${dias.length} dias`} de ${formatMinutes(total)}`}
        crumbs={[{ label: 'Jornadas', to: '/jornadas' }, { label: id ? nome || 'Jornada' : 'Nova' }]}
        icon={<CalendarClock className="size-6" />}
        actions={
          !readOnly && (
            <Button onClick={() => salvar.mutate()} loading={salvar.isPending} icon={<Save className="size-4" />}>
              Salvar jornada
            </Button>
          )
        }
      />

      {readOnly && (
        <Alert tone="neutral" className="mb-5">
          Você está vendo a jornada em modo leitura. Só RH e administradores alteram jornadas.
        </Alert>
      )}
      {inicial && inicial.funcionariosVinculados > 0 && !readOnly && (
        <Alert tone="info" className="mb-5">
          {inicial.funcionariosVinculados} {inicial.funcionariosVinculados === 1 ? 'funcionário usa' : 'funcionários usam'} esta jornada hoje. Ao salvar, os dias deles são recalculados.
        </Alert>
      )}

      <div className="flex flex-col gap-6">
        <Card className="p-5">
          <fieldset disabled={readOnly} className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} error={erros.nome} placeholder="Ex.: Administrativo 44h" wrapperClassName="xl:col-span-2" />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-fg">Tipo</span>
              <Segmented
                full
                ariaLabel="Tipo de jornada"
                value={tipo}
                onChange={(v) => !readOnly && setTipo(v)}
                options={[
                  { value: 'Semanal', label: 'Semanal', icon: <CalendarClock className="size-4" /> },
                  { value: 'Ciclica', label: 'Cíclica', icon: <Repeat className="size-4" /> },
                ]}
              />
            </div>
            <Input
              type="time"
              label="Hora de virada"
              value={horaVirada}
              onChange={(e) => setHoraVirada(e.target.value)}
              error={erros.horaVirada}
              aside={
                <Tooltip label="Marcações antes deste horário contam para o dia anterior; use 12:00 para jornadas noturnas." side="bottom">
                  <CircleHelp className="size-4 text-fg-3" tabIndex={0} aria-label="Ajuda sobre hora de virada" />
                </Tooltip>
              }
              className="font-mono"
            />
            <Switch
              className="md:col-span-2"
              checked={feriadosCompensados}
              onChange={setFeriadosCompensados}
              disabled={readOnly}
              label="Feriados compensados pela escala"
              description="Em escalas 12x36 o feriado trabalhado já é compensado (CLT art. 59-A, parágrafo único) e vira dia normal."
            />
            <Switch className="md:col-span-2" checked={ativa} onChange={setAtiva} disabled={readOnly} label="Jornada ativa" description="Jornadas inativas não podem ser vinculadas a novos funcionários." />
          </fieldset>
        </Card>

        <Card>
          <CardHeader
            title={tipo === 'Semanal' ? 'Horários da semana' : 'Dias do ciclo'}
            description={tipo === 'Semanal' ? `Total semanal: ${formatMinutes(total)}` : `Ciclo de ${dias.length} ${dias.length === 1 ? 'dia' : 'dias'} · ${formatMinutes(total)} no ciclo`}
            action={
              !readOnly && (
                <div className="flex flex-wrap justify-end gap-2">
                  {tipo === 'Semanal' ? (
                    <Button size="sm" variant="secondary" icon={<Copy className="size-4" />} onClick={copiarSegunda}>
                      Copiar segunda para dias úteis
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" icon={<Moon className="size-4" />} onClick={() => setCiclo(preset12x36Noturno())}>
                        12x36 noturno (19:00–01:00 / 02:00–07:00)
                      </Button>
                      <Button size="sm" variant="secondary" icon={<Sun className="size-4" />} onClick={() => setCiclo(preset12x36Diurno())}>
                        12x36 diurno (07:00–19:00)
                      </Button>
                    </>
                  )}
                </div>
              )
            }
          />
          <div className="flex flex-col gap-2 p-5">
            {dias.map((dia, i) => (
              <div key={`${tipo}-${i}`} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DiaEditor titulo={tipo === 'Semanal' ? diasDaSemana[i] : `Dia ${i + 1}`} dia={dia} readOnly={readOnly} destaque={tipo === 'Semanal' && i === 1} onChange={(novo) => setDias((atual) => atual.map((d, j) => (j === i ? novo : d)))} />
                </div>
                {tipo === 'Ciclica' && !readOnly && dias.length > 1 && (
                  <Button variant="ghost" size="icon-sm" aria-label={`Remover dia ${i + 1}`} onClick={() => setCiclo((c) => c.filter((_, j) => j !== i))} className="hover:text-danger">
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {tipo === 'Ciclica' && !readOnly && dias.length < 28 && (
              <button
                type="button"
                onClick={() => setCiclo((c) => [...c, { folga: true, periodos: [] }])}
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-line-2 text-sm font-semibold text-fg-2 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300"
              >
                <Plus className="size-4" /> Adicionar dia ao ciclo
              </button>
            )}
            {tipo === 'Ciclica' && (
              <p className="text-xs text-fg-3">
                O dia 1 do ciclo é a data de referência informada no vínculo de cada funcionário. <Badge tone="night">{dias.filter((d) => !d.folga).length} de trabalho</Badge>
              </p>
            )}
            {(erros.dias.length > 0 || erros.geral) && (
              <Alert tone="danger" title="Revise a jornada">
                <ul className="mt-1 list-disc pl-5">
                  {erros.geral && <li>{erros.geral}</li>}
                  {erros.dias.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        </Card>

        {inicial && <Previsao jornada={inicial} />}
      </div>
    </div>
  )
}
