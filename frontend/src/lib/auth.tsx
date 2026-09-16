import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, errorMessage, eventoSessaoExpirada } from './api'
import { queryClient } from './queryClient'
import { AuthContext, type AuthStatus } from './authContext'
import type { UsuarioLogado } from '@/types/api'

async function esperarServidor(tentativas: number, signal: { alive: boolean }) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const response = await fetch('/health', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      if (response.ok) return true
    } catch {
      if (!signal.alive) return false
    }
    if (!signal.alive) return false
    await new Promise((resolve) => window.setTimeout(resolve, 750))
  }
  return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUserState] = useState<UsuarioLogado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expirou, setExpirou] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const userRef = useRef<UsuarioLogado | null>(null)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const signal = { alive: true }
    const load = async () => {
      const online = await esperarServidor(8, signal)
      if (!signal.alive) return
      if (!online) {
        setError('O servidor não respondeu.')
        setStatus('offline')
        return
      }
      try {
        const me = await api<UsuarioLogado>('/api/auth/me', { silent401: true })
        if (!signal.alive) return
        setUserState(me)
        setError(null)
        setStatus('ready')
      } catch (err) {
        if (!signal.alive) return
        if (err instanceof ApiError && err.status === 401) {
          setUserState(null)
          setError(null)
          setStatus('ready')
          return
        }
        setError(errorMessage(err))
        setStatus('offline')
      }
    }
    void load()
    return () => {
      signal.alive = false
    }
  }, [attempt])

  useEffect(() => {
    const handler = () => {
      if (userRef.current) setExpirou(true)
      setUserState(null)
      queryClient.clear()
    }
    window.addEventListener(eventoSessaoExpirada, handler)
    return () => window.removeEventListener(eventoSessaoExpirada, handler)
  }, [])

  const login = useCallback(async (loginValue: string, senha: string) => {
    const me = await api<UsuarioLogado>('/api/auth/login', { method: 'POST', json: { login: loginValue, senha }, silent401: true })
    queryClient.clear()
    setExpirou(false)
    setUserState(me)
    return me
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', json: {}, silent401: true })
    } catch {
      setError(null)
    }
    setExpirou(false)
    setUserState(null)
    queryClient.clear()
  }, [])

  const setUser = useCallback((next: UsuarioLogado) => setUserState(next), [])
  const retry = useCallback(() => {
    setStatus('loading')
    setAttempt((a) => a + 1)
  }, [])

  const value = useMemo(() => ({ status, user, error, expirou, login, logout, setUser, retry }), [status, user, error, expirou, login, logout, setUser, retry])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
