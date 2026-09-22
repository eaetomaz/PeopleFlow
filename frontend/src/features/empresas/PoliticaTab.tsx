import { useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { FilePlus2, History, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, Badge, Card, CardHeader, Skeleton } from '@/components/ui/Display'
import { Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useToast } from '@/components/ui/toastContext'
import { usePoliticas, usePoliticaVigente } from '@/hooks/data'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { invalidarApuracao, queryClient } from '@/lib/queryClient'
import { formatDate, formatInstant, hojeIso } from '@/lib/format'
import { destinoLabel, modoToleranciaLabel } from '@/lib/labels'
import { cn } from '@/lib/cn'
import type { NovaPolitica, Politica, PoliticaValores } from '@/types/api'
import { avisosPolitica, gruposPolitica, politicaSchema, type PoliticaFormValues } from './politica'

function Resumo({ politica }: { politica: PoliticaValores }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {gruposPolitica.map((grupo, gi) => (
        <motion.section key={grupo.titulo} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }} className="rounded-2xl border border-line bg-surface p-4">
          <h4 className="mb-3 text-sm font-bold text-fg">{grupo.titulo}</h4>
          <dl className="flex flex-col gap-3">
            {grupo.campos.map((c) => (
              <div key={c.campo} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <dt className="text-sm text-fg-2">{c.label}</dt>
                  <p className="text-[0.72rem] leading-snug text-fg-3">{c.dica}</p>
                </div>
                <dd className="shrink-0 text-right font-mono text-sm font-semibold text-fg tabular">{c.formatar(politica)}</dd>
              </div>
            ))}
          </dl>
        </motion.section>
      ))}
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line p-4">
      <legend className="px-1.5 text-sm font-bold text-fg">{titulo}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function Aviso({ texto }: { texto?: string }) {
  if (!texto) return null
  return (
    <span className="flex items-start gap-1 text-warn">
      <TriangleAlert className="mt-px size-3 shrink-0" />
      {texto}
    </span>
  )
}

function NovaVersaoModal({ empresaId, base, open, onClose }: { empresaId: string; base: Politica; open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<PoliticaFormValues>({
    resolver: zodResolver(politicaSchema),
    defaultValues: {
      vigenteDesde: hojeIso(),
      toleranciaPorMarcacaoMinutos: base.toleranciaPorMarcacaoMinutos,
      toleranciaDiariaMinutos: base.toleranciaDiariaMinutos,
      modoTolerancia: base.modoTolerancia,
      destinoHoraExtra: base.destinoHoraExtra,
      destinoHeDescansoFeriado: base.destinoHeDescansoFeriado,
      percentualHeDiaUtil: base.percentualHeDiaUtil,
      percentualHeDescansoFeriado: base.percentualHeDescansoFeriado,
      limiteDiarioHeMinutos: base.limiteDiarioHeMinutos,
      adicionalNoturnoPercentual: base.adicionalNoturnoPercentual,
      inicioNoturno: base.inicioNoturno,
      fimNoturno: base.fimNoturno,
      horaNoturnaReduzida: base.horaNoturnaReduzida,
      prorrogacaoNoturna: base.prorrogacaoNoturna,
      intervaloMinimoAcima6hMinutos: base.intervaloMinimoAcima6hMinutos,
      intervaloMinimo4a6hMinutos: base.intervaloMinimo4a6hMinutos,
      interjornadaMinimaMinutos: base.interjornadaMinimaMinutos,
      validadeBancoMeses: base.validadeBancoMeses,
      janelaDuplicidadeMinutos: base.janelaDuplicidadeMinutos,
      observacao: '',
    },
  })
  const valores = useWatch({ control })
  const avisos = useMemo(() => avisosPolitica(valores), [valores])

  const mutation = useMutation({
    mutationFn: (values: PoliticaFormValues) => http.post<NovaPolitica>(`/api/empresas/${empresaId}/politicas`, { ...values, observacao: values.observacao.trim() || null }),
    onSuccess: async (r) => {
      toast.success(`Versão ${r.politica.versao} criada; ${r.diasRecalculados} ${r.diasRecalculados === 1 ? 'dia recalculado' : 'dias recalculados'}`, `Vale a partir de ${formatDate(r.politica.vigenteDesde)}.`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['politicas', empresaId] }),
        queryClient.invalidateQueries({ queryKey: ['politica-vigente', empresaId] }),
        queryClient.invalidateQueries({ queryKey: ['empresas'] }),
        invalidarApuracao(),
      ])
      onClose()
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      let marcou = false
      for (const [key, message] of Object.entries(campos)) {
        if (key in politicaSchema.shape) {
          setError(key as keyof PoliticaFormValues, { message })
          marcou = true
        }
      }
      setErroGeral(marcou ? null : errorMessage(error))
    },
  })

  const num = (name: keyof PoliticaFormValues, label: string, sufixo: string, hint?: string) => (
    <Input
      type="number"
      label={label}
      trailing={<span className="pr-2 text-xs text-fg-3">{sufixo}</span>}
      className="font-mono"
      error={errors[name]?.message}
      hint={avisos[name] ? <Aviso texto={avisos[name]} /> : hint}
      {...register(name, { valueAsNumber: true })}
    />
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Nova versão da política"
      description={`Parte dos valores da versão ${base.versao}. Os dias a partir da vigência são recalculados automaticamente.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="nova-politica" loading={mutation.isPending} icon={<FilePlus2 className="size-4" />}>
            Criar versão
          </Button>
        </>
      }
    >
      <form id="nova-politica" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input type="date" label="Vigente desde" error={errors.vigenteDesde?.message} hint="Precisa ser depois do início da versão atual. Pode retroagir até 400 dias." {...register('vigenteDesde')} />
          <Input label="Observação" placeholder="Ex.: acordo coletivo 2026/2027" error={errors.observacao?.message} {...register('observacao')} />
        </div>
        <Grupo titulo="Tolerância">
          {num('toleranciaPorMarcacaoMinutos', 'Por marcação', 'min', 'CLT: até 5 min.')}
          {num('toleranciaDiariaMinutos', 'Limite diário', 'min', 'CLT: até 10 min.')}
          <Select
            label="Quando passa do limite"
            options={Object.entries(modoToleranciaLabel).map(([value, label]) => ({ value, label }))}
            error={errors.modoTolerancia?.message}
            hint={avisos.modoTolerancia ? <Aviso texto={avisos.modoTolerancia} /> : 'Integral: todo o tempo passa a contar.'}
            {...register('modoTolerancia')}
          />
          {num('janelaDuplicidadeMinutos', 'Janela de duplicidade', 'min', 'Registros repetidos nesse intervalo são ignorados.')}
        </Grupo>
        <Grupo titulo="Horas extras">
          {num('percentualHeDiaUtil', 'Adicional em dia útil', '%', 'Mínimo de 50%.')}
          {num('percentualHeDescansoFeriado', 'Adicional em descanso ou feriado', '%', 'Normalmente 100%.')}
          {num('limiteDiarioHeMinutos', 'Limite diário', 'min', 'CLT: até 120 min.')}
          <div />
          <Select label="Destino em dia útil" options={Object.entries(destinoLabel).map(([value, label]) => ({ value, label }))} {...register('destinoHoraExtra')} />
          <Select label="Destino em descanso ou feriado" options={Object.entries(destinoLabel).map(([value, label]) => ({ value, label }))} {...register('destinoHeDescansoFeriado')} />
        </Grupo>
        <Grupo titulo="Adicional noturno">
          {num('adicionalNoturnoPercentual', 'Adicional', '%', 'Mínimo de 20%.')}
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" label="Início" error={errors.inicioNoturno?.message} {...register('inicioNoturno')} />
            <Input type="time" label="Fim" error={errors.fimNoturno?.message} {...register('fimNoturno')} />
          </div>
          <Controller
            control={control}
            name="horaNoturnaReduzida"
            render={({ field }) => (
              <div>
                <Switch checked={field.value} onChange={field.onChange} label="Hora noturna reduzida" description="52 min 30 s valem 1 hora (CLT art. 73, § 1º)." />
                <p className="mt-1 text-xs">
                  <Aviso texto={avisos.horaNoturnaReduzida} />
                </p>
              </div>
            )}
          />
          <Controller
            control={control}
            name="prorrogacaoNoturna"
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Prorrogação após o fim" description="Horas depois das 5h seguem noturnas (Súmula 60, II)." />}
          />
        </Grupo>
        <Grupo titulo="Intervalos">
          {num('intervaloMinimoAcima6hMinutos', 'Mínimo acima de 6h', 'min', 'CLT: 60 min.')}
          {num('intervaloMinimo4a6hMinutos', 'Mínimo entre 4h e 6h', 'min', 'CLT: 15 min.')}
          {num('interjornadaMinimaMinutos', 'Interjornada mínima', 'min', 'CLT: 660 min (11 horas).')}
        </Grupo>
        <Grupo titulo="Banco de horas">{num('validadeBancoMeses', 'Validade dos créditos', 'meses', 'Acordo individual: até 6 meses.')}</Grupo>
        {erroGeral && <Alert tone="danger">{erroGeral}</Alert>}
      </form>
    </Modal>
  )
}

export function PoliticaTab({ empresaId, podeEditar }: { empresaId: string; podeEditar: boolean }) {
  const vigente = usePoliticaVigente(empresaId)
  const historico = usePoliticas(empresaId)
  const [nova, setNova] = useState(false)
  const [vendo, setVendo] = useState<Politica | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand-500" />
              Política vigente {vigente.data && <Badge tone="brand">Versão {vigente.data.versao}</Badge>}
            </span>
          }
          description={vigente.data ? `Desde ${formatDate(vigente.data.vigenteDesde)}${vigente.data.observacao ? ` · ${vigente.data.observacao}` : ''}` : 'Regras usadas na apuração dos dias'}
          action={
            podeEditar &&
            vigente.data && (
              <Button icon={<FilePlus2 className="size-4" />} onClick={() => setNova(true)}>
                Nova versão
              </Button>
            )
          }
        />
        <div className="p-5">
          {vigente.isLoading ? <Skeleton className="h-72" /> : vigente.isError || !vigente.data ? <ErrorState compact description={errorMessage(vigente.error)} onRetry={() => vigente.refetch()} /> : <Resumo politica={vigente.data} />}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <History className="size-5 text-fg-3" />
              Histórico de versões
            </span>
          }
          description="Cada dia é apurado com a versão vigente naquela data"
        />
        <div className="p-3">
          {historico.isLoading ? (
            <Skeleton className="h-32" />
          ) : historico.isError ? (
            <ErrorState compact description={errorMessage(historico.error)} onRetry={() => historico.refetch()} />
          ) : (historico.data ?? []).length === 0 ? (
            <EmptyState compact title="Sem versões" />
          ) : (
            <ul className="flex flex-col">
              {(historico.data ?? []).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setVendo(p)} className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2">
                    <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl font-display font-extrabold', p.vigente ? 'bg-brand-500 text-white' : 'bg-surface-3 text-fg-2')}>v{p.versao}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                        Vigente desde {formatDate(p.vigenteDesde)} {p.vigente && <Badge tone="ok">vigente</Badge>}
                      </span>
                      <span className="block truncate text-xs text-fg-3">
                        Criada por {p.criadoPor ?? '—'} em {formatInstant(p.criadoEm)}
                        {p.observacao ? ` · ${p.observacao}` : ''}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-300">Ver valores</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {vigente.data && nova && <NovaVersaoModal empresaId={empresaId} base={vigente.data} open={nova} onClose={() => setNova(false)} />}
      <Modal open={!!vendo} onClose={() => setVendo(null)} size="xl" title={vendo ? `Política versão ${vendo.versao}` : ''} description={vendo ? `Vigente desde ${formatDate(vendo.vigenteDesde)} · criada por ${vendo.criadoPor ?? '—'}` : undefined}>
        {vendo && (
          <>
            {vendo.observacao && <Alert tone="neutral" className="mb-4">{vendo.observacao}</Alert>}
            <Resumo politica={vendo} />
          </>
        )}
      </Modal>
    </div>
  )
}
