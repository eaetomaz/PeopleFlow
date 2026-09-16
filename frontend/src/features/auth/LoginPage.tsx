import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRight, CalendarClock, CircleAlert, Eye, EyeOff, Fingerprint, Lock, Scale, User, Wallet } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert, Badge, Skeleton } from '@/components/ui/Display'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Splash, Offline } from '@/components/layout/Guards'
import { useToast } from '@/components/ui/toastContext'
import { useAuth } from '@/lib/authContext'
import { errorMessage, http } from '@/lib/api'
import { perfilLabel, perfilTone } from '@/lib/labels'
import { firstName } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { ContaDemo } from '@/types/api'

const schema = z.object({
  login: z.string().trim().min(1, 'Informe o usuário.'),
  senha: z.string().min(1, 'Informe a senha.'),
})

type FormValues = z.infer<typeof schema>

const destaques = [
  { icon: Fingerprint, titulo: 'Ponto em um clique', texto: 'Registro com NSR, janela contra duplicidade e ajustes com aprovação.' },
  { icon: CalendarClock, titulo: 'Jornadas de verdade', texto: 'Semanais, 12x36, noturnas e cíclicas, com hora de virada.' },
  { icon: Wallet, titulo: 'Banco de horas', texto: 'Créditos com validade, débitos em ordem FIFO e extrato completo.' },
  { icon: Scale, titulo: 'Apuração com regras da CLT', texto: 'Tolerância, horas extras, adicional noturno e intervalos, explicados dia a dia.' },
]

export default function LoginPage() {
  const { status, user, login, expirou } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [erro, setErro] = useState<string | null>(null)
  const [verSenha, setVerSenha] = useState(false)
  const from = (location.state as { from?: string } | null)?.from

  const demo = useQuery({ queryKey: ['demo'], queryFn: () => http.get<ContaDemo[]>('/api/auth/demo'), enabled: status === 'ready' && !user, staleTime: Infinity })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { login: '', senha: '' } })

  if (status === 'loading') return <Splash />
  if (status === 'offline') return <Offline />
  if (user) return <Navigate to={from && from !== '/login' ? from : '/'} replace />

  const entrar = async (values: FormValues) => {
    setErro(null)
    try {
      const me = await login(values.login, values.senha)
      toast.success(`Olá, ${firstName(me.nome)}!`, me.senhaPadrao ? 'Você está com a senha inicial. Troque-a em Meu perfil quando puder.' : undefined)
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (error) {
      setErro(errorMessage(error))
    }
  }

  const usarConta = (conta: ContaDemo) => {
    setValue('login', conta.login, { shouldValidate: true })
    setValue('senha', conta.senha, { shouldValidate: true })
    void handleSubmit(entrar)()
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-900 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_80%_70%_at_30%_30%,#000,transparent)]" />
          <div className="absolute -top-32 -left-24 size-[520px] animate-drift rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.55),transparent_65%)] blur-2xl" />
          <div className="absolute -right-24 -bottom-40 size-[480px] animate-drift rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.35),transparent_65%)] blur-2xl [animation-delay:-7s]" />
          <div className="absolute top-1/2 right-10 size-72 animate-drift rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),transparent_65%)] blur-2xl [animation-delay:-12s]" />
        </div>
        <div className="relative">
          <Logo light to="/login" />
        </div>
        <div className="relative max-w-xl">
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-[2.6rem] leading-[1.08] font-extrabold tracking-tight">
            A jornada da sua equipe, <span className="bg-linear-to-r from-brand-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">apurada com clareza.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-4 text-lg text-white/70">
            Ponto eletrônico, jornadas, banco de horas e apuração com as regras da CLT. Cada minuto tem explicação e base legal.
          </motion.p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {destaques.map((item, i) => (
              <motion.li
                key={item.titulo}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
              >
                <item.icon className="size-5 text-brand-300" />
                <p className="mt-3 font-semibold">{item.titulo}</p>
                <p className="mt-1 text-sm text-white/60">{item.texto}</p>
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/40">PeopleFlow roda no seu computador. Seus dados ficam com você.</p>
      </aside>

      <main className="relative flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Logo to="/login" className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight">Entrar</h2>
            <p className="mt-1.5 text-fg-2">Use o usuário e a senha que o RH passou para você.</p>

            {expirou && (
              <Alert tone="warn" icon={<Lock className="size-4" />} className="mt-6">
                Sua sessão expirou. Entre de novo para continuar.
              </Alert>
            )}

            <form onSubmit={handleSubmit(entrar)} className="mt-7 flex flex-col gap-4" noValidate>
              <Input label="Usuário" autoComplete="username" autoFocus leading={<User className="size-4" />} error={errors.login?.message} {...register('login')} />
              <Input
                label="Senha"
                type={verSenha ? 'text' : 'password'}
                autoComplete="current-password"
                leading={<Lock className="size-4" />}
                error={errors.senha?.message}
                trailing={
                  <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'} className="grid size-8 place-items-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg">
                    {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
                {...register('senha')}
              />
              {erro && (
                <Alert tone="danger" icon={<CircleAlert className="size-4" />}>
                  {erro}
                </Alert>
              )}
              <Button type="submit" size="lg" shine loading={isSubmitting} className="mt-1 w-full">
                Entrar <ArrowRight className="size-4" />
              </Button>
            </form>

            <div className="mt-9">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-xs font-semibold tracking-wider text-fg-3 uppercase">Contas de demonstração</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              {demo.isLoading ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-[72px] rounded-2xl" />
                  ))}
                </div>
              ) : demo.data && demo.data.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {demo.data.map((conta, i) => (
                    <motion.button
                      key={conta.login}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      disabled={isSubmitting}
                      onClick={() => usarConta(conta)}
                      className={cn(
                        'group flex flex-col items-start gap-1 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card disabled:opacity-60 dark:hover:border-brand-500/50',
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-fg">{conta.nome}</span>
                        <Badge tone={perfilTone[conta.perfil]}>{conta.perfil === 'Admin' ? 'Admin' : perfilLabel[conta.perfil]}</Badge>
                      </span>
                      <span className="text-xs text-fg-3">{conta.descricao}</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-center text-sm text-fg-3">As contas de demonstração já foram personalizadas ou desativadas.</p>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
