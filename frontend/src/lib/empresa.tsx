import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useEmpresas } from '@/hooks/data'
import { useUser } from './authContext'
import { EmpresaContext } from './empresaContext'

const storageKey = 'peopleflow.empresa'

function lerSalva(): string | undefined {
  try {
    return localStorage.getItem(storageKey) || undefined
  } catch {
    return undefined
  }
}

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  const podeTrocar = user.perfil === 'Admin' || user.perfil === 'RH'
  const { data, isLoading } = useEmpresas()
  const [selecionada, setSelecionada] = useState<string | undefined>(lerSalva)

  const empresas = useMemo(() => data ?? [], [data])

  const empresaId = useMemo(() => {
    if (!podeTrocar) return user.empresaId ?? empresas[0]?.id
    if (selecionada && empresas.some((e) => e.id === selecionada)) return selecionada
    if (empresas.length === 0) return selecionada
    return user.empresaId && empresas.some((e) => e.id === user.empresaId) ? user.empresaId : empresas[0]?.id
  }, [podeTrocar, selecionada, empresas, user.empresaId])

  const setEmpresaId = useCallback((id: string) => {
    setSelecionada(id)
    try {
      localStorage.setItem(storageKey, id)
    } catch {
      return
    }
  }, [])

  const value = useMemo(
    () => ({ empresaId, empresa: empresas.find((e) => e.id === empresaId), empresas, podeTrocar, carregando: isLoading, setEmpresaId }),
    [empresaId, empresas, podeTrocar, isLoading, setEmpresaId],
  )

  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>
}
