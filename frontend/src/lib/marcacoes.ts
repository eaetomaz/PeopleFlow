import type { Marcacao } from '@/types/api'

export type ChipKind = 'normal' | 'ajustada' | 'pendente' | 'desconsiderada' | 'desconsiderar-pendente' | 'rejeitada'

export interface ChipMarcacao {
  marcacao: Marcacao
  kind: ChipKind
}

export function chipsDoDia(marcacoes: Marcacao[], incluirRejeitadas = false): ChipMarcacao[] {
  const pendentesDesconsiderar = new Set(
    marcacoes.filter((m) => m.origem === 'AjusteManual' && m.tipoAjuste === 'Desconsideracao' && m.status === 'Pendente' && m.marcacaoAlvoId).map((m) => m.marcacaoAlvoId as string),
  )
  const chips: ChipMarcacao[] = []
  for (const m of marcacoes) {
    if (m.origem === 'Registro') {
      chips.push({ marcacao: m, kind: m.desconsiderada ? 'desconsiderada' : pendentesDesconsiderar.has(m.id) ? 'desconsiderar-pendente' : 'normal' })
      continue
    }
    if (m.tipoAjuste !== 'Inclusao') continue
    if (m.status === 'Aprovado') chips.push({ marcacao: m, kind: m.desconsiderada ? 'desconsiderada' : pendentesDesconsiderar.has(m.id) ? 'desconsiderar-pendente' : 'ajustada' })
    else if (m.status === 'Pendente') chips.push({ marcacao: m, kind: 'pendente' })
    else if (incluirRejeitadas) chips.push({ marcacao: m, kind: 'rejeitada' })
  }
  return chips
}

export function marcacoesValidas(marcacoes: Marcacao[]): Marcacao[] {
  const alvosPendentes = new Set(
    marcacoes.filter((m) => m.origem === 'AjusteManual' && m.tipoAjuste === 'Desconsideracao' && m.status !== 'Rejeitado' && m.marcacaoAlvoId).map((m) => m.marcacaoAlvoId as string),
  )
  return marcacoes.filter(
    (m) => !m.desconsiderada && !alvosPendentes.has(m.id) && (m.origem === 'Registro' || (m.tipoAjuste === 'Inclusao' && m.status === 'Aprovado')),
  )
}

export function marcacoesEfetivas(marcacoes: Marcacao[]): Marcacao[] {
  return marcacoes.filter((m) => !m.desconsiderada && (m.origem === 'Registro' || (m.tipoAjuste === 'Inclusao' && m.status === 'Aprovado')))
}

export function minutosDesde(local: string, baseIso: string): number {
  const [y, mo, d] = local.slice(0, 10).split('-').map(Number)
  const [by, bm, bd] = baseIso.slice(0, 10).split('-').map(Number)
  const days = Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(by, bm - 1, bd)) / 86_400_000)
  const h = Number(local.slice(11, 13))
  const mi = Number(local.slice(14, 16))
  return days * 1440 + h * 60 + mi
}

export function diffLista(antes: string[], depois: string[]) {
  const restantes = [...depois]
  const removidos: number[] = []
  antes.forEach((valor, i) => {
    const idx = restantes.indexOf(valor)
    if (idx >= 0) restantes.splice(idx, 1)
    else removidos.push(i)
  })
  const restantesAntes = [...antes]
  const adicionados: number[] = []
  depois.forEach((valor, i) => {
    const idx = restantesAntes.indexOf(valor)
    if (idx >= 0) restantesAntes.splice(idx, 1)
    else adicionados.push(i)
  })
  return { removidos: new Set(removidos), adicionados: new Set(adicionados) }
}
