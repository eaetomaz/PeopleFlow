import { createContext, useContext } from 'react'
import type { Perfil, UsuarioLogado } from '@/types/api'

export type AuthStatus = 'loading' | 'offline' | 'ready'

export interface AuthContextValue {
  status: AuthStatus
  user: UsuarioLogado | null
  error: string | null
  expirou: boolean
  login: (login: string, senha: string) => Promise<UsuarioLogado>
  logout: () => Promise<void>
  setUser: (user: UsuarioLogado) => void
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth fora do AuthProvider')
  return context
}

export function useUser(): UsuarioLogado {
  const { user } = useAuth()
  if (!user) throw new Error('Usuário não autenticado')
  return user
}

export const perfisGestao: Perfil[] = ['Admin', 'RH', 'Gestor']
export const perfisCadastro: Perfil[] = ['Admin', 'RH']

export function pode(user: UsuarioLogado | null, perfis: Perfil[]): boolean {
  return !!user && perfis.includes(user.perfil)
}

export function usePermissoes() {
  const user = useUser()
  return {
    user,
    admin: user.perfil === 'Admin',
    cadastros: perfisCadastro.includes(user.perfil),
    gestao: perfisGestao.includes(user.perfil),
    temPonto: !!user.funcionarioId,
  }
}
