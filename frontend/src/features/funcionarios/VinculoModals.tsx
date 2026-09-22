import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Display'
import { Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { useJornadas } from '@/hooks/data'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { invalidarApuracao, queryClient } from '@/lib/queryClient'
import { formatDate, hojeIso } from '@/lib/format'
import { formatMinutes } from '@/lib/duracao'
import type { FuncionarioDetalhe, Vinculo } from '@/types/api'

async function atualizarFuncionario(f: FuncionarioDetalhe) {
  queryClient.setQueryData(['funcionario', f.id], f)
  await Promise.all([queryClient.invalidateQueries({ queryKey: ['funcionarios'] }), queryClient.invalidateQueries({ queryKey: ['jornadas'] }), invalidarApuracao()])
}

export function NovoVinculoModal({ funcionario, onClose }: { funcionario: FuncionarioDetalhe; onClose: () => void }) {
  const toast = useToast()
  const jornadas = useJornadas(funcionario.empresaId)
  const ativas = (jornadas.data ?? []).filter((j) => j.ativa)
  const [jornadaId, setJornadaId] = useState('')
  const [vigenteDesde, setVigenteDesde] = useState(hojeIso())
  const [referencia, setReferencia] = useState(hojeIso())
  const [erros, setErros] = useState<Record<string, string>>({})
  const escolhida = ativas.find((j) => j.id === jornadaId)

  const mutation = useMutation({
    mutationFn: () =>
      http.post<FuncionarioDetalhe>(`/api/funcionarios/${funcionario.id}/jornadas`, {
        jornadaId,
        vigenteDesde,
        dataReferenciaCiclo: escolhida?.tipo === 'Ciclica' ? referencia : null,
      }),
    onSuccess: async (f) => {
      toast.success('Jornada vinculada', `${escolhida?.nome ?? 'Jornada'} a partir de ${formatDate(vigenteDesde)}. Os dias foram recalculados.`)
      await atualizarFuncionario(f)
      onClose()
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      setErros({ ...campos, geral: campos.vigenteDesde || campos.jornadaId ? '' : errorMessage(error) })
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova jornada a partir de"
      description={`${funcionario.nome} · a vigência atual é encerrada no dia anterior automaticamente.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => {
              if (!jornadaId) {
                setErros({ jornadaId: 'Escolha a jornada.' })
                return
              }
              mutation.mutate()
            }}
          >
            Vincular jornada
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Jornada"
          value={jornadaId}
          onChange={(e) => setJornadaId(e.target.value)}
          error={erros.jornadaId}
          options={[{ value: '', label: jornadas.isLoading ? 'Carregando…' : 'Escolha a jornada' }, ...ativas.map((j) => ({ value: j.id, label: `${j.nome} · ${j.tipo === 'Semanal' ? 'semanal' : 'cíclica'} · ${formatMinutes(j.cargaCicloMinutos)}` }))]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input type="date" label="Vigente desde" value={vigenteDesde} min={funcionario.dataAdmissao} onChange={(e) => setVigenteDesde(e.target.value)} error={erros.vigenteDesde} />
          {escolhida?.tipo === 'Ciclica' && (
            <Input type="date" label="Referência do ciclo" value={referencia} onChange={(e) => setReferencia(e.target.value)} error={erros.dataReferenciaCiclo} hint="Data que corresponde ao dia 1 do ciclo." />
          )}
        </div>
        {erros.geral && <Alert tone="danger">{erros.geral}</Alert>}
      </div>
    </Modal>
  )
}

export function EncerrarVinculoModal({ funcionario, vinculo, onClose }: { funcionario: FuncionarioDetalhe; vinculo: Vinculo; onClose: () => void }) {
  const toast = useToast()
  const [vigenteAte, setVigenteAte] = useState(vinculo.vigenteAte ?? hojeIso())
  const [referencia, setReferencia] = useState(vinculo.dataReferenciaCiclo ?? '')
  const [erros, setErros] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () =>
      http.put<FuncionarioDetalhe>(`/api/funcionarios/${funcionario.id}/jornadas/${vinculo.id}`, {
        vigenteAte: vigenteAte || null,
        dataReferenciaCiclo: vinculo.tipo === 'Ciclica' && referencia ? referencia : null,
      }),
    onSuccess: async (f) => {
      toast.success(vigenteAte ? 'Vigência encerrada' : 'Vigência reaberta', `${vinculo.jornada}${vigenteAte ? ` até ${formatDate(vigenteAte)}` : ' sem data de fim'}.`)
      await atualizarFuncionario(f)
      onClose()
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      setErros({ ...campos, geral: campos.vigenteAte ? '' : errorMessage(error) })
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Encerrar vigência"
      description={`${vinculo.jornada} · desde ${formatDate(vinculo.vigenteDesde)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="date" label="Vigente até" value={vigenteAte} min={vinculo.vigenteDesde} onChange={(e) => setVigenteAte(e.target.value)} error={erros.vigenteAte} hint="Deixe em branco para manter sem data de fim." />
        {vinculo.tipo === 'Ciclica' && <Input type="date" label="Referência do ciclo" value={referencia} onChange={(e) => setReferencia(e.target.value)} hint="Dia 1 do ciclo." />}
      </div>
      {erros.geral && <Alert tone="danger" className="mt-4">{erros.geral}</Alert>}
    </Modal>
  )
}
