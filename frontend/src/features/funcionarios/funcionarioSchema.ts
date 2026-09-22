import { z } from 'zod'
import { cpfValido, digits } from '@/lib/masks'
import type { SalvarFuncionario } from '@/types/api'

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data.')

export const funcionarioSchema = z
  .object({
    matricula: z.string().trim().min(1, 'Informe a matrícula.').max(20, 'Use até 20 caracteres.'),
    nome: z.string().trim().min(1, 'Informe o nome.').max(120),
    cpf: z.string().refine(cpfValido, 'CPF inválido.'),
    pis: z.string().refine((v) => !v.trim() || digits(v).length === 11, 'O PIS tem 11 dígitos.'),
    cargo: z.string().trim().min(1, 'Informe o cargo.').max(80),
    departamento: z.string().max(80),
    centroCusto: z.string().max(40),
    email: z.string().refine((v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'E-mail inválido.'),
    dataAdmissao: data,
    dataDemissao: z.string(),
    gestorId: z.string(),
    ativo: z.boolean(),
  })
  .refine((v) => !v.dataDemissao || v.dataDemissao >= v.dataAdmissao, { path: ['dataDemissao'], message: 'A demissão não pode ser antes da admissão.' })

export type FuncionarioFormValues = z.infer<typeof funcionarioSchema>

const vazio = (v: string) => (v.trim() ? v.trim() : null)

export function paraRequestFuncionario(empresaId: string, v: FuncionarioFormValues): SalvarFuncionario {
  return {
    empresaId,
    matricula: v.matricula.trim(),
    nome: v.nome.trim(),
    cpf: digits(v.cpf),
    pis: v.pis.trim() ? digits(v.pis) : null,
    cargo: v.cargo.trim(),
    departamento: vazio(v.departamento),
    centroCusto: vazio(v.centroCusto),
    email: vazio(v.email),
    dataAdmissao: v.dataAdmissao,
    dataDemissao: v.dataDemissao || null,
    gestorId: v.gestorId || null,
    ativo: v.ativo,
  }
}
