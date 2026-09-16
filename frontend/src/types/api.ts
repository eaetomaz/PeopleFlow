export type ThemePreference = 'light' | 'dark' | 'system'

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
  traceId?: string
  correlationId?: string
}

export type Perfil = 'Admin' | 'RH' | 'Gestor' | 'Funcionario'
export type TipoJornada = 'Semanal' | 'Ciclica'
export type ModoTolerancia = 'IntegralAoExceder' | 'DescontarPorMarcacao'
export type DestinoHoraExtra = 'BancoDeHoras' | 'Pagamento'
export type AbrangenciaFeriado = 'Nacional' | 'Estadual' | 'Municipal' | 'Empresa'
export type TipoFeriado = 'Feriado' | 'PontoFacultativo'
export type TipoAjuste = 'Inclusao' | 'Desconsideracao'
export type StatusAjuste = 'Pendente' | 'Aprovado' | 'Rejeitado'
export type TipoDia = 'Util' | 'Descanso' | 'Feriado'
export type SituacaoDia = 'Normal' | 'Falta' | 'Descanso' | 'Feriado' | 'TrabalhoEmDescanso' | 'Inconsistente' | ''
export type ClasseSegmento = 'Normal' | 'Extra' | 'Tolerado' | 'Atraso' | 'SaidaAntecipada' | 'AusenciaParcial' | 'Falta' | 'Noturno'
export type OrigemMarcacao = 'Registro' | 'AjusteManual'
export type StatusPresenca = 'Trabalhando' | 'Fora' | 'Ausente' | 'Aguardando' | 'Folga'
export type TipoLancamentoBanco = 'Apuracao' | 'AjusteManual' | 'Compensacao' | 'Pagamento' | 'Expiracao'

export interface UsuarioLogado {
  id: string
  login: string
  nome: string
  perfil: Perfil
  funcionarioId?: string
  funcionario?: string
  empresaId?: string
  empresa?: string
  senhaPadrao: boolean
}

export interface ContaDemo {
  login: string
  senha: string
  perfil: Perfil
  nome: string
  descricao: string
}

export interface Usuario {
  id: string
  login: string
  nome: string
  perfil: Perfil
  funcionarioId?: string
  funcionario?: string
  ativo: boolean
  senhaPadrao: boolean
  ultimoAcessoEm?: string
  bloqueado: boolean
}

export interface Empresa {
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  uf: string
  municipio: string
  fusoHorario: string
  cor: string
  ativa: boolean
  funcionarios: number
  politicaVersao?: number
}

export interface SalvarEmpresa {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  uf: string
  municipio: string
  cor?: string
  ativa: boolean
}

export interface PoliticaValores {
  toleranciaPorMarcacaoMinutos: number
  toleranciaDiariaMinutos: number
  modoTolerancia: ModoTolerancia
  destinoHoraExtra: DestinoHoraExtra
  destinoHeDescansoFeriado: DestinoHoraExtra
  percentualHeDiaUtil: number
  percentualHeDescansoFeriado: number
  limiteDiarioHeMinutos: number
  adicionalNoturnoPercentual: number
  inicioNoturno: string
  fimNoturno: string
  horaNoturnaReduzida: boolean
  prorrogacaoNoturna: boolean
  intervaloMinimoAcima6hMinutos: number
  intervaloMinimo4a6hMinutos: number
  interjornadaMinimaMinutos: number
  validadeBancoMeses: number
  janelaDuplicidadeMinutos: number
}

export interface Politica extends PoliticaValores {
  id: string
  empresaId: string
  versao: number
  vigenteDesde: string
  observacao?: string
  criadoEm: string
  criadoPor?: string
  vigente: boolean
}

export interface SalvarPolitica extends PoliticaValores {
  vigenteDesde: string
  observacao?: string
}

export interface NovaPolitica {
  politica: Politica
  diasRecalculados: number
}

export interface Feriado {
  id: string
  data: string
  nome: string
  abrangencia: AbrangenciaFeriado
  uf?: string
  municipio?: string
  empresaId?: string
  tipo: TipoFeriado
  valeParaEmpresa: boolean
}

export interface SalvarFeriado {
  data: string
  nome: string
  abrangencia: AbrangenciaFeriado
  uf?: string | null
  municipio?: string | null
  empresaId?: string | null
  tipo: TipoFeriado
}

export interface Periodo {
  entrada: string
  saida: string
}

export interface JornadaDia {
  indice: number
  folga: boolean
  periodos: Periodo[]
  cargaMinutos: number
}

export interface Jornada {
  id: string
  empresaId: string
  nome: string
  tipo: TipoJornada
  horaVirada: string
  feriadosCompensados: boolean
  ativa: boolean
  cargaCicloMinutos: number
  dias: JornadaDia[]
  funcionariosVinculados: number
}

export interface SalvarJornada {
  empresaId: string
  nome: string
  tipo: TipoJornada
  horaVirada: string
  feriadosCompensados: boolean
  ativa: boolean
  dias: { indice: number; folga: boolean; periodos: Periodo[] }[]
}

export interface Intervalo {
  inicio: string
  fim: string
}

export interface PrevisaoDia {
  data: string
  folga: boolean
  periodos: Intervalo[]
  cargaMinutos: number
}

export interface FuncionarioResumo {
  id: string
  nome: string
  matricula: string
  cargo: string
  empresaId: string
  empresa: string
}

export interface FuncionarioLista {
  id: string
  empresaId: string
  empresa: string
  matricula: string
  nome: string
  cargo: string
  departamento?: string
  gestor?: string
  jornadaAtual?: string
  dataAdmissao: string
  dataDemissao?: string
  ativo: boolean
}

export interface Vinculo {
  id: string
  jornadaId: string
  jornada: string
  tipo: TipoJornada
  vigenteDesde: string
  vigenteAte?: string
  dataReferenciaCiclo?: string
  atual: boolean
}

export interface FuncionarioDetalhe {
  id: string
  empresaId: string
  empresa: string
  matricula: string
  nome: string
  cpf: string
  pis?: string
  cargo: string
  departamento?: string
  centroCusto?: string
  email?: string
  dataAdmissao: string
  dataDemissao?: string
  gestorId?: string
  gestor?: string
  ativo: boolean
  usuario?: string
  vinculos: Vinculo[]
  equipe: FuncionarioResumo[]
}

export interface SalvarFuncionario {
  empresaId: string
  matricula: string
  nome: string
  cpf: string
  pis: string | null
  cargo: string
  departamento: string | null
  centroCusto: string | null
  email: string | null
  dataAdmissao: string
  dataDemissao: string | null
  gestorId: string | null
  ativo: boolean
}

export interface Marcacao {
  id: string
  dataHora: string
  nsr: number
  origem: OrigemMarcacao
  tipoAjuste?: TipoAjuste
  status?: StatusAjuste
  justificativa?: string
  marcacaoAlvoId?: string
  solicitadoPor?: string
  solicitadoEm?: string
  decididoPor?: string
  decididoEm?: string
  motivoDecisao?: string
  desconsiderada: boolean
}

export interface ApuracaoDia {
  data: string
  calculado: boolean
  tipoDia: TipoDia
  situacao: SituacaoDia
  provisorio: boolean
  hoje: boolean
  previstoMinutos: number
  trabalhadoMinutos: number
  extrasMinutos: number
  extrasPercentual: number
  extrasNoturnasMinutos: number
  atrasoMinutos: number
  saidaAntecipadaMinutos: number
  ausenciaParcialMinutos: number
  faltaMinutos: number
  noturnoRealMinutos: number
  noturnoFictoMinutos: number
  intervaloRealMinutos: number
  intervaloSuprimidoMinutos: number
  toleranciaDesconsideradaMinutos: number
  saldoMinutos: number
  creditoBancoMinutos: number
  debitoBancoMinutos: number
  extrasAPagarMinutos: number
  descontoMinutos: number
  inconsistencias: string[]
  marcacoes: Marcacao[]
  previsto: Intervalo[]
  feriado: boolean
  feriadoNome?: string
}

export interface Segmento {
  inicio: string
  fim: string
  classe: ClasseSegmento
}

export interface Regra {
  codigo: string
  texto: string
  base?: string
}

export interface DetalheDia {
  dia: ApuracaoDia
  segmentos: Segmento[]
  regras: Regra[]
  jornada?: string
  politicaVersao?: number
  versaoMotor: number
  calculadoEm?: string
}

export interface TotaisPeriodo {
  dias: number
  previstoMinutos: number
  trabalhadoMinutos: number
  extrasMinutos: number
  extrasNoturnasMinutos: number
  noturnoFictoMinutos: number
  atrasoMinutos: number
  saidaAntecipadaMinutos: number
  ausenciaParcialMinutos: number
  faltaMinutos: number
  intervaloSuprimidoMinutos: number
  saldoMinutos: number
  creditoBancoMinutos: number
  debitoBancoMinutos: number
  extrasAPagarMinutos: number
  descontoMinutos: number
  diasComFalta: number
  diasInconsistentes: number
  diasTrabalhados: number
}

export interface Espelho {
  funcionario: FuncionarioResumo
  competencia: string
  dias: ApuracaoDia[]
  totais: TotaisPeriodo
  saldoBancoMinutos: number
  ajustesPendentes: number
}

export interface ResumoEmpresaLinha {
  funcionarioId: string
  nome: string
  matricula: string
  cargo: string
  totais: TotaisPeriodo
  saldoBancoMinutos: number
  ajustesPendentes: number
}

export interface ResumoEmpresa {
  empresaId: string
  empresa: string
  competencia: string
  linhas: ResumoEmpresaLinha[]
  totais: TotaisPeriodo
}

export interface Reprocessamento {
  funcionarios: number
  dias: number
}

export interface PontoHoje {
  funcionario: FuncionarioResumo
  agora: string
  diaReferencia: string
  dia: ApuracaoDia
  proximoPrevisto?: string
  jornada?: string
}

export interface RegistroPonto {
  id: string
  dataHora: string
  nsr: number
  diaReferencia: string
}

export interface SolicitarAjuste {
  funcionarioId: string
  tipo: TipoAjuste
  dataHora?: string
  marcacaoAlvoId?: string
  justificativa: string
}

export interface Ajuste {
  id: string
  funcionario: FuncionarioResumo
  tipo: TipoAjuste
  status: StatusAjuste
  dataHora: string
  diaReferencia: string
  justificativa: string
  solicitadoPor?: string
  solicitadoEm?: string
  decididoPor?: string
  decididoEm?: string
  motivoDecisao?: string
  marcacoesAntes: string[]
  marcacoesDepois: string[]
  podeDecidir: boolean
  motivoBloqueio?: string
}

export interface Lancamento {
  id: string
  data: string
  minutos: number
  tipo: TipoLancamentoBanco
  descricao: string
  venceEm?: string
  criadoPor?: string
  saldoApos: number
}

export interface CreditoAVencer {
  data: string
  minutos: number
  venceEm?: string
  vencido: boolean
}

export interface BancoHoras {
  funcionario: FuncionarioResumo
  saldoMinutos: number
  creditosMinutos: number
  debitosMinutos: number
  vencidoMinutos: number
  validadeMeses: number
  creditosEmAberto: CreditoAVencer[]
  extrato: Lancamento[]
}

export interface SaldoFuncionario {
  funcionario: FuncionarioResumo
  saldoMinutos: number
  vencidoMinutos: number
  proximoVencimento?: string
}

export interface Presenca {
  funcionario: FuncionarioResumo
  status: StatusPresenca
  primeiraMarcacao?: string
  previstoInicio?: string
  atrasado: boolean
}

export interface SerieDia {
  data: string
  extrasMinutos: number
  debitosMinutos: number
}

export interface Destaque {
  funcionario: FuncionarioResumo
  minutos: number
}

export interface Painel {
  perfil: Perfil
  agora: string
  competencia: string
  funcionariosAtivos: number
  presentesHoje: number
  ausentesHoje: number
  atrasadosHoje: number
  previstosHoje: number
  presencas: Presenca[]
  ajustesPendentes: number
  inconsistenciasMes: number
  extrasMesMinutos: number
  debitosMesMinutos: number
  faltasMes: number
  saldoBancoMinutos: number
  serie: SerieDia[]
  maisExtras: Destaque[]
  maisDebitos: Destaque[]
}
