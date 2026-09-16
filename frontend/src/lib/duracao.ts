export function formatMinutes(minutes: number): string {
  const value = Math.round(minutes)
  const abs = Math.abs(value)
  const text = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
  return value < 0 ? `-${text}` : text
}

export function formatSigned(minutes: number): string {
  if (minutes > 0) return `+${formatMinutes(minutes)}`
  return formatMinutes(minutes)
}

export function formatOrDash(minutes: number): string {
  return minutes ? formatMinutes(minutes) : '—'
}

export function signTone(minutes: number): string {
  if (minutes > 0) return 'text-ok'
  if (minutes < 0) return 'text-danger'
  return 'text-fg-3'
}

export function formatHoras(minutes: number): string {
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const sign = minutes < 0 ? '-' : ''
  if (h === 0) return `${sign}${m} min`
  if (m === 0) return `${sign}${h} h`
  return `${sign}${h} h ${m} min`
}

export function parseDuracao(input: string): number | null {
  const text = input.trim().replace(/\s+/g, '')
  if (!text) return null
  const match = /^([+-]?)(\d{1,3})(?::(\d{1,2}))?$/.exec(text)
  if (!match) return null
  const sign = match[1] === '-' ? -1 : 1
  if (match[3] === undefined) return sign * Number(match[2])
  const minutes = Number(match[3])
  if (minutes > 59) return null
  return sign * (Number(match[2]) * 60 + minutes)
}

export function horaParaMinutos(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

export function duracaoPeriodo(entrada: string, saida: string): number {
  const a = horaParaMinutos(entrada)
  const b = horaParaMinutos(saida)
  if (a === null || b === null) return 0
  const diff = b - a
  return diff <= 0 ? diff + 1440 : diff
}
