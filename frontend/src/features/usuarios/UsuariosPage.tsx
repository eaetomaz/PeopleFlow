import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Lock, Pencil, Plus, ShieldUser, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Alert, Avatar, Badge, Card, Skeleton } from '@/components/ui/Display'
import { Input, Select } from '@/components/ui/Field'
import { Combobox } from '@/components/ui/Combobox'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui/toastContext'
import { useFuncionarios, useUsuarios } from '@/hooks/data'
import { useUser } from '@/lib/authContext'
import { errorMessage, fieldErrors, http } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { formatRelative } from '@/lib/format'
import { perfilLabel, perfilTone, perfis } from '@/lib/labels'
import type { Perfil, Usuario } from '@/types/api'

interface Rascunho {
  id?: string
  login: string
  nome: string
  perfil: Perfil
  funcionarioId: string
  senha: string
  ativo: boolean
}

function UsuarioModal({ rascunho, onClose }: { rascunho: Rascunho; onClose: () => void }) {
  const toast = useToast()
  const funcionarios = useFuncionarios({})
  const usuarios = useUsuarios()
  const [form, setForm] = useState(rascunho)
  const [erros, setErros] = useState<Record<string, string>>({})
  const set = <K extends keyof Rascunho>(key: K, value: Rascunho[K]) => setForm((f) => ({ ...f, [key]: value }))
  const exigeFuncionario = form.perfil === 'Gestor' || form.perfil === 'Funcionario'

  const ocupados = useMemo(() => new Set((usuarios.data ?? []).filter((u) => u.id !== form.id && u.funcionarioId).map((u) => u.funcionarioId as string)), [usuarios.data, form.id])
  const opcoes = useMemo(
    () => [
      { value: '', label: 'Sem funcionário', description: 'Só para Admin e RH' },
      ...(funcionarios.data ?? []).filter((f) => !ocupados.has(f.id)).map((f) => ({ value: f.id, label: f.nome, description: `${f.matricula} · ${f.empresa}`, keywords: f.cargo })),
    ],
    [funcionarios.data, ocupados],
  )

  const mutation = useMutation({
    mutationFn: () =>
      form.id
        ? http.put<Usuario>(`/api/usuarios/${form.id}`, { nome: form.nome.trim(), perfil: form.perfil, funcionarioId: form.funcionarioId || null, ativo: form.ativo })
        : http.post<Usuario>('/api/usuarios', { login: form.login.trim(), nome: form.nome.trim(), perfil: form.perfil, funcionarioId: form.funcionarioId || null, senha: form.senha }),
    onSuccess: async (u) => {
      toast.success(form.id ? 'Usuário atualizado' : 'Usuário criado', form.id ? u.nome : `@${u.login} entra com a senha informada e será convidado a trocá-la.`)
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      await queryClient.invalidateQueries({ queryKey: ['funcionario'] })
      onClose()
    },
    onError: (error) => {
      const campos = fieldErrors(error)
      setErros({ ...campos, geral: Object.keys(campos).length ? '' : errorMessage(error) })
    },
  })

  const salvar = () => {
    const local: Record<string, string> = {}
    if (!form.id && !/^[a-zA-Z0-9._-]{3,40}$/.test(form.login.trim())) local.login = 'Use de 3 a 40 letras, números, ponto, hífen ou sublinhado.'
    if (!form.nome.trim()) local.nome = 'Informe o nome.'
    if (!form.id && form.senha.length < 8) local.senha = 'A senha precisa ter ao menos 8 caracteres.'
    if (exigeFuncionario && !form.funcionarioId) local.funcionarioId = 'Gestor e Funcionário precisam estar ligados a um funcionário.'
    setErros(local)
    if (Object.keys(local).length === 0) mutation.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? `Editar @${form.login}` : 'Novo usuário'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} loading={mutation.isPending}>
            {form.id ? 'Salvar' : 'Criar usuário'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Login" value={form.login} disabled={!!form.id} onChange={(e) => set('login', e.target.value.toLowerCase())} error={erros.login} className="font-mono" />
        <Select label="Perfil" value={form.perfil} onChange={(e) => set('perfil', e.target.value as Perfil)} options={perfis.map((p) => ({ value: p, label: perfilLabel[p] }))} error={erros.perfil} />
        <Input label="Nome" wrapperClassName="sm:col-span-2" value={form.nome} onChange={(e) => set('nome', e.target.value)} error={erros.nome} />
        <Combobox
          className="sm:col-span-2"
          label={exigeFuncionario ? 'Funcionário (obrigatório)' : 'Funcionário'}
          options={opcoes}
          value={form.funcionarioId}
          onChange={(v) => {
            set('funcionarioId', v)
            const escolhido = funcionarios.data?.find((f) => f.id === v)
            if (escolhido && !form.nome.trim()) set('nome', escolhido.nome)
          }}
          placeholder="Sem funcionário"
          searchPlaceholder="Buscar funcionário"
          error={erros.funcionarioId}
        />
        {!form.id && <Input label="Senha inicial" type="text" value={form.senha} onChange={(e) => set('senha', e.target.value)} error={erros.senha} hint="Ao menos 8 caracteres. A pessoa será convidada a trocar." className="font-mono" wrapperClassName="sm:col-span-2" />}
        {form.id && <Switch className="sm:col-span-2" checked={form.ativo} onChange={(v) => set('ativo', v)} label="Usuário ativo" description="Usuários inativos não conseguem entrar." />}
        {erros.geral && (
          <Alert tone="danger" className="sm:col-span-2">
            {erros.geral}
          </Alert>
        )}
      </div>
    </Modal>
  )
}

function RedefinirSenhaModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const toast = useToast()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => http.post(`/api/usuarios/${usuario.id}/redefinir-senha`, { novaSenha: senha }),
    onSuccess: async () => {
      toast.success('Senha redefinida', `@${usuario.login} vai entrar com a nova senha e ser convidado a trocá-la. Sessões abertas foram encerradas.`)
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      onClose()
    },
    onError: (error) => setErro(errorMessage(error)),
  })
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Redefinir senha"
      description={`${usuario.nome} · @${usuario.login}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={mutation.isPending}
            icon={<KeyRound className="size-4" />}
            onClick={() => {
              if (senha.length < 8) {
                setErro('A senha precisa ter ao menos 8 caracteres.')
                return
              }
              mutation.mutate()
            }}
          >
            Redefinir
          </Button>
        </>
      }
    >
      <Input label="Nova senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="font-mono" error={erro ?? undefined} hint="Também desbloqueia o usuário, se ele estiver bloqueado." />
    </Modal>
  )
}

export default function UsuariosPage() {
  const eu = useUser()
  const usuarios = useUsuarios()
  const [editando, setEditando] = useState<Rascunho | null>(null)
  const [senha, setSenha] = useState<Usuario | null>(null)

  const columns: Column<Usuario>[] = [
    {
      key: 'nome',
      header: 'Usuário',
      cell: (u) => (
        <span className="flex items-center gap-3">
          <Avatar name={u.nome} size={32} />
          <span className="min-w-0">
            <span className="block font-semibold">
              {u.nome} {u.id === eu.id && <span className="text-xs font-normal text-fg-3">(você)</span>}
            </span>
            <span className="block font-mono text-xs text-fg-3">@{u.login}</span>
          </span>
        </span>
      ),
    },
    { key: 'perfil', header: 'Perfil', cell: (u) => <Badge tone={perfilTone[u.perfil]}>{perfilLabel[u.perfil]}</Badge> },
    { key: 'funcionario', header: 'Funcionário', cell: (u) => <span className="text-fg-2">{u.funcionario ?? '—'}</span> },
    {
      key: 'status',
      header: 'Situação',
      cell: (u) => (
        <span className="flex flex-wrap gap-1">
          <Badge tone={u.ativo ? 'ok' : 'neutral'} dot>
            {u.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
          {u.senhaPadrao && <Badge tone="warn">Senha inicial</Badge>}
          {u.bloqueado && (
            <Badge tone="danger">
              <Lock className="size-3" /> Bloqueado
            </Badge>
          )}
        </span>
      ),
    },
    { key: 'acesso', header: 'Último acesso', cell: (u) => <span className="text-fg-2">{formatRelative(u.ultimoAcessoEm)}</span> },
    {
      key: 'acoes',
      header: '',
      align: 'right',
      cell: (u) => (
        <span className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${u.login}`} onClick={() => setEditando({ id: u.id, login: u.login, nome: u.nome, perfil: u.perfil, funcionarioId: u.funcionarioId ?? '', senha: '', ativo: u.ativo })}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Redefinir senha de ${u.login}`} onClick={() => setSenha(u)}>
            <KeyRound className="size-4" />
          </Button>
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Quem entra no PeopleFlow e com qual perfil."
        icon={<ShieldUser className="size-6" />}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditando({ login: '', nome: '', perfil: 'Funcionario', funcionarioId: '', senha: '', ativo: true })}>
            Novo usuário
          </Button>
        }
      />
      <Alert tone="neutral" className="mb-5">
        Admin tem acesso total. RH gerencia cadastros e apuração de todas as empresas. Gestor vê e aprova a própria equipe. Funcionário registra ponto e consulta o próprio espelho.
      </Alert>
      {usuarios.isError ? (
        <Card>
          <ErrorState description={errorMessage(usuarios.error)} onRetry={() => usuarios.refetch()} />
        </Card>
      ) : !usuarios.data ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <Table minWidth={820} columns={columns} rows={usuarios.data} rowKey={(u) => u.id} rowClassName={(u) => (u.ativo ? undefined : 'opacity-65')} empty={<EmptyState icon={<UserPlus className="size-7" />} title="Nenhum usuário" />} />
      )}
      {editando && <UsuarioModal rascunho={editando} onClose={() => setEditando(null)} />}
      {senha && <RedefinirSenhaModal usuario={senha} onClose={() => setSenha(null)} />}
    </div>
  )
}
