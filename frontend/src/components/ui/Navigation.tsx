import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}

export function Tabs<T extends string>({ items, value, onChange, className, size = 'md' }: TabsProps<T>) {
  const id = useId()
  return (
    <div role="tablist" className={cn('scrollbar-none flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 font-semibold transition-colors',
              size === 'sm' ? 'px-3 py-2 text-[0.84rem]' : 'px-4 py-2.5 text-sm',
              active ? 'text-fg' : 'text-fg-3 hover:text-fg-2',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-[0.68rem] leading-5', active ? 'bg-brand-500/12 text-brand-600 dark:text-brand-300' : 'bg-surface-2 text-fg-3')}>
                {item.count}
              </span>
            )}
            {active && <motion.span layoutId={`tab-${id}`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-gradient" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          </button>
        )
      })}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
  full?: boolean
  ariaLabel?: string
}

export function Segmented<T extends string>({ options, value, onChange, className, size = 'md', full, ariaLabel }: SegmentedProps<T>) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex rounded-xl border border-line bg-surface-2 p-1', full && 'flex w-full', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex items-center justify-center gap-1.5 rounded-[9px] font-semibold whitespace-nowrap transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              full && 'flex-1',
              active ? 'text-fg' : 'text-fg-3 hover:text-fg-2',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[9px] border border-line bg-surface shadow-soft"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, children, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
            className={cn(
              'absolute top-full z-[60] mt-2 min-w-56 origin-top overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-float',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
              className,
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DropdownItem({ icon, children, onClick, danger, hint }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; danger?: boolean; hint?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors',
        danger ? 'text-danger hover:bg-danger/10' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
      )}
    >
      {icon && <span className="text-current opacity-80">{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint}
    </button>
  )
}

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({ page, pageSize, total, onChange, className }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null

  const numbers: (number | 'gap')[] = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) numbers.push(p)
    else if (numbers[numbers.length - 1] !== 'gap') numbers.push('gap')
  }

  const button = 'grid h-9 min-w-9 place-items-center rounded-xl px-2 text-sm font-semibold transition-colors'

  return (
    <nav aria-label="Paginação" className={cn('flex items-center justify-between gap-3', className)}>
      <p className="text-sm text-fg-3">
        {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)} className={cn(button, 'text-fg-2 hover:bg-surface-2 disabled:opacity-40')}>
          <ChevronLeft className="size-4" />
        </button>
        {numbers.map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-fg-3">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? 'page' : undefined}
              onClick={() => onChange(n)}
              className={cn(button, n === page ? 'bg-brand-500 text-white shadow-brand' : 'text-fg-2 hover:bg-surface-2')}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" aria-label="Próxima página" disabled={page >= pages} onClick={() => onChange(page + 1)} className={cn(button, 'text-fg-2 hover:bg-surface-2 disabled:opacity-40')}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  )
}
