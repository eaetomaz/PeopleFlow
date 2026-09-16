import { createContext, useContext } from 'react'
import type { Empresa } from '@/types/api'

export interface EmpresaContextValue {
  empresaId?: string
  empresa?: Empresa
  empresas: Empresa[]
  podeTrocar: boolean
  carregando: boolean
  setEmpresaId: (id: string) => void
}

export const EmpresaContext = createContext<EmpresaContextValue | null>(null)

export function useEmpresa() {
  const context = useContext(EmpresaContext)
  if (!context) throw new Error('useEmpresa fora do EmpresaProvider')
  return context
}
