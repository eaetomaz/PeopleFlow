import { z } from 'zod'
import { destinoLabel, modoToleranciaLabel } from '@/lib/labels'
import { formatHoras } from '@/lib/duracao'
import type { PoliticaValores } from '@/types/api'

type Campo = keyof PoliticaValores

export interface CampoPolitica {
  campo: Campo
  label: string
  dica: string
  formatar: (p: PoliticaValores) => string
}

const min = (campo: Campo) => (p: PoliticaValores) => `${p[campo] as number} min`
const pct = (campo: Campo) => (p: PoliticaValores) => `${p[campo] as number}%`
const sim = (campo: Campo) => (p: PoliticaValores) => ((p[campo] as boolean) ? 'Sim' : 'Não')

export const gruposPolitica: { titulo: string; campos: CampoPolitica[] }[] = [
  {
    titulo: 'Tolerância',
    campos: [
      { campo: 'toleranciaPorMarcacaoMinutos', label: 'Por marcação', dica: 'CLT art. 58, § 1º: até 5 min por marcação.', formatar: min('toleranciaPorMarcacaoMinutos') },
      { campo: 'toleranciaDiariaMinutos', label: 'Limite diário', dica: 'CLT art. 58, § 1º: até 10 min somando o dia.', formatar: min('toleranciaDiariaMinutos') },
      { campo: 'modoTolerancia', label: 'Quando passa do limite', dica: 'Súmula 366 do TST: ao exceder, todo o tempo conta.', formatar: (p) => modoToleranciaLabel[p.modoTolerancia] },
      { campo: 'janelaDuplicidadeMinutos', label: 'Janela de duplicidade', dica: 'Registros repetidos dentro desta janela são ignorados.', formatar: min('janelaDuplicidadeMinutos') },
    ],
  },
  {
    titulo: 'Horas extras',
    campos: [
      { campo: 'percentualHeDiaUtil', label: 'Adicional em dia útil', dica: 'CF art. 7º, XVI: no mínimo 50%.', formatar: pct('percentualHeDiaUtil') },
      { campo: 'percentualHeDescansoFeriado', label: 'Adicional em descanso ou feriado', dica: 'Súmula 146 do TST e Lei 605/49: pagamento em dobro (100%).', formatar: pct('percentualHeDescansoFeriado') },
      { campo: 'limiteDiarioHeMinutos', label: 'Limite diário', dica: 'CLT art. 59: até 2 horas extras por dia.', formatar: (p) => formatHoras(p.limiteDiarioHeMinutos) },
      { campo: 'destinoHoraExtra', label: 'Destino em dia útil', dica: 'CLT art. 59, § 2º: banco de horas exige acordo.', formatar: (p) => destinoLabel[p.destinoHoraExtra] },
      { campo: 'destinoHeDescansoFeriado', label: 'Destino em descanso ou feriado', dica: 'Costuma ir para pagamento em folha.', formatar: (p) => destinoLabel[p.destinoHeDescansoFeriado] },
    ],
  },
  {
    titulo: 'Adicional noturno',
    campos: [
      { campo: 'adicionalNoturnoPercentual', label: 'Adicional', dica: 'CLT art. 73: no mínimo 20% para trabalho urbano.', formatar: pct('adicionalNoturnoPercentual') },
      { campo: 'inicioNoturno', label: 'Período noturno', dica: 'CLT art. 73, § 2º: das 22h às 5h.', formatar: (p) => `${p.inicioNoturno} às ${p.fimNoturno}` },
      { campo: 'horaNoturnaReduzida', label: 'Hora noturna reduzida', dica: 'CLT art. 73, § 1º: a hora noturna tem 52 min 30 s.', formatar: sim('horaNoturnaReduzida') },
      { campo: 'prorrogacaoNoturna', label: 'Prorrogação após as 5h', dica: 'CLT art. 73, § 5º e Súmula 60, II, do TST.', formatar: sim('prorrogacaoNoturna') },
    ],
  },
  {
    titulo: 'Intervalos',
    campos: [
      { campo: 'intervaloMinimoAcima6hMinutos', label: 'Mínimo acima de 6h', dica: 'CLT art. 71: ao menos 1 hora de intervalo.', formatar: (p) => formatHoras(p.intervaloMinimoAcima6hMinutos) },
      { campo: 'intervaloMinimo4a6hMinutos', label: 'Mínimo entre 4h e 6h', dica: 'CLT art. 71, § 1º: 15 minutos.', formatar: min('intervaloMinimo4a6hMinutos') },
      { campo: 'interjornadaMinimaMinutos', label: 'Interjornada mínima', dica: 'CLT art. 66: 11 horas entre duas jornadas.', formatar: (p) => formatHoras(p.interjornadaMinimaMinutos) },
    ],
  },
  {
    titulo: 'Banco de horas',
    campos: [{ campo: 'validadeBancoMeses', label: 'Validade dos créditos', dica: 'CLT art. 59, § 5º: até 6 meses por acordo individual; até 12 por acordo coletivo.', formatar: (p) => `${p.validadeBancoMeses} ${p.validadeBancoMeses === 1 ? 'mês' : 'meses'}` }],
  },
]

const numero = (minimo: number, maximo: number, mensagem: string) => z.number({ error: 'Informe um número.' }).int('Use um número inteiro.').min(minimo, mensagem).max(maximo, mensagem)
const horario = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (use HH:mm).')

export const politicaSchema = z
  .object({
    vigenteDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data de início.'),
    toleranciaPorMarcacaoMinutos: numero(0, 30, 'Use de 0 a 30 minutos.'),
    toleranciaDiariaMinutos: numero(0, 60, 'Use de 0 a 60 minutos.'),
    modoTolerancia: z.enum(['IntegralAoExceder', 'DescontarPorMarcacao']),
    destinoHoraExtra: z.enum(['BancoDeHoras', 'Pagamento']),
    destinoHeDescansoFeriado: z.enum(['BancoDeHoras', 'Pagamento']),
    percentualHeDiaUtil: numero(50, 200, 'O adicional é de no mínimo 50% (CF art. 7º, XVI), até 200%.'),
    percentualHeDescansoFeriado: numero(50, 300, 'Use de 50% a 300%.'),
    limiteDiarioHeMinutos: numero(0, 240, 'Use de 0 a 240 minutos.'),
    adicionalNoturnoPercentual: numero(20, 100, 'O adicional noturno é de no mínimo 20% (CLT art. 73).'),
    inicioNoturno: horario,
    fimNoturno: horario,
    horaNoturnaReduzida: z.boolean(),
    prorrogacaoNoturna: z.boolean(),
    intervaloMinimoAcima6hMinutos: numero(30, 120, 'Use de 30 a 120 minutos.'),
    intervaloMinimo4a6hMinutos: numero(0, 60, 'Use de 0 a 60 minutos.'),
    interjornadaMinimaMinutos: numero(0, 1440, 'Use de 0 a 1440 minutos.'),
    validadeBancoMeses: numero(1, 12, 'Use de 1 a 12 meses.'),
    janelaDuplicidadeMinutos: numero(1, 10, 'Use de 1 a 10 minutos.'),
    observacao: z.string().max(500, 'Use até 500 caracteres.'),
  })
  .refine((v) => v.toleranciaDiariaMinutos >= v.toleranciaPorMarcacaoMinutos, { path: ['toleranciaDiariaMinutos'], message: 'O limite diário não pode ser menor que a tolerância por marcação.' })

export type PoliticaFormValues = z.infer<typeof politicaSchema>

export function avisosPolitica(v: Partial<PoliticaFormValues>): Partial<Record<keyof PoliticaFormValues, string>> {
  const avisos: Partial<Record<keyof PoliticaFormValues, string>> = {}
  if ((v.toleranciaPorMarcacaoMinutos ?? 0) > 5) avisos.toleranciaPorMarcacaoMinutos = 'Acima dos 5 min da CLT. Permitido, mas pode ser questionado.'
  if ((v.toleranciaDiariaMinutos ?? 0) > 10) avisos.toleranciaDiariaMinutos = 'Acima dos 10 min diários da CLT.'
  if (v.modoTolerancia === 'DescontarPorMarcacao') avisos.modoTolerancia = 'Diverge da Súmula 366 do TST, que manda contar todo o tempo ao exceder.'
  if ((v.limiteDiarioHeMinutos ?? 0) > 120) avisos.limiteDiarioHeMinutos = 'Acima das 2 horas diárias do art. 59 da CLT.'
  if ((v.intervaloMinimoAcima6hMinutos ?? 60) < 60) avisos.intervaloMinimoAcima6hMinutos = 'Abaixo de 1 hora só com acordo ou convenção coletiva (CLT art. 611-A, III).'
  if ((v.intervaloMinimo4a6hMinutos ?? 15) < 15) avisos.intervaloMinimo4a6hMinutos = 'Abaixo dos 15 min do art. 71, § 1º.'
  if ((v.interjornadaMinimaMinutos ?? 660) < 660) avisos.interjornadaMinimaMinutos = 'Abaixo das 11 horas do art. 66 da CLT.'
  if ((v.validadeBancoMeses ?? 6) > 6) avisos.validadeBancoMeses = 'Mais de 6 meses exige acordo ou convenção coletiva.'
  if (v.horaNoturnaReduzida === false) avisos.horaNoturnaReduzida = 'A CLT garante a hora noturna reduzida ao trabalhador urbano.'
  return avisos
}
