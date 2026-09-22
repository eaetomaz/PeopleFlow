import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { CalendarClock, CalendarPlus, CalendarX2, KeyRound, PiggyBank, Save, ScrollText, UserRound, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/Button'
import { Alert, Avatar, Badge, Card, CardHeader, Skeleton } from '@/components/ui/Display'
import { Input, Select } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useToast } from '@/components/ui/toastContext'
import { useFuncionario, useFuncionarios } from '@/hooks/data'
import { usePermissoes } from '@/lib/authContext'
import { useEmpresa } from '@/lib/empresaContext'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { invalidarApuracao, queryClient } from '@/lib/queryClient'
import { formatDate } from '@/lib/format'
import { maskCpf, maskPis } from '@/lib/masks'
import { cn } from '@/lib/cn'
import type { FuncionarioDetalhe, Vinculo } from '@/types/api'
import { funcionarioSchema, paraRequestFuncionario, type FuncionarioFormValues } from './funcionarioSchema'
import { EncerrarVinculoModal, NovoVinculoModal } from './VinculoModals'

function valoresIniciais(f?: FuncionarioDetalhe): FuncionarioFormValues {
  return {
    matricula: f?.matricula ?? '',
    nome: f?.nome ?? '',
    cpf: f ? maskCpf(f.cpf) : '',
    pis: f?.pis ? maskPis(f.pis) : '',
    cargo: f?.cargo ?? '',
    departamento: f?.departamento ?? '',
    centroCusto: f?.centroCusto ?? '',
    email: f?.email ?? '',
    dataAdmissao: f?.dataAdmissao ?? '',
    dataDemissao: f?.dataDemissao ?? '',
    gestorId: f?.gestorId ?? '',
    ativo: f?.ativo ?? true,
  }
}

function Formulario({ funcionario, empresaId, readOnly }: { funcionario?: FuncionarioDetalhe; empresaId: string; readOnly: boolean }) {
  const toast = useToast()
  const navigate = useNavigate()
  const colegas = useFuncionarios({ empresaId, ativo: true })
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<FuncionarioFormValues>({ resolver: zodResolver(funcionarioSchema), defaultValues: valoresIniciais(funcionario) })

  useEffect(() => {
    reset(valoresIniciais(funcionario))
  }, [funcionario, reset])

  const gestores = useMemo(() => {
    const lista = (colegas.data ?? []).filter((c) => c.id !== funcionario?.id).map((c) => ({ id: c.id, nome: c.nome, cargo: c.cargo }))
    if (funcionario?.gestorId && !lista.some((c) => c.id === funcionario.gestorId)) lista.unshift({ id: funcionario.gestorId, nome: funcionario.gestor ?? 'Gestor atual', cargo: 'atual' })
    return lista
  }, [colegas.data, funcionario])

  const salvar = useMutation({
    mutationFn: (v: FuncionarioFormValues) => {
      const body = paraRequestFuncionario(empresaId, v)
      return funcionario ? http.put<FuncionarioDetalhe>(`/api/funcionarios/${funcionario.id}`, body) : http.post<FuncionarioDetalhe>('/api/funcionarios', body)
    },
    onSuccess: async (f) => {
      setErroGeral(null)
      queryClient.setQueryData(['funcionario', f.id], f)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['funcionarios'] }), invalidarApuracao()])
      if (funcionario) toast.success('Cadastro salvo', f.nome)
      else {
        toast.success('Funcionário cadastrado', 'Agora vincule uma jornada para começar a apurar o ponto.')
        navigate(`/funcionarios/${f.id}`, { replace: true })
      }
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      let marcou = false
      for (const [key, message] of Object.entries(campos)) {
        if (key in funcionarioSchema.shape) {
          setError(key as keyof FuncionarioFormValues, { message })
          marcou = true
        }
      }
      setErroGeral(marcou ? null : errorMessage(error))
    },
  })

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit((v) => salvar.mutate(v))} noValidate>
        <fieldset disabled={readOnly} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input label="Matrícula" className="font-mono" error={errors.matricula?.message} {...register('matricula')} />
          <Input label="Nome completo" wrapperClassName="xl:col-span-2" error={errors.nome?.message} {...register('nome')} />
          <Controller
            control={control}
            name="cpf"
            render={({ field }) => <Input label="CPF" inputMode="numeric" className="font-mono" placeholder="000.000.000-00" value={field.value} onBlur={field.onBlur} onChange={(e) => field.onChange(maskCpf(e.target.value))} error={errors.cpf?.message} />}
          />
          <Controller
            control={control}
            name="pis"
            render={({ field }) => <Input label="PIS" inputMode="numeric" className="font-mono" placeholder="000.00000.00-0" value={field.value} onBlur={field.onBlur} onChange={(e) => field.onChange(maskPis(e.target.value))} error={errors.pis?.message} hint="Opcional" />}
          />
          <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Cargo" error={errors.cargo?.message} {...register('cargo')} />
          <Input label="Departamento" error={errors.departamento?.message} {...register('departamento')} />
          <Input label="Centro de custo" error={errors.centroCusto?.message} {...register('centroCusto')} />
          <Input type="date" label="Admissão" error={errors.dataAdmissao?.message} {...register('dataAdmissao')} />
          <Input type="date" label="Demissão" error={errors.dataDemissao?.message} hint="Ao informar, o funcionário fica inativo." {...register('dataDemissao')} />
          <Controller
            control={control}
            name="gestorId"
            render={({ field }) => (
              <Select
                label="Gestor"
                error={errors.gestorId?.message}
                options={[{ value: '', label: 'Sem gestor' }, ...gestores.map((g) => ({ value: g.id, label: `${g.nome} · ${g.cargo}` }))]}
                hint="O gestor vê a equipe e aprova os ajustes."
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
              />
            )}
          />
          {funcionario && (
            <Controller
              control={control}
              name="ativo"
              render={({ field }) => <Switch className="md:col-span-2 xl:col-span-3" checked={field.value} onChange={field.onChange} disabled={readOnly} label="Ativo" description="Inativos não registram ponto e saem da apuração." />}
            />
          )}
        </fieldset>
        {erroGeral && <Alert tone="danger" className="mt-4">{erroGeral}</Alert>}
        {!readOnly && (
          <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
            {funcionario && isDirty && (
              <Button variant="ghost" onClick={() => reset(valoresIniciais(funcionario))}>
                Descartar
              </Button>
            )}
            <Button type="submit" loading={salvar.isPending} icon={<Save className="size-4" />}>
              {funcionario ? 'Salvar alterações' : 'Cadastrar funcionário'}
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}

function Vinculos({ funcionario, podeEditar }: { funcionario: FuncionarioDetalhe; podeEditar: boolean }) {
  const [novo, setNovo] = useState(false)
  const [encerrando, setEncerrando] = useState<Vinculo | null>(null)
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <CalendarClock className="size-5 text-brand-500" />
            Jornadas
          </span>
        }
        description="Histórico de vínculos de jornada"
        action={
          podeEditar && (
            <Button size="sm" variant="soft" icon={<CalendarPlus className="size-4" />} onClick={() => setNovo(true)}>
              Nova jornada a partir de
            </Button>
          )
        }
      />
      <div className="p-5">
        {funcionario.vinculos.length === 0 ? (
          <Alert tone="warn" title="Sem jornada">
            Sem jornada vinculada o ponto não é apurado. Vincule uma jornada a partir da admissão.
          </Alert>
        ) : (
          <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-6">
            {funcionario.vinculos.map((v) => (
              <li key={v.id} className="relative">
                <span className={cn('absolute top-1.5 -left-[31px] size-3.5 rounded-full ring-4 ring-surface', v.atual ? 'bg-brand-500' : 'bg-line-2')} />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-fg">
                      <Link to={`/jornadas/${v.jornadaId}`} className="hover:text-brand-600 dark:hover:text-brand-300">
                        {v.jornada}
                      </Link>
                      {v.atual && <Badge tone="ok">atual</Badge>}
                      <Badge tone={v.tipo === 'Semanal' ? 'neutral' : 'night'}>{v.tipo === 'Semanal' ? 'Semanal' : 'Cíclica'}</Badge>
                    </p>
                    <p className="mt-0.5 text-sm text-fg-2 tabular">
                      {formatDate(v.vigenteDesde)} – {v.vigenteAte ? formatDate(v.vigenteAte) : 'sem data de fim'}
                      {v.dataReferenciaCiclo && <span className="text-fg-3"> · ciclo a partir de {formatDate(v.dataReferenciaCiclo)}</span>}
                    </p>
                  </div>
                  {podeEditar && (
                    <Button size="xs" variant="ghost" icon={<CalendarX2 className="size-3.5" />} onClick={() => setEncerrando(v)}>
                      {v.vigenteAte ? 'Alterar fim' : 'Encerrar vigência'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      {novo && <NovoVinculoModal funcionario={funcionario} onClose={() => setNovo(false)} />}
      {encerrando && <EncerrarVinculoModal funcionario={funcionario} vinculo={encerrando} onClose={() => setEncerrando(null)} />}
    </Card>
  )
}

export default function FuncionarioPage() {
  const { id } = useParams()
  const { cadastros } = usePermissoes()
  const { empresaId, empresa } = useEmpresa()
  const detalhe = useFuncionario(id)
  const f = detalhe.data

  if (id && detalhe.isError)
    return (
      <Card>
        <ErrorState description={errorMessage(detalhe.error)} onRetry={() => detalhe.refetch()} />
      </Card>
    )
  if (id && !f) return <Skeleton className="h-[520px] rounded-2xl" />
  const empresaDoCadastro = f?.empresaId ?? empresaId

  return (
    <div>
      <PageHeader
        title={f?.nome ?? 'Novo funcionário'}
        description={f ? `${f.matricula} · ${f.cargo} · ${f.empresa}` : `Cadastro em ${empresa?.nomeFantasia ?? 'empresa selecionada'}`}
        crumbs={[{ label: 'Funcionários', to: '/funcionarios' }, { label: f?.nome ?? 'Novo' }]}
        icon={<UserRound className="size-6" />}
        actions={
          f && (
            <>
              <LinkButton to={`/ponto/espelho/${f.id}`} variant="secondary" icon={<ScrollText className="size-4" />}>
                Espelho de ponto
              </LinkButton>
              <LinkButton to={`/banco-horas/${f.id}`} variant="secondary" icon={<PiggyBank className="size-4" />}>
                Banco de horas
              </LinkButton>
            </>
          )
        }
      />
      {!cadastros && (
        <Alert tone="neutral" className="mb-5">
          Modo leitura: só RH e administradores alteram cadastros.
        </Alert>
      )}
      {!empresaDoCadastro ? (
        <Card>
          <EmptyState title="Escolha uma empresa" description="Selecione a empresa no topo da tela antes de cadastrar." />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-6">
            <Formulario key={f?.id ?? 'novo'} funcionario={f} empresaId={empresaDoCadastro} readOnly={!cadastros} />
          </div>
          {f && (
            <div className="flex flex-col gap-6">
              <Vinculos funcionario={f} podeEditar={cadastros} />
              <Card className="px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <KeyRound className="size-4 text-fg-3" />
                  Acesso ao sistema
                </p>
                <p className="mt-1 text-sm text-fg-2">
                  {f.usuario ? (
                    <>
                      Usuário <span className="font-mono font-semibold text-fg">@{f.usuario}</span>
                    </>
                  ) : (
                    'Ainda sem usuário. O administrador pode criar em Usuários.'
                  )}
                </p>
              </Card>
              {f.equipe.length > 0 && (
                <Card>
                  <CardHeader
                    title={
                      <span className="flex items-center gap-2">
                        <Users className="size-5 text-fg-3" />
                        Equipe
                      </span>
                    }
                    description={`${f.equipe.length} ${f.equipe.length === 1 ? 'pessoa' : 'pessoas'} com ${f.nome.split(' ')[0]} como gestor`}
                  />
                  <ul className="p-2 pt-3">
                    {f.equipe.map((m) => (
                      <li key={m.id}>
                        <Link to={`/funcionarios/${m.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2">
                          <Avatar name={m.nome} size={30} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{m.nome}</span>
                            <span className="block truncate text-xs text-fg-3">
                              {m.matricula} · {m.cargo}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
