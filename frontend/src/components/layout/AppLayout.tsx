import { useEffect, useState, type ComponentType } from 'react'
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardCheck,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  ScrollText,
  Sheet,
  ShieldUser,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { Avatar, Badge, Tooltip } from '@/components/ui/Display'
import { Dropdown, DropdownItem } from '@/components/ui/Navigation'
import { Drawer } from '@/components/ui/Modal'
import { useAjustes } from '@/hooks/data'
import { useLocalStorage, useMediaQuery } from '@/hooks/ui'
import { useAuth, usePermissoes } from '@/lib/authContext'
import { useEmpresa } from '@/lib/empresaContext'
import { perfilLabel, perfilTone } from '@/lib/labels'
import { cn } from '@/lib/cn'
import { ThemeToggle } from './ThemeToggle'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  badge?: number
}

function SidebarLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-xl text-[0.9rem] font-semibold transition-colors',
          collapsed ? 'w-10 justify-center' : 'px-3',
          isActive ? 'text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span layoutId={`sidebar-active${onNavigate ? '-m' : ''}`} className="absolute inset-0 rounded-xl border border-line bg-surface shadow-soft" transition={{ type: 'spring', stiffness: 500, damping: 38 }}>
              <span className="absolute top-1/2 -left-[13px] h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" />
            </motion.span>
          )}
          <Icon className={cn('relative size-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110', isActive && 'text-brand-500')} />
          {!collapsed && <span className="relative flex-1 truncate">{item.label}</span>}
          {item.badge ? (
            <span
              className={cn(
                'relative grid min-w-5 animate-pop place-items-center rounded-full bg-warn px-1 text-[0.66rem] leading-5 font-bold text-white tabular',
                collapsed && 'absolute -top-1 -right-1 min-w-4 text-[0.6rem] leading-4',
              )}
              aria-label={`${item.badge} pendentes`}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
  return collapsed ? (
    <Tooltip label={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  )
}

function useSections() {
  const { user, admin, cadastros, gestao, temPonto } = usePermissoes()
  const { empresaId } = useEmpresa()
  const pendentes = useAjustes('Pendente', empresaId, gestao)
  const aDecidir = (pendentes.data ?? []).filter((a) => a.podeDecidir).length

  const sections: { title?: string; items: NavItem[] }[] = [{ title: 'Visão geral', items: [{ to: '/', label: 'Painel', icon: LayoutDashboard, end: true }] }]
  if (temPonto)
    sections.push({
      title: 'Meu ponto',
      items: [
        { to: '/ponto', label: 'Registrar ponto', icon: Fingerprint, end: true },
        { to: '/ponto/espelho', label: 'Espelho de ponto', icon: ScrollText },
        { to: `/banco-horas/${user.funcionarioId}`, label: 'Meu banco de horas', icon: PiggyBank, end: true },
      ],
    })
  if (gestao)
    sections.push({
      title: 'Gestão',
      items: [
        { to: '/aprovacoes', label: 'Aprovações', icon: ClipboardCheck, badge: aDecidir },
        { to: '/apuracao', label: 'Apuração', icon: Sheet },
        { to: '/banco-horas', label: 'Banco de horas', icon: Wallet, end: true },
      ],
    })
  if (gestao) {
    const items: NavItem[] = [{ to: '/funcionarios', label: 'Funcionários', icon: Users }]
    if (cadastros) items.push({ to: '/jornadas', label: 'Jornadas', icon: CalendarClock }, { to: '/empresas', label: 'Empresas', icon: Building2 })
    sections.push({ title: 'Cadastros', items })
  }
  if (admin) sections.push({ title: 'Administração', items: [{ to: '/usuarios', label: 'Usuários', icon: ShieldUser }] })
  return sections
}

function SidebarContent({ collapsed, onNavigate, onToggle }: { collapsed: boolean; onNavigate?: () => void; onToggle?: () => void }) {
  const sections = useSections()
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center' : 'px-5')}>{collapsed ? <LogoMark size={34} /> : <Logo to="/" />}</div>
      <nav aria-label="Menu principal" className={cn('flex-1 overflow-y-auto pt-3 pb-4', collapsed ? 'px-3' : 'px-4')}>
        {sections.map((section, i) => (
          <div key={section.title ?? i} className={cn(i > 0 && 'mt-6')}>
            {section.title &&
              (collapsed ? i > 0 && <div className="mx-auto mb-3 h-px w-6 bg-line" /> : <p className="mb-2 px-3 text-[0.68rem] font-bold tracking-[0.12em] text-fg-3 uppercase">{section.title}</p>)}
            <div className={cn('flex flex-col gap-0.5', collapsed && 'items-center')}>
              {section.items.map((item) => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className={cn('flex shrink-0 flex-col gap-0.5 border-t border-line py-3', collapsed ? 'items-center px-3' : 'px-4')}>
        <SidebarLink item={{ to: '/perfil', label: 'Meu perfil', icon: User }} collapsed={collapsed} onNavigate={onNavigate} />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn('flex h-10 items-center gap-3 rounded-xl text-[0.9rem] font-semibold text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg', collapsed ? 'w-10 justify-center' : 'px-3')}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!collapsed && 'Recolher'}
          </button>
        )}
      </div>
    </div>
  )
}

function EmpresaSwitcher() {
  const { empresa, empresas, podeTrocar, setEmpresaId, empresaId } = useEmpresa()
  const { user } = usePermissoes()
  const nome = empresa?.nomeFantasia ?? user.empresa ?? 'Empresa'
  const dot = <span className="size-2.5 shrink-0 rounded-full ring-2 ring-surface" style={{ backgroundColor: empresa?.cor ?? 'var(--color-brand-500)' }} />

  if (!podeTrocar) {
    if (!user.empresa && !empresa) return null
    return (
      <span className="flex h-10 max-w-64 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold text-fg shadow-soft">
        {dot}
        <span className="truncate">{nome}</span>
      </span>
    )
  }

  return (
    <Dropdown
      align="left"
      className="w-72"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Trocar empresa"
          className="flex h-10 max-w-72 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold text-fg shadow-soft transition hover:border-brand-300 dark:hover:border-brand-500/50"
        >
          {dot}
          <span className="truncate">{nome}</span>
          <ChevronDown className={cn('size-4 shrink-0 text-fg-3 transition-transform', open && 'rotate-180')} />
        </button>
      )}
    >
      {(close) => (
        <div>
          <p className="px-3 pt-2 pb-1.5 text-[0.7rem] font-bold tracking-wider text-fg-3 uppercase">Empresas</p>
          {empresas.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setEmpresaId(e.id)
                close()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-2"
            >
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: e.cor }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{e.nomeFantasia}</span>
                <span className="block truncate text-xs text-fg-3">
                  {e.municipio}/{e.uf} · {e.funcionarios} {e.funcionarios === 1 ? 'funcionário' : 'funcionários'}
                </span>
              </span>
              {e.id === empresaId && <Check className="size-4 text-brand-500" />}
            </button>
          ))}
        </div>
      )}
    </Dropdown>
  )
}

function UserMenu() {
  const { user } = usePermissoes()
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <Dropdown
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2.5 rounded-xl p-1 pr-1 transition-colors hover:bg-surface-2 sm:pr-3" aria-label="Menu da conta">
          <Avatar name={user.nome} size={32} />
          <span className="hidden text-left sm:block">
            <span className="block max-w-36 truncate text-sm leading-tight font-semibold text-fg">{user.nome.split(' ')[0]}</span>
            <span className="block text-[0.7rem] leading-tight text-fg-3">{perfilLabel[user.perfil]}</span>
          </span>
        </button>
      )}
    >
      {(close) => (
        <div className="w-64">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={user.nome} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-fg">{user.nome}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge tone={perfilTone[user.perfil]}>{perfilLabel[user.perfil]}</Badge>
                <span className="truncate text-xs text-fg-3">@{user.login}</span>
              </div>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <DropdownItem
            icon={<User className="size-4" />}
            onClick={() => {
              close()
              navigate('/perfil')
            }}
          >
            Meu perfil
          </DropdownItem>
          <DropdownItem
            danger
            icon={<LogOut className="size-4" />}
            onClick={async () => {
              close()
              await logout()
              navigate('/login', { replace: true })
            }}
          >
            Sair
          </DropdownItem>
        </div>
      )}
    </Dropdown>
  )
}

function SenhaPadraoBanner() {
  const { user } = usePermissoes()
  const location = useLocation()
  const [oculto, setOculto] = useState(() => {
    try {
      return sessionStorage.getItem('peopleflow.senhaAviso') === user.id
    } catch {
      return false
    }
  })
  if (!user.senhaPadrao || oculto || location.pathname === '/perfil') return null
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm">
      <KeyRound className="size-5 shrink-0 text-warn" />
      <p className="flex-1 text-fg-2">
        <span className="font-semibold text-fg">Você ainda usa a senha inicial.</span> Para proteger seus dados, troque-a por uma senha só sua.
      </p>
      <Link to="/perfil" className="rounded-lg px-3 py-1.5 font-semibold text-brand-600 hover:bg-brand-500/10 dark:text-brand-300">
        Trocar senha
      </Link>
      <button
        type="button"
        aria-label="Dispensar aviso"
        onClick={() => {
          setOculto(true)
          try {
            sessionStorage.setItem('peopleflow.senhaAviso', user.id)
          } catch {
            return
          }
        }}
        className="grid size-8 place-items-center rounded-lg text-fg-3 hover:bg-surface hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  )
}

function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export default function AppLayout() {
  const location = useLocation()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, setCollapsed] = useLocalStorage('peopleflow.sidebarCollapsed', false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-screen">
      <a href="#conteudo" className="sr-only z-[100] rounded-lg bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      {desktop && (
        <aside className={cn('fixed inset-y-0 left-0 z-40 border-r border-line bg-bg-tinted transition-[width] duration-300 ease-(--ease-out-soft)', collapsed ? 'w-[76px]' : 'w-[252px]')}>
          <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </aside>
      )}
      <Drawer open={!desktop && mobileOpen} onClose={() => setMobileOpen(false)} side="left" className="bg-bg-tinted" width="min(280px,86vw)" label="Menu">
        <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <div className={cn('transition-[padding] duration-300 ease-(--ease-out-soft)', desktop && (collapsed ? 'pl-[76px]' : 'pl-[252px]'))}>
        <header className="glass sticky top-0 z-30 border-b border-line">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            {!desktop && (
              <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" className="grid size-10 place-items-center rounded-xl text-fg-2 hover:bg-surface-2">
                <Menu className="size-5" />
              </button>
            )}
            <EmpresaSwitcher />
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

        <main id="conteudo" className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <SenhaPadraoBanner />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <FrozenOutlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
