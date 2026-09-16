const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const mesesCurtos = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const semanaCurta = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const semanaLonga = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function hojeIso(): string {
  return toIsoDate(new Date())
}

export function agoraLocalInput(): string {
  const now = new Date()
  return `${toIsoDate(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function dateFromIso(iso: string): Date {
  const { y, m, d } = parts(iso)
  return new Date(y, m - 1, d, 12)
}

export function addDays(iso: string, days: number): string {
  const date = dateFromIso(iso)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export function diffDays(a: string, b: string): number {
  const pa = parts(a)
  const pb = parts(b)
  return Math.round((Date.UTC(pa.y, pa.m - 1, pa.d) - Date.UTC(pb.y, pb.m - 1, pb.d)) / 86_400_000)
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const { y, m, d } = parts(iso)
  return `${pad(d)}/${pad(m)}/${y}`
}

export function formatDiaMes(iso: string): string {
  const { m, d } = parts(iso)
  return `${pad(d)}/${pad(m)}`
}

export function weekdayShort(iso: string): string {
  return semanaCurta[dateFromIso(iso).getDay()]
}

export function weekdayLong(iso: string): string {
  return semanaLonga[dateFromIso(iso).getDay()]
}

export function weekdayIndex(iso: string): number {
  return dateFromIso(iso).getDay()
}

export function formatDateLong(iso: string): string {
  const { y, m, d } = parts(iso)
  return `${weekdayLong(iso)}, ${d} de ${meses[m - 1]} de ${y}`
}

export function formatDateMedium(iso: string): string {
  const { m, d } = parts(iso)
  return `${weekdayShort(iso)}, ${d} ${mesesCurtos[m - 1]}`
}

export function hora(local?: string | null): string {
  if (!local) return '—'
  return local.slice(11, 16)
}

export function dataDe(local: string): string {
  return local.slice(0, 10)
}

export function formatLocal(local?: string | null): string {
  if (!local) return '—'
  return `${formatDate(local)} ${hora(local)}`
}

function parseInstant(utc: string): Date {
  const normalized = utc.replace(/(\.\d{3})\d+/, '$1')
  return new Date(normalized)
}

export function formatInstant(utc?: string | null): string {
  if (!utc) return '—'
  const date = parseInstant(utc)
  if (Number.isNaN(date.getTime())) return '—'
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatRelative(utc?: string | null): string {
  if (!utc) return 'nunca'
  const date = parseInstant(utc)
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86_400) return `há ${Math.floor(diff / 3600)} h`
  if (diff < 86_400 * 7) {
    const dias = Math.floor(diff / 86_400)
    return dias === 1 ? 'ontem' : `há ${dias} dias`
  }
  return formatInstant(utc)
}

export function competenciaAtual(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

export function isCompetencia(value?: string | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function competenciaLabel(comp: string): string {
  const [y, m] = comp.split('-').map(Number)
  return `${meses[m - 1]} de ${y}`
}

export function addMonths(comp: string, delta: number): string {
  const [y, m] = comp.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function competenciaIntervalo(comp: string): { de: string; ate: string } {
  const [y, m] = comp.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { de: `${comp}-01`, ate: `${comp}-${pad(last)}` }
}

export function nomeMes(index: number): string {
  return meses[index]
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function plural(count: number, one: string, many: string): string {
  return `${formatInteger(count)} ${count === 1 ? one : many}`
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function inicial(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text
}
