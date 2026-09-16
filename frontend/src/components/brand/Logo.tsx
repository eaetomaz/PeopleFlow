import { Link } from 'react-router'
import { cn } from '@/lib/cn'

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center rounded-[30%] bg-brand-gradient shadow-[0_8px_22px_-8px_rgba(13,148,136,0.85)] transition-transform duration-500 ease-(--ease-spring)', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78} aria-hidden>
        <circle cx="40" cy="21" r="7" fill="#fff" fillOpacity="0.5" />
        <path d="M28 49c0-8 5.4-14 12-14s12 6 12 14z" fill="#fff" fillOpacity="0.5" />
        <circle cx="26" cy="24" r="8.5" fill="#fff" />
        <path d="M11 53c0-9.4 6.7-16.5 15-16.5S41 43.6 41 53z" fill="#fff" />
      </svg>
    </span>
  )
}

export function Logo({ to = '/', className, light, compact }: { to?: string; className?: string; light?: boolean; compact?: boolean }) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-2.5', light ? 'text-white' : 'text-fg', className)} aria-label="PeopleFlow, painel">
      <LogoMark className="group-hover:-rotate-6 group-hover:scale-105" />
      {!compact && (
        <span className="font-display text-[1.14rem] font-extrabold tracking-tight">
          People<span className={light ? 'text-brand-200' : 'text-gradient'}>Flow</span>
        </span>
      )}
    </Link>
  )
}
