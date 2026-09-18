import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Clock4,
  Fingerprint,
  Hand,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { Badge, Card, CardHeader, Skeleton } from '@/components/ui/Display'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/ui/States'
import { LinkButton } from '@/components/ui/Button'
import { usePainel } from '@/hooks/data'
import { useCountUp, useInView, useNow } from '@/hooks/ui'
import { usePermissoes } from '@/lib/authContext'
import { useEmpresa } from '@/lib/empresaContext'
import { formatMinutes, formatSigned, signTone } from '@/lib/duracao'
import { competenciaLabel, firstName, formatInteger, greeting, hora } from '@/lib/format'
import { presencaTone } from '@/lib/labels'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { Destaque, Presenca } from '@/types/api'
import { ExtrasDebitosChart } from './Charts'

function StatTile({ label, value, format, icon, tone, hint, index, to }: { label: string; value: number; format: (v: number) => string; icon: ReactNode; tone: string; hint?: ReactNode; index: number; to?: string }) {
  const [ref, visible] = useInView<HTMLDivElement>()
  const animated = useCountUp(value, visible, 900)
  const body = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.045 }}
      className={cn('tone group relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-soft', to && 'transition hover:-translate-y-0.5 hover:border-(--tone-line) hover:shadow-card')}
      style={{ '--tone': tone } as CSSProperties}
    >
      <div className="absolute -top-10 -right-10 size-28 rounded-full bg-(--tone-soft) blur-2xl transition-transform duration-700 group-hover:scale-150" />
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[0.78rem] font-semibold text-fg-3">{label}</p>
        <span className="grid size-8 place-items-center rounded-xl bg-(--tone-soft) text-(--tone)">{icon}</span>
      </div>
      <p className="relative mt-2.5 font-display text-[1.7rem] leading-none font-extrabold tracking-tight text-fg tabular">{format(Math.round(animated))}</p>
      {hint && <div className="relative mt-1.5 text-xs text-fg-3">{hint}</div>}
    </motion.div>
  )
  return to ? (
    <Link to={to} className="block rounded-2xl">
      {body}
    </Link>
  ) : (
    body
  )
}

function PresencaItem({ p, link }: { p: Presenca; link: string }) {
  return (
    <li>
      <Link to={link} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{p.funcionario.nome}</span>
          <span className="block truncate text-xs text-fg-3">{p.funcionario.cargo}</span>
        </span>
        <span className="hidden text-right font-mono text-xs text-fg-2 tabular sm:block">
          {p.primeiraMarcacao ? hora(p.primeiraMarcacao) : '—'}
          <span className="text-fg-3"> / {p.previstoInicio ? hora(p.previstoInicio) : 'sem previsão'}</span>
        </span>
        {p.atrasado && p.status !== 'Ausente' && <Badge tone="warn">Atrasou</Badge>}
        <Badge tone={presencaTone[p.status]} dot className="min-w-24 justify-center">
          {p.status}
        </Badge>
      </Link>
    </li>
  )
}

function Ranking({ itens, tone, sinal }: { itens: Destaque[]; tone: string; sinal: 1 | -1 }) {
  if (itens.length === 0) return <EmptyState compact icon={<BarChart3 className="size-5" />} title="Nada no mês até agora" />
  const max = Math.max(...itens.map((i) => i.minutos))
  return (
    <ul className="flex flex-col">
      {itens.map((item, i) => (
        <motion.li key={item.funcionario.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
          <Link to={`/ponto/espelho/${item.funcionario.id}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-surface-2">
            <span className="w-4 text-center text-xs font-bold text-fg-3">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-fg">{item.funcionario.nome}</span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.span className="block h-full rounded-full" style={{ background: tone }} initial={{ width: 0 }} animate={{ width: `${(item.minutos / max) * 100}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.8 }} />
              </span>
            </span>
            <span className={cn('font-mono text-sm font-semibold tabular', sinal > 0 ? 'text-ok' : 'text-danger')}>{formatSigned(item.minutos * sinal)}</span>
          </Link>
        </motion.li>
      ))}
    </ul>
  )
}

function Relogio() {
  const now = useNow(1000)
  return (
    <span className="font-mono text-[2.4rem] leading-none font-extrabold tracking-tight tabular">
      {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
      <span className="text-[1.3rem] text-white/60">:{String(now.getSeconds()).padStart(2, '0')}</span>
    </span>
  )
}

export default function PainelPage() {
  const { user, gestao, temPonto } = usePermissoes()
  const { empresaId, empresa } = useEmpresa()
  const painel = usePainel(empresaId, !!empresaId || !gestao)
  const p = painel.data
  const equipe = (p?.presencas.length ?? 0) > 1
  const espelhoDe = (id: string) => (id === user.funcionarioId ? '/ponto/espelho' : `/ponto/espelho/${id}`)

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-7 shadow-soft sm:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_90%_at_85%_20%,#000,transparent)]" />
          <div className="absolute -top-24 -right-16 size-80 animate-drift rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.22),transparent_65%)] blur-2xl" />
          <div className="absolute right-60 -bottom-28 size-72 animate-drift rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.16),transparent_65%)] blur-2xl [animation-delay:-6s]" />
        </div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm font-semibold text-fg-3">
              <motion.span animate={{ rotate: [0, 18, -8, 18, 0] }} transition={{ delay: 0.6, duration: 1.2 }} className="inline-grid origin-[70%_80%] text-[#f5a524]">
                <Hand className="size-[18px]" />
              </motion.span>
              {greeting()}, {firstName(user.nome)}!
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-2 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-extrabold tracking-tight">
              {gestao ? (
                <>
                  Como está a equipe <span className="text-gradient">hoje</span>
                </>
              ) : (
                <>
                  Seu ponto <span className="text-gradient">em dia</span>
                </>
              )}
            </motion.h1>
            <p className="mt-1.5 text-fg-2">
              {empresa?.nomeFantasia ?? user.empresa ?? 'Todas as empresas'}
              {p && <> · competência {competenciaLabel(p.competencia)}</>}
            </p>
          </div>
          {temPonto && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-5 rounded-2xl bg-brand-gradient px-5 py-4 text-white shadow-brand">
              <div>
                <p className="text-xs font-semibold text-white/70">Agora</p>
                <Relogio />
              </div>
              <LinkButton to="/ponto" variant="outline-light" icon={<Fingerprint className="size-4" />}>
                Registrar ponto
              </LinkButton>
            </motion.div>
          )}
        </div>
      </section>

      {painel.isError ? (
        <Card>
          <ErrorState description={errorMessage(painel.error)} onRetry={() => painel.refetch()} />
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {!p ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)
            ) : (
              <>
                <StatTile index={0} label="Funcionários ativos" value={p.funcionariosAtivos} format={formatInteger} icon={<Users className="size-4" />} tone="var(--color-brand-500)" hint={`${p.previstosHoje} com jornada hoje`} to={gestao ? '/funcionarios' : undefined} />
                <StatTile index={1} label="Presentes hoje" value={p.presentesHoje} format={formatInteger} icon={<UserCheck className="size-4" />} tone="var(--color-ok)" hint={`de ${p.previstosHoje} previstos`} />
                <StatTile index={2} label="Ausentes" value={p.ausentesHoje} format={formatInteger} icon={<UserX className="size-4" />} tone="var(--color-danger)" hint="sem marcação após a entrada" />
                <StatTile index={3} label="Atrasados" value={p.atrasadosHoje} format={formatInteger} icon={<AlarmClock className="size-4" />} tone="var(--color-warn)" hint="entrada após 5 min do previsto" />
              </>
            )}
          </section>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {!p ? (
              Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)
            ) : (
              <>
                <StatTile index={4} label="Ajustes pendentes" value={p.ajustesPendentes} format={formatInteger} icon={<ClipboardCheck className="size-4" />} tone="var(--color-warn)" hint="aguardando decisão" to={gestao ? '/aprovacoes' : undefined} />
                <StatTile index={5} label="Inconsistências no mês" value={p.inconsistenciasMes} format={formatInteger} icon={<TriangleAlert className="size-4" />} tone="var(--color-warn)" hint={`${p.faltasMes} ${p.faltasMes === 1 ? 'falta' : 'faltas'} no mês`} />
                <StatTile index={6} label="Extras no mês" value={p.extrasMesMinutos} format={formatMinutes} icon={<TrendingUp className="size-4" />} tone="var(--color-extra)" hint="até ontem" />
                <StatTile index={7} label="Débitos no mês" value={p.debitosMesMinutos} format={formatMinutes} icon={<TrendingDown className="size-4" />} tone="var(--color-danger)" hint="atrasos, saídas e faltas" />
                <StatTile
                  index={8}
                  label="Saldo do banco"
                  value={p.saldoBancoMinutos}
                  format={formatSigned}
                  icon={<PiggyBank className="size-4" />}
                  tone="var(--color-info)"
                  hint={<span className={signTone(p.saldoBancoMinutos)}>{p.saldoBancoMinutos >= 0 ? 'crédito acumulado' : 'débito acumulado'}</span>}
                  to={gestao ? '/banco-horas' : user.funcionarioId ? `/banco-horas/${user.funcionarioId}` : undefined}
                />
              </>
            )}
          </section>

          <div className={cn('grid gap-6', equipe && 'xl:grid-cols-[1.5fr_1fr]')}>
            <Card>
              <CardHeader title="Extras e débitos por dia" description="Mês atual, somando a equipe visível" />
              <div className="px-5 pt-5 pb-5">
                {!p ? <Skeleton className="h-[220px]" /> : p.serie.length === 0 ? <EmptyState compact icon={<BarChart3 className="size-5" />} title="O mês acabou de começar" description="Os dias aparecem aqui depois de apurados." /> : <ExtrasDebitosChart serie={p.serie} />}
              </div>
            </Card>
            {equipe && (
              <Card>
                <CardHeader
                  title="Hoje"
                  description="Primeira marcação / início previsto"
                  action={
                    <span className="flex items-center gap-1.5 text-xs text-fg-3">
                      <Clock4 className="size-3.5" />
                      {p ? hora(p.agora) : ''}
                    </span>
                  }
                />
                <div className="max-h-[330px] overflow-y-auto p-2 pt-3">{!p ? <ListSkeleton rows={5} className="p-3" /> : <ul>{p.presencas.map((item) => <PresencaItem key={item.funcionario.id} p={item} link={espelhoDe(item.funcionario.id)} />)}</ul>}</div>
              </Card>
            )}
          </div>

          {!equipe && p && p.presencas[0] && (
            <Card className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="text-sm font-semibold text-fg">Hoje</span>
              <Badge tone={presencaTone[p.presencas[0].status]} dot>
                {p.presencas[0].status}
              </Badge>
              <span className="font-mono text-sm text-fg-2 tabular">
                Primeira marcação {p.presencas[0].primeiraMarcacao ? hora(p.presencas[0].primeiraMarcacao) : '—'} · previsto {p.presencas[0].previstoInicio ? hora(p.presencas[0].previstoInicio) : '—'}
              </span>
              <LinkButton to="/ponto/espelho" variant="ghost" size="sm" className="ml-auto">
                Ver espelho <ArrowRight className="size-4" />
              </LinkButton>
            </Card>
          )}

          {equipe && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Mais horas extras" description="No mês, até ontem" />
                <div className="p-3">{!p ? <ListSkeleton rows={4} className="p-2" /> : <Ranking itens={p.maisExtras} tone="var(--color-extra)" sinal={1} />}</div>
              </Card>
              <Card>
                <CardHeader title="Mais débitos" description="Atrasos, saídas antecipadas e faltas" />
                <div className="p-3">{!p ? <ListSkeleton rows={4} className="p-2" /> : <Ranking itens={p.maisDebitos} tone="var(--color-danger)" sinal={-1} />}</div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
