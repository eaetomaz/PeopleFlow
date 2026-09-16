import type { ProblemDetails } from '@/types/api'

export const eventoSessaoExpirada = 'auth:expirou'

export class ApiError extends Error {
  status: number
  title: string
  detail?: string
  errors?: Record<string, string[]>
  correlationId?: string

  constructor(status: number, problem: ProblemDetails) {
    super(problem.detail || problem.title || 'Não foi possível concluir a operação.')
    this.status = status
    this.title = problem.title || 'Erro'
    this.detail = problem.detail
    this.errors = problem.errors
    this.correlationId = problem.correlationId
  }

  get firstFieldError(): string | undefined {
    if (!this.errors) return undefined
    const first = Object.values(this.errors)[0]
    return first?.[0]
  }

  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0]
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Não foi possível falar com o servidor local do PeopleFlow.'
    return error.firstFieldError || error.detail || error.title
  }
  if (isAbortError(error)) return 'Operação cancelada.'
  if (error instanceof Error) return error.message
  return 'Algo deu errado. Tente novamente.'
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.errors) return {}
  const result: Record<string, string> = {}
  for (const [key, messages] of Object.entries(error.errors)) {
    if (messages[0]) result[key] = messages[0]
  }
  return result
}

async function parseProblem(response: Response): Promise<ProblemDetails> {
  const type = response.headers.get('content-type') || ''
  if (type.includes('json')) {
    try {
      return (await response.json()) as ProblemDetails
    } catch {
      return { title: response.statusText }
    }
  }
  if (response.status === 502 || response.status === 503 || response.status === 504)
    return { title: 'Servidor indisponível', detail: 'O servidor local do PeopleFlow não está respondendo. Feche e abra o aplicativo de novo.' }
  if (response.status >= 500) return { title: 'Erro no servidor', detail: 'O servidor não conseguiu concluir a operação. Tente de novo em instantes.' }
  return { title: response.statusText || 'Erro' }
}

export interface RequestOptions {
  method?: string
  json?: unknown
  signal?: AbortSignal
  silent401?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: string | undefined
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  }

  let response: Response
  try {
    response = await fetch(path, {
      method: options.method || (body ? 'POST' : 'GET'),
      headers,
      body,
      signal: options.signal,
      credentials: 'same-origin',
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(0, { title: 'Sem conexão' })
  }

  if (!response.ok) {
    const problem = await parseProblem(response)
    if (response.status === 401 && !options.silent401) window.dispatchEvent(new Event(eventoSessaoExpirada))
    throw new ApiError(response.status, problem)
  }
  if (response.status === 204) return undefined as T
  const type = response.headers.get('content-type') || ''
  if (!type.includes('json')) return undefined as T
  return (await response.json()) as T
}

export const http = {
  get: <T>(path: string, signal?: AbortSignal) => api<T>(path, { signal }),
  post: <T>(path: string, json: unknown = {}) => api<T>(path, { method: 'POST', json }),
  put: <T>(path: string, json: unknown) => api<T>(path, { method: 'PUT', json }),
  del: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
}

export function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
