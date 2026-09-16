import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return count < 2
      },
    },
  },
})

const apuracaoKeys = ['painel', 'ponto-hoje', 'espelho', 'dia', 'ajustes', 'apuracao', 'banco', 'banco-func']

export function invalidarApuracao() {
  return Promise.all(apuracaoKeys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
}
