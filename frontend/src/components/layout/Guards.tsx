import { Suspense, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeft, Lock, RefreshCw, ServerCrash } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Button, LinkButton } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/States'
import { useAuth } from '@/lib/authContext'
import { EmpresaProvider } from '@/lib/empresa'
import type { Perfil } from '@/types/api'

export function Splash() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={52} className="animate-pulse" />
        <p className="text-sm font-medium text-fg-3">Abrindo o PeopleFlow…</p>
      </div>
    </div>
  )
}

export function Offline() {
  const { error, retry } = useAuth()
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-danger/10 text-danger">
          <ServerCrash className="size-8" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold">O servidor não respondeu</h1>
          <p className="mt-2 text-fg-2">{error && error !== 'O servidor não respondeu.' ? error : 'O PeopleFlow não conseguiu falar com o servidor local. Ele pode estar iniciando ainda.'}</p>
        </div>
        <Button onClick={retry} icon={<RefreshCw className="size-4" />}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState className="min-h-[50vh]" />}>{children}</Suspense>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'offline') return <Offline />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return (
    <EmpresaProvider key={user.id}>
      <Suspense fallback={<Splash />}>{children}</Suspense>
    </EmpresaProvider>
  )
}

export function SemAcesso({ motivo }: { motivo?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex max-w-md flex-col items-center text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="grid size-18 place-items-center rounded-3xl bg-warn/10 text-warn"
        >
          <Lock className="size-9" />
        </motion.span>
        <h1 className="mt-6 text-2xl font-extrabold">Sem acesso a esta tela</h1>
        <p className="mt-2 text-fg-2">{motivo ?? 'Seu perfil não tem permissão para abrir esta área. Fale com o RH ou com o administrador se precisar.'}</p>
        <LinkButton to="/" className="mt-7" icon={<ArrowLeft className="size-4" />}>
          Voltar ao painel
        </LinkButton>
      </div>
    </div>
  )
}

export function Gate({ perfis, funcionario, children }: { perfis?: Perfil[]; funcionario?: boolean; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return null
  if (perfis && !perfis.includes(user.perfil)) return <SemAcesso />
  if (funcionario && !user.funcionarioId) return <SemAcesso motivo="Seu usuário não está ligado a um funcionário, então não registra ponto. Use as telas de gestão para acompanhar a equipe." />
  return <Page>{children}</Page>
}
