import { useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/labels'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface shadow-soft', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="min-w-0">
        <h3 className="text-[0.98rem] font-bold text-fg">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-fg-3">{description}</p>}
      </div>
      {action}
    </div>
  )
}

const badgeTones: Record<Tone | 'new', string> = {
  neutral: 'bg-surface-2 text-fg-2 border-line',
  brand: 'bg-brand-500/10 text-brand-600 border-brand-500/20 dark:text-brand-300',
  ok: 'bg-ok/10 text-ok border-ok/20',
  warn: 'bg-warn/10 text-[#955800] border-warn/25 dark:text-warn',
  danger: 'bg-danger/10 text-danger border-danger/20',
  info: 'bg-info/10 text-info border-info/20',
  night: 'bg-night/10 text-night border-night/20 dark:text-[#a5a8ff]',
  new: 'bg-glow-gradient text-white border-transparent',
}

export function Badge({ tone = 'neutral', className, children, dot, title }: { tone?: Tone | 'new'; className?: string; children: ReactNode; dot?: boolean; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold leading-5 whitespace-nowrap', badgeTones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-2 bg-surface-2 px-1.5 font-sans text-[0.68rem] font-semibold text-fg-3', className)}>
      {children}
    </kbd>
  )
}

export function Tooltip({ label, children, side = 'top', className }: { label: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'right'; className?: string }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const positions = {
    top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
    right: 'left-full top-1/2 ml-3 -translate-y-1/2',
  }
  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => {
        timer.current = window.setTimeout(() => setOpen(true), 250)
      }}
      onMouseLeave={() => {
        window.clearTimeout(timer.current)
        setOpen(false)
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.14 }}
            className={cn(
              'pointer-events-none absolute z-[70] w-max max-w-72 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs leading-snug font-medium text-white shadow-card dark:bg-white dark:text-ink-900',
              positions[side],
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

export function Progress({ value, className, tone = 'brand', label }: { value: number; className?: string; tone?: 'brand' | 'ok' | 'danger'; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  const colors = { brand: 'bg-brand-gradient', ok: 'bg-ok', danger: 'bg-danger' }
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-3', className)}
    >
      <motion.div
        className={cn('h-full rounded-full', colors[tone])}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 24 }}
      />
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-block size-5', className)} aria-hidden>
      <span className="absolute inset-0 rounded-full border-2 border-current opacity-20" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-current" />
    </span>
  )
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('skeleton rounded-xl', className)} style={style} />
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || '?').slice(0, 2)
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360
  const hue = 150 + (hash % 90)
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-display font-bold text-white uppercase', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 62% 46%), hsl(${(hue + 28) % 360} 70% 36%))`,
      }}
      aria-hidden
    >
      {letters}
    </span>
  )
}

export function Stat({ label, value, hint, icon, tone }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: string }) {
  return (
    <div className="tone flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-soft" style={{ '--tone': tone || 'var(--color-brand-500)' } as CSSProperties}>
      {icon && <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-(--tone-soft) text-(--tone)">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-fg-3 uppercase">{label}</p>
        <div className="font-display text-2xl font-extrabold text-fg tabular">{value}</div>
        {hint && <div className="truncate text-xs text-fg-3">{hint}</div>}
      </div>
    </div>
  )
}

const alertTones: Record<Tone, string> = {
  neutral: 'border-line bg-surface-2',
  brand: 'border-brand-500/25 bg-brand-500/8',
  ok: 'border-ok/25 bg-ok/8',
  warn: 'border-warn/30 bg-warn/10',
  danger: 'border-danger/25 bg-danger/8',
  info: 'border-info/25 bg-info/8',
  night: 'border-night/25 bg-night/8',
}

const alertIconTones: Record<Tone, string> = {
  neutral: 'text-fg-3',
  brand: 'text-brand-500',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  info: 'text-info',
  night: 'text-night',
}

export function Alert({ tone = 'info', title, children, icon, className, action }: { tone?: Tone; title?: ReactNode; children?: ReactNode; icon?: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm text-fg-2', alertTones[tone], className)}>
      {icon && <span className={cn('mt-0.5 shrink-0', alertIconTones[tone])}>{icon}</span>}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-fg">{title}</p>}
        {children && <div className={cn(title ? 'mt-0.5' : undefined)}>{children}</div>}
      </div>
      {action}
    </div>
  )
}
