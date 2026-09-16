import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { http, query } from '@/lib/api'
import type {
  Ajuste,
  BancoHoras,
  DetalheDia,
  Empresa,
  Espelho,
  Feriado,
  FuncionarioDetalhe,
  FuncionarioLista,
  Jornada,
  Painel,
  Politica,
  PontoHoje,
  PrevisaoDia,
  ResumoEmpresa,
  SaldoFuncionario,
  StatusAjuste,
  Usuario,
} from '@/types/api'

export function useEmpresas(enabled = true) {
  return useQuery({ queryKey: ['empresas'], queryFn: ({ signal }) => http.get<Empresa[]>('/api/empresas', signal), enabled, staleTime: 60_000 })
}

export function useEmpresaDetalhe(id?: string) {
  return useQuery({ queryKey: ['empresa', id], queryFn: ({ signal }) => http.get<Empresa>(`/api/empresas/${id}`, signal), enabled: !!id })
}

export function usePainel(empresaId?: string, enabled = true) {
  return useQuery({
    queryKey: ['painel', empresaId ?? null],
    queryFn: ({ signal }) => http.get<Painel>(`/api/painel${query({ empresaId })}`, signal),
    enabled,
    refetchInterval: 60_000,
  })
}

export function usePontoHoje(enabled = true) {
  return useQuery({ queryKey: ['ponto-hoje'], queryFn: ({ signal }) => http.get<PontoHoje>('/api/ponto/hoje', signal), enabled, refetchInterval: 60_000 })
}

export function useEspelho(funcionarioId: string | undefined, competencia: string) {
  return useQuery({
    queryKey: ['espelho', funcionarioId, competencia],
    queryFn: ({ signal }) => http.get<Espelho>(`/api/funcionarios/${funcionarioId}/apuracao${query({ competencia })}`, signal),
    enabled: !!funcionarioId,
    placeholderData: keepPreviousData,
  })
}

export function useDetalheDia(funcionarioId?: string, data?: string) {
  return useQuery({
    queryKey: ['dia', funcionarioId, data],
    queryFn: ({ signal }) => http.get<DetalheDia>(`/api/funcionarios/${funcionarioId}/apuracao/${data}`, signal),
    enabled: !!funcionarioId && !!data,
  })
}

export function useAjustes(status: StatusAjuste | undefined, empresaId?: string, enabled = true) {
  return useQuery({
    queryKey: ['ajustes', status ?? null, empresaId ?? null],
    queryFn: ({ signal }) => http.get<Ajuste[]>(`/api/ajustes${query({ status, empresaId })}`, signal),
    enabled,
  })
}

export function useResumoEmpresa(empresaId: string | undefined, competencia: string) {
  return useQuery({
    queryKey: ['apuracao', empresaId, competencia],
    queryFn: ({ signal }) => http.get<ResumoEmpresa>(`/api/empresas/${empresaId}/apuracao${query({ competencia })}`, signal),
    enabled: !!empresaId,
    placeholderData: keepPreviousData,
  })
}

export function useSaldosBanco(empresaId?: string) {
  return useQuery({
    queryKey: ['banco', empresaId ?? null],
    queryFn: ({ signal }) => http.get<SaldoFuncionario[]>(`/api/banco-horas${query({ empresaId })}`, signal),
  })
}

export function useBancoFuncionario(funcionarioId?: string) {
  return useQuery({
    queryKey: ['banco-func', funcionarioId],
    queryFn: ({ signal }) => http.get<BancoHoras>(`/api/funcionarios/${funcionarioId}/banco-horas`, signal),
    enabled: !!funcionarioId,
  })
}

export function usePoliticaVigente(empresaId?: string) {
  return useQuery({
    queryKey: ['politica-vigente', empresaId],
    queryFn: ({ signal }) => http.get<Politica>(`/api/empresas/${empresaId}/politicas/vigente`, signal),
    enabled: !!empresaId,
  })
}

export function usePoliticas(empresaId?: string) {
  return useQuery({
    queryKey: ['politicas', empresaId],
    queryFn: ({ signal }) => http.get<Politica[]>(`/api/empresas/${empresaId}/politicas`, signal),
    enabled: !!empresaId,
  })
}

export function useFeriados(ano: number, empresaId?: string) {
  return useQuery({
    queryKey: ['feriados', ano, empresaId ?? null],
    queryFn: ({ signal }) => http.get<Feriado[]>(`/api/feriados${query({ ano, empresaId })}`, signal),
    placeholderData: keepPreviousData,
  })
}

export function useJornadas(empresaId?: string, enabled = true) {
  return useQuery({
    queryKey: ['jornadas', empresaId ?? null],
    queryFn: ({ signal }) => http.get<Jornada[]>(`/api/jornadas${query({ empresaId })}`, signal),
    enabled,
  })
}

export function useJornada(id?: string) {
  return useQuery({ queryKey: ['jornada', id], queryFn: ({ signal }) => http.get<Jornada>(`/api/jornadas/${id}`, signal), enabled: !!id })
}

export function usePrevisao(id: string | undefined, de: string, ate: string, referenciaCiclo?: string) {
  return useQuery({
    queryKey: ['previsao', id, de, ate, referenciaCiclo ?? null],
    queryFn: ({ signal }) => http.get<PrevisaoDia[]>(`/api/jornadas/${id}/previsao${query({ de, ate, referenciaCiclo })}`, signal),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })
}

export function useFuncionarios(filtro: { empresaId?: string; busca?: string; ativo?: boolean }, enabled = true) {
  return useQuery({
    queryKey: ['funcionarios', filtro.empresaId ?? null, filtro.busca ?? '', filtro.ativo ?? null],
    queryFn: ({ signal }) => http.get<FuncionarioLista[]>(`/api/funcionarios${query({ empresaId: filtro.empresaId, busca: filtro.busca, ativo: filtro.ativo })}`, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useFuncionario(id?: string) {
  return useQuery({
    queryKey: ['funcionario', id],
    queryFn: ({ signal }) => http.get<FuncionarioDetalhe>(`/api/funcionarios/${id}`, signal),
    enabled: !!id,
  })
}

export function useUsuarios() {
  return useQuery({ queryKey: ['usuarios'], queryFn: ({ signal }) => http.get<Usuario[]>('/api/usuarios', signal) })
}
