import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Building2, Check, Circle, KeyRound, Monitor, Moon, Palette, Sun, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Alert, Avatar, Badge, Card, CardHeader } from '@/components/ui/Display'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toastContext'
import { useAuth, useUser } from '@/lib/authContext'
import { useTheme } from '@/lib/themeContext'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { perfilLabel, perfilTone } from '@/lib/labels'
import { cn } from '@/lib/cn'
import type { UsuarioLogado } from '@/types/api'

const schema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual.'),
    novaSenha: z.string().min(8, 'A nova senha precisa ter ao menos 8 caracteres.').max(128).regex(/[A-Za-z]/, 'Use ao menos uma letra.').regex(/[0-9]/, 'Use ao menos um número.'),
    confirmacao: z.string(),
  })
  .refine((v) => v.novaSenha === v.confirmacao, { path: ['confirmacao'], message: 'As senhas não conferem.' })
  .refine((v) => v.novaSenha !== v.senhaAtual, { path: ['novaSenha'], message: 'A nova senha precisa ser diferente da atual.' })

type Valores = z.infer<typeof schema>

function Regra({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className={cn('flex items-center gap-2 text-sm transition-colors', ok ? 'text-ok' : 'text-fg-3')}>
      {ok ? <Check className="size-4" /> : <Circle className="size-3.5" />}
      {texto}
    </li>
  )
}

export default function PerfilPage() {
  const user = useUser()
  const { setUser } = useAuth()
  const toast = useToast()
  const { preference, setPreference } = useTheme()
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(schema), defaultValues: { senhaAtual: '', novaSenha: '', confirmacao: '' } })
  const nova = useWatch({ control, name: 'novaSenha' }) ?? ''

  const mutation = useMutation({
    mutationFn: (v: Valores) => http.put<UsuarioLogado>('/api/auth/senha', { senhaAtual: v.senhaAtual, novaSenha: v.novaSenha }),
    onSuccess: (me) => {
      setUser(me)
      reset()
      toast.success('Senha alterada', 'Outras sessões abertas com a senha antiga foram encerradas.')
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      if (campos.senhaAtual) setError('senhaAtual', { message: campos.senhaAtual })
      if (campos.novaSenha) setError('novaSenha', { message: campos.novaSenha })
      if (!campos.senhaAtual && !campos.novaSenha) toast.error('Não foi possível alterar a senha', errorMessage(error))
    },
  })

  const temas = [
    { value: 'light' as const, icon: Sun, label: 'Claro' },
    { value: 'dark' as const, icon: Moon, label: 'Escuro' },
    { value: 'system' as const, icon: Monitor, label: 'Sistema' },
  ]

  return (
    <div>
      <PageHeader title="Meu perfil" description="Seus dados de acesso, senha e aparência." icon={<UserRound className="size-6" />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={user.nome} size={60} />
              <div className="min-w-0">
                <p className="truncate text-xl font-extrabold">{user.nome}</p>
                <p className="font-mono text-sm text-fg-3">@{user.login}</p>
                <Badge tone={perfilTone[user.perfil]} className="mt-1.5">
                  {perfilLabel[user.perfil]}
                </Badge>
              </div>
            </div>
            <dl className="mt-6 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/70 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-fg-3">
                  <UserRound className="size-4" /> Funcionário
                </dt>
                <dd className="font-semibold">{user.funcionario ?? 'Não vinculado'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/70 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-fg-3">
                  <Building2 className="size-4" /> Empresa
                </dt>
                <dd className="font-semibold">{user.empresa ?? 'Todas (conforme o perfil)'}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Palette className="size-5 text-brand-500" /> Aparência
                </span>
              }
              description="Fica salvo neste computador"
            />
            <div className="grid grid-cols-3 gap-2 p-5" role="radiogroup" aria-label="Tema">
              {temas.map((t) => {
                const ativo = preference === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={(e) => setPreference(t.value, { x: e.clientX, y: e.clientY })}
                    className={cn('flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-sm font-semibold transition', ativo ? 'border-brand-500 bg-brand-500/8 text-fg shadow-soft' : 'border-line text-fg-2 hover:border-line-2 hover:text-fg')}
                  >
                    <t.icon className={cn('size-5', ativo && 'text-brand-500')} />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <KeyRound className="size-5 text-brand-500" /> Alterar senha
              </span>
            }
            description="Depois da troca, as outras sessões abertas são encerradas"
          />
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4 p-5" noValidate>
            {user.senhaPadrao && (
              <Alert tone="warn" icon={<KeyRound className="size-4" />}>
                Você ainda usa a senha inicial. Escolha uma senha só sua.
              </Alert>
            )}
            <Input type="password" label="Senha atual" autoComplete="current-password" error={errors.senhaAtual?.message} {...register('senhaAtual')} />
            <Input type="password" label="Nova senha" autoComplete="new-password" error={errors.novaSenha?.message} {...register('novaSenha')} />
            <Input type="password" label="Confirme a nova senha" autoComplete="new-password" error={errors.confirmacao?.message} {...register('confirmacao')} />
            <ul className="flex flex-col gap-1 rounded-xl bg-surface-2/70 px-4 py-3">
              <Regra ok={nova.length >= 8} texto="Ao menos 8 caracteres" />
              <Regra ok={/[A-Za-z]/.test(nova)} texto="Ao menos uma letra" />
              <Regra ok={/[0-9]/.test(nova)} texto="Ao menos um número" />
            </ul>
            <div className="flex justify-end">
              <Button type="submit" loading={mutation.isPending} icon={<KeyRound className="size-4" />}>
                Alterar senha
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
