import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { Input, Select } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { maskCnpj, ufs } from '@/lib/masks'
import { cn } from '@/lib/cn'
import type { Empresa } from '@/types/api'
import { empresaSchema as schema, type EmpresaFormValues } from './empresaSchema'

const cores = ['#0d9488', '#10b981', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#475569']

interface EmpresaFormProps {
  id: string
  empresa?: Empresa
  onSubmit: (values: EmpresaFormValues) => void
  serverErrors?: Record<string, string>
  readOnly?: boolean
}

export function EmpresaForm({ id, empresa, onSubmit, serverErrors, readOnly }: EmpresaFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<EmpresaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      razaoSocial: empresa?.razaoSocial ?? '',
      nomeFantasia: empresa?.nomeFantasia ?? '',
      cnpj: empresa ? maskCnpj(empresa.cnpj) : '',
      uf: empresa?.uf ?? 'SP',
      municipio: empresa?.municipio ?? '',
      cor: empresa?.cor ?? '#0d9488',
      ativa: empresa?.ativa ?? true,
    },
  })

  useEffect(() => {
    if (!serverErrors) return
    for (const [key, message] of Object.entries(serverErrors)) {
      if (key in schema.shape) setError(key as keyof EmpresaFormValues, { message })
    }
  }, [serverErrors, setError])

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
        <Input label="Razão social" wrapperClassName="sm:col-span-2" error={errors.razaoSocial?.message} {...register('razaoSocial')} />
        <Input label="Nome fantasia" error={errors.nomeFantasia?.message} {...register('nomeFantasia')} />
        <Controller
          control={control}
          name="cnpj"
          render={({ field }) => (
            <Input label="CNPJ" inputMode="numeric" placeholder="00.000.000/0000-00" className="font-mono" error={errors.cnpj?.message} value={field.value} onBlur={field.onBlur} onChange={(event) => field.onChange(maskCnpj(event.target.value))} />
          )}
        />
        <Select label="UF" options={ufs.map((u) => ({ value: u, label: u }))} error={errors.uf?.message} {...register('uf')} />
        <Input label="Município" error={errors.municipio?.message} hint="Usado para aplicar feriados estaduais e municipais." {...register('municipio')} />
        <Controller
          control={control}
          name="cor"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-semibold text-fg">Cor de identificação</span>
              <div className="flex flex-wrap items-center gap-2">
                {cores.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => field.onChange(cor)}
                    aria-label={`Usar a cor ${cor}`}
                    aria-pressed={field.value.toLowerCase() === cor}
                    className={cn('grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-surface transition hover:scale-110', field.value.toLowerCase() === cor && 'ring-2 ring-fg')}
                    style={{ backgroundColor: cor }}
                  >
                    {field.value.toLowerCase() === cor && <Check className="size-4 text-white" />}
                  </button>
                ))}
                <label className="ml-1 flex items-center gap-2 text-xs text-fg-3">
                  <input type="color" value={field.value} onChange={(event) => field.onChange(event.target.value)} className="size-8 cursor-pointer rounded-lg border border-line bg-transparent" aria-label="Escolher outra cor" />
                  outra
                </label>
              </div>
              {errors.cor && <p className="text-xs text-danger">{errors.cor.message}</p>}
            </div>
          )}
        />
        {empresa && (
          <Controller
            control={control}
            name="ativa"
            render={({ field }) => <Switch className="sm:col-span-2" checked={field.value} onChange={field.onChange} label="Empresa ativa" description="Empresas inativas continuam com o histórico, mas saem das listas do dia a dia." />}
          />
        )}
      </fieldset>
    </form>
  )
}
