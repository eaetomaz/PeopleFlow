import { z } from 'zod'
import { cnpjValido, digits } from '@/lib/masks'
import type { SalvarEmpresa } from '@/types/api'

export const empresaSchema = z.object({
  razaoSocial: z.string().trim().min(1, 'Informe a razão social.').max(160),
  nomeFantasia: z.string().trim().min(1, 'Informe o nome fantasia.').max(100),
  cnpj: z.string().refine(cnpjValido, 'CNPJ inválido.'),
  uf: z.string().length(2, 'Escolha a UF.'),
  municipio: z.string().trim().min(1, 'Informe o município.').max(100),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.'),
  ativa: z.boolean(),
})

export type EmpresaFormValues = z.infer<typeof empresaSchema>

export function paraRequest(values: EmpresaFormValues): SalvarEmpresa {
  return { ...values, cnpj: digits(values.cnpj), uf: values.uf.toUpperCase() }
}
