import type { AbrangenciaFeriado, ClasseSegmento, DestinoHoraExtra, ModoTolerancia, Perfil, StatusAjuste, StatusPresenca, TipoAjuste, TipoFeriado, TipoLancamentoBanco } from '@/types/api'

export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'night'

export const perfilLabel: Record<Perfil, string> = {
  Admin: 'Administrador',
  RH: 'RH',
  Gestor: 'Gestor',
  Funcionario: 'Funcionário',
}

export const perfilTone: Record<Perfil, Tone> = {
  Admin: 'brand',
  RH: 'info',
  Gestor: 'warn',
  Funcionario: 'neutral',
}

export const perfis: Perfil[] = ['Admin', 'RH', 'Gestor', 'Funcionario']

export const tipoAjusteLabel: Record<TipoAjuste, string> = {
  Inclusao: 'Inclusão',
  Desconsideracao: 'Desconsideração',
}

export const statusAjusteLabel: Record<StatusAjuste, string> = {
  Pendente: 'Pendente',
  Aprovado: 'Aprovado',
  Rejeitado: 'Rejeitado',
}

export const statusAjusteTone: Record<StatusAjuste, Tone> = {
  Pendente: 'warn',
  Aprovado: 'ok',
  Rejeitado: 'danger',
}

export const presencaTone: Record<StatusPresenca, Tone> = {
  Trabalhando: 'ok',
  Fora: 'info',
  Ausente: 'danger',
  Aguardando: 'warn',
  Folga: 'neutral',
}

export const modoToleranciaLabel: Record<ModoTolerancia, string> = {
  IntegralAoExceder: 'Integral ao exceder (CLT/Súmula 366)',
  DescontarPorMarcacao: 'Descontar por marcação',
}

export const destinoLabel: Record<DestinoHoraExtra, string> = {
  BancoDeHoras: 'Banco de horas',
  Pagamento: 'Pagamento',
}

export const abrangenciaLabel: Record<AbrangenciaFeriado, string> = {
  Nacional: 'Nacional',
  Estadual: 'Estadual',
  Municipal: 'Municipal',
  Empresa: 'Da empresa',
}

export const tipoFeriadoLabel: Record<TipoFeriado, string> = {
  Feriado: 'Feriado',
  PontoFacultativo: 'Ponto facultativo',
}

export const lancamentoLabel: Record<TipoLancamentoBanco, string> = {
  Apuracao: 'Apuração',
  AjusteManual: 'Lançamento manual',
  Compensacao: 'Compensação',
  Pagamento: 'Pagamento',
  Expiracao: 'Expiração',
}

export const classeLabel: Record<ClasseSegmento, string> = {
  Normal: 'Jornada normal',
  Extra: 'Hora extra',
  Tolerado: 'Tolerância',
  Atraso: 'Atraso',
  SaidaAntecipada: 'Saída antecipada',
  AusenciaParcial: 'Ausência parcial',
  Falta: 'Falta',
  Noturno: 'Noturno',
}

export const classeCor: Record<ClasseSegmento, string> = {
  Normal: 'var(--color-brand-500)',
  Extra: 'var(--color-extra)',
  Tolerado: 'var(--color-tolerado)',
  Atraso: '#e5484d',
  SaidaAntecipada: '#f07178',
  AusenciaParcial: '#f59e8b',
  Falta: '#b42318',
  Noturno: 'var(--color-night)',
}
