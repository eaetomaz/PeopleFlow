import { useState } from 'react'
import { useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { Building2, CalendarHeart, Save, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, Skeleton } from '@/components/ui/Display'
import { Tabs } from '@/components/ui/Navigation'
import { ErrorState } from '@/components/ui/States'
import { useToast } from '@/components/ui/toastContext'
import { useEmpresaDetalhe } from '@/hooks/data'
import { usePermissoes } from '@/lib/authContext'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { invalidarApuracao, queryClient } from '@/lib/queryClient'
import { maskCnpj } from '@/lib/masks'
import type { Empresa } from '@/types/api'
import { EmpresaForm } from './EmpresaForm'
import { paraRequest, type EmpresaFormValues } from './empresaSchema'
import { FeriadosTab } from './FeriadosTab'
import { PoliticaTab } from './PoliticaTab'

type Aba = 'dados' | 'politica' | 'feriados'

export default function EmpresaPage() {
  const { id } = useParams()
  const toast = useToast()
  const { cadastros } = usePermissoes()
  const empresa = useEmpresaDetalhe(id)
  const [aba, setAba] = useState<Aba>('dados')
  const [erros, setErros] = useState<Record<string, string>>()
  const e = empresa.data

  const salvar = useMutation({
    mutationFn: (values: EmpresaFormValues) => http.put<Empresa>(`/api/empresas/${id}`, paraRequest(values)),
    onSuccess: async (atualizada) => {
      toast.success('Dados salvos', atualizada.nomeFantasia)
      setErros(undefined)
      queryClient.setQueryData(['empresa', id], atualizada)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['empresas'] }), queryClient.invalidateQueries({ queryKey: ['feriados'] }), invalidarApuracao()])
    },
    onError: (error) => {
      setErros(fieldErrors(error))
      toast.error('Não foi possível salvar', errorMessage(error))
    },
  })

  return (
    <div>
      <PageHeader
        title={e?.nomeFantasia ?? 'Empresa'}
        description={e ? `${e.razaoSocial} · ${maskCnpj(e.cnpj)} · ${e.municipio}/${e.uf}` : undefined}
        crumbs={[{ label: 'Empresas', to: '/empresas' }, { label: e?.nomeFantasia ?? '…' }]}
        icon={<Building2 className="size-6" />}
        tone={e?.cor}
      />
      {empresa.isError ? (
        <Card>
          <ErrorState description={errorMessage(empresa.error)} onRetry={() => empresa.refetch()} />
        </Card>
      ) : !e || !id ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <Tabs
            className="mb-6"
            value={aba}
            onChange={setAba}
            items={[
              { value: 'dados', label: 'Dados', icon: <Building2 className="size-4" /> },
              { value: 'politica', label: 'Política', icon: <ShieldCheck className="size-4" /> },
              { value: 'feriados', label: 'Feriados', icon: <CalendarHeart className="size-4" /> },
            ]}
          />
          {aba === 'dados' && (
            <Card className="p-6">
              <EmpresaForm key={e.id} id="empresa-dados" empresa={e} onSubmit={(values) => salvar.mutate(values)} serverErrors={erros} readOnly={!cadastros} />
              {cadastros && (
                <div className="mt-6 flex justify-end border-t border-line pt-5">
                  <Button type="submit" form="empresa-dados" loading={salvar.isPending} icon={<Save className="size-4" />}>
                    Salvar alterações
                  </Button>
                </div>
              )}
            </Card>
          )}
          {aba === 'politica' && <PoliticaTab empresaId={id} podeEditar={cadastros} />}
          {aba === 'feriados' && <FeriadosTab empresa={e} podeEditar={cadastros} />}
        </>
      )}
    </div>
  )
}
