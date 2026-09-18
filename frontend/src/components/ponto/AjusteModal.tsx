import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CirclePlus, Eraser, Send } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Navigation'
import { Alert } from '@/components/ui/Display'
import { useToast } from '@/components/ui/toastContext'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { invalidarApuracao } from '@/lib/queryClient'
import { formatDate, formatDateLong, hora, inicial } from '@/lib/format'
import { marcacoesValidas } from '@/lib/marcacoes'
import { cn } from '@/lib/cn'
import type { Ajuste, Marcacao, SolicitarAjuste, TipoAjuste } from '@/types/api'

interface AjusteModalProps {
  open: boolean
  onClose: () => void
  funcionarioId: string
  funcionarioNome?: string
  data: string
  marcacoes: Marcacao[]
  tipoInicial?: TipoAjuste
  alvoInicial?: string
}

export function AjusteModal(props: AjusteModalProps) {
  if (!props.open) return null
  return <AjusteDialog {...props} />
}

function AjusteDialog({ open, onClose, funcionarioId, funcionarioNome, data, marcacoes, tipoInicial = 'Inclusao', alvoInicial }: AjusteModalProps) {
  const toast = useToast()
  const [tipo, setTipo] = useState<TipoAjuste>(tipoInicial)
  const [dataHora, setDataHora] = useState(`${data}T08:00`)
  const [alvo, setAlvo] = useState<string | undefined>(alvoInicial)
  const [justificativa, setJustificativa] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const validas = marcacoesValidas(marcacoes)

  const mutation = useMutation({
    mutationFn: (body: SolicitarAjuste) => http.post<Ajuste>('/api/ajustes', body),
    onSuccess: async (ajuste) => {
      toast.success('Ajuste solicitado', `${ajuste.tipo === 'Inclusao' ? 'Inclusão' : 'Desconsideração'} de ${hora(ajuste.dataHora)} em ${formatDate(ajuste.diaReferencia)} aguarda aprovação.`)
      await invalidarApuracao()
      onClose()
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      setErros(campos)
      const exibidos = ['dataHora', 'marcacaoAlvoId', 'justificativa', 'body']
      if (!Object.keys(campos).some((key) => exibidos.includes(key))) toast.error('Não foi possível solicitar', errorMessage(error))
    },
  })

  const enviar = () => {
    const local: Record<string, string> = {}
    const texto = justificativa.trim()
    if (texto.length < 10) local.justificativa = 'A justificativa precisa ter ao menos 10 caracteres.'
    if (texto.length > 500) local.justificativa = 'A justificativa pode ter até 500 caracteres.'
    if (tipo === 'Inclusao' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dataHora)) local.dataHora = 'Informe a data e a hora da marcação.'
    if (tipo === 'Desconsideracao' && !alvo) local.marcacaoAlvoId = 'Escolha a marcação a desconsiderar.'
    setErros(local)
    if (Object.keys(local).length > 0) return
    mutation.mutate({
      funcionarioId,
      tipo,
      dataHora: tipo === 'Inclusao' ? `${dataHora}:00` : undefined,
      marcacaoAlvoId: tipo === 'Desconsideracao' ? alvo : undefined,
      justificativa: texto,
    })
  }

  const tamanho = justificativa.trim().length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Solicitar ajuste de ponto"
      description={
        <>
          {funcionarioNome ? `${funcionarioNome} · ` : ''}
          <span>{inicial(formatDateLong(data))}</span>
        </>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={enviar} loading={mutation.isPending} icon={<Send className="size-4" />}>
            Enviar para aprovação
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Segmented
          full
          ariaLabel="Tipo de ajuste"
          value={tipo}
          onChange={setTipo}
          options={[
            { value: 'Inclusao', label: 'Incluir marcação', icon: <CirclePlus className="size-4" /> },
            { value: 'Desconsideracao', label: 'Desconsiderar marcação', icon: <Eraser className="size-4" /> },
          ]}
        />

        {tipo === 'Inclusao' ? (
          <Input
            type="datetime-local"
            label="Data e hora da marcação"
            value={dataHora}
            onChange={(event) => setDataHora(event.target.value)}
            error={erros.dataHora}
            hint="Use a hora em que a entrada ou saída realmente aconteceu. Marcações no futuro não são aceitas."
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-fg">Qual marcação desconsiderar?</p>
            {validas.length === 0 ? (
              <Alert tone="neutral">Não há marcações válidas neste dia para desconsiderar.</Alert>
            ) : (
              <div role="radiogroup" aria-label="Marcação a desconsiderar" className="flex flex-wrap gap-2">
                {validas.map((m) => {
                  const ativo = alvo === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => setAlvo(m.id)}
                      className={cn(
                        'rounded-xl border px-3.5 py-2 font-mono text-sm font-semibold tabular transition',
                        ativo ? 'border-danger/50 bg-danger/10 text-danger line-through' : 'border-line-2 bg-surface text-fg hover:border-brand-400',
                      )}
                    >
                      {hora(m.dataHora)}
                      <span className="ml-2 font-sans text-[0.68rem] font-medium text-fg-3 no-underline">{m.origem === 'Registro' ? `NSR ${m.nsr}` : 'incluída'}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {erros.marcacaoAlvoId && <p className="text-xs font-medium text-danger">{erros.marcacaoAlvoId}</p>}
          </div>
        )}

        <Textarea
          label="Justificativa"
          value={justificativa}
          maxLength={500}
          onChange={(event) => setJustificativa(event.target.value)}
          placeholder="Explique o que aconteceu, por exemplo: esqueci de registrar a saída do almoço."
          error={erros.justificativa}
          aside={<span className={cn('text-xs tabular', tamanho > 0 && tamanho < 10 ? 'text-warn' : 'text-fg-3')}>{tamanho}/500</span>}
          hint="De 10 a 500 caracteres. O pedido fica registrado com seu nome e passa por aprovação."
        />
        {erros.body && <Alert tone="danger">{erros.body}</Alert>}
      </div>
    </Modal>
  )
}
