import { useMemo } from 'react'
import { Combobox } from '@/components/ui/Combobox'
import { useFuncionarios } from '@/hooks/data'

export function FuncionarioPicker({ empresaId, value, onChange, className, label }: { empresaId?: string; value?: string; onChange: (id: string) => void; className?: string; label?: string }) {
  const { data, isLoading } = useFuncionarios({ empresaId })
  const options = useMemo(
    () =>
      (data ?? []).map((f) => ({
        value: f.id,
        label: f.nome,
        description: `${f.matricula} · ${f.cargo}${f.ativo ? '' : ' · inativo'}`,
        keywords: `${f.matricula} ${f.departamento ?? ''}`,
      })),
    [data],
  )
  return (
    <Combobox
      label={label}
      className={className}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={isLoading ? 'Carregando funcionários…' : 'Escolha um funcionário'}
      searchPlaceholder="Buscar por nome, matrícula ou cargo"
      emptyText="Nenhum funcionário encontrado."
    />
  )
}
