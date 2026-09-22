import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowRight, Building2, MapPin, Plus, ShieldCheck, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge, Card } from '@/components/ui/Display'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/toastContext'
import { useEmpresas } from '@/hooks/data'
import { useEmpresa } from '@/lib/empresaContext'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { maskCnpj } from '@/lib/masks'
import type { Empresa } from '@/types/api'
import { EmpresaForm } from './EmpresaForm'
import { paraRequest, type EmpresaFormValues } from './empresaSchema'

export default function EmpresasPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const empresas = useEmpresas()
  const { setEmpresaId } = useEmpresa()
  const [criando, setCriando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>()

  const criar = useMutation({
    mutationFn: (values: EmpresaFormValues) => http.post<Empresa>('/api/empresas', paraRequest(values)),
    onSuccess: async (empresa) => {
      toast.success('Empresa criada', `${empresa.nomeFantasia} já começa com a política padrão da CLT.`)
      await queryClient.invalidateQueries({ queryKey: ['empresas'] })
      setCriando(false)
      setEmpresaId(empresa.id)
      navigate(`/empresas/${empresa.id}`)
    },
    onError: (error) => {
      setErros(fieldErrors(error))
      toast.error('Não foi possível criar', errorMessage(error))
    },
  })

  return (
    <div>
      <PageHeader
        title="Empresas"
        description="Dados cadastrais, política de apuração e feriados de cada empresa."
        icon={<Building2 className="size-6" />}
        actions={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setErros(undefined)
              setCriando(true)
            }}
          >
            Nova empresa
          </Button>
        }
      />
      {empresas.isLoading ? (
        <GridSkeleton count={3} />
      ) : empresas.isError ? (
        <Card>
          <ErrorState description={errorMessage(empresas.error)} onRetry={() => empresas.refetch()} />
        </Card>
      ) : (empresas.data ?? []).length === 0 ? (
        <Card>
          <EmptyState icon={<Building2 className="size-7" />} title="Nenhuma empresa ainda" description="Cadastre a primeira empresa para começar." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(empresas.data ?? []).map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link
                to={`/empresas/${e.id}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: e.cor }} />
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-soft" style={{ backgroundColor: e.cor }}>
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-fg">{e.nomeFantasia}</p>
                    <p className="truncate text-xs text-fg-3">{e.razaoSocial}</p>
                  </div>
                  {!e.ativa && <Badge>Inativa</Badge>}
                </div>
                <div className="mt-4 flex flex-col gap-1.5 text-sm text-fg-2">
                  <span className="font-mono text-xs tabular">{maskCnpj(e.cnpj)}</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-fg-3" />
                    {e.municipio}/{e.uf}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-xs text-fg-2">
                  <Badge tone="brand">
                    <Users className="size-3" /> {e.funcionarios} {e.funcionarios === 1 ? 'funcionário' : 'funcionários'}
                  </Badge>
                  {e.politicaVersao && (
                    <Badge>
                      <ShieldCheck className="size-3" /> Política v{e.politicaVersao}
                    </Badge>
                  )}
                  <ArrowRight className="ml-auto size-4 text-fg-3 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={criando}
        onClose={() => setCriando(false)}
        title="Nova empresa"
        description="A empresa já nasce com a política padrão da CLT (versão 1). Você pode criar novas versões depois."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCriando(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="nova-empresa" loading={criar.isPending}>
              Criar empresa
            </Button>
          </>
        }
      >
        {criando && <EmpresaForm id="nova-empresa" onSubmit={(values) => criar.mutate(values)} serverErrors={erros} />}
      </Modal>
    </div>
  )
}
