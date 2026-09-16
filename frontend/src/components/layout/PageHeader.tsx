import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  crumbs?: Crumb[]
  icon?: ReactNode
  tone?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, crumbs, icon, tone, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-7', className)}>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Trilha" className="mb-4 flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 text-fg-3" />}
              {crumb.to ? (
                <Link to={crumb.to} className="font-medium text-fg-3 transition-colors hover:text-fg">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-fg-2">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {icon && (
            <motion.span
              initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="tone grid size-13 shrink-0 place-items-center rounded-2xl bg-(--tone-soft) text-(--tone) ring-1 ring-(--tone-line)"
              style={{ '--tone': tone || 'var(--color-brand-500)' } as CSSProperties}
            >
              {icon}
            </motion.span>
          )}
          <div className="min-w-0">
            <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-tight text-fg sm:text-[1.85rem]">{title}</h1>
            {description && <div className="mt-1 text-[0.95rem] text-fg-2">{description}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
