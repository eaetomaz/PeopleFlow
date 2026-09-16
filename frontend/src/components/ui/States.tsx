import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { CircleAlert, FileX2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Skeleton, Spinner } from './Display'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14', className)}
    >
      <div className="relative">
        <span className="absolute inset-0 -z-10 scale-150 rounded-full bg-brand-500/10 blur-2xl" />
        <span className={cn('grid place-items-center rounded-2xl border border-line bg-surface text-brand-500 shadow-card', compact ? 'size-12' : 'size-16')}>
          {icon || <FileX2 className={compact ? 'size-5' : 'size-7'} />}
        </span>
      </div>
      <div className="max-w-sm">
        <h3 className={cn('font-bold text-fg', compact ? 'text-sm' : 'text-lg')}>{title}</h3>
        {description && <p className="mt-1 text-sm text-fg-2">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  className?: string
  compact?: boolean
}

export function ErrorState({ title = 'Não foi possível carregar', description, onRetry, className, compact }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      <span className="grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
        <CircleAlert className="size-7" />
      </span>
      <div className="max-w-sm">
        <h3 className="text-base font-bold text-fg">{title}</h3>
        {description && <p className="mt-1 text-sm text-fg-2">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshCw className="size-4" />}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function LoadingState({ label = 'Carregando…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-fg-3', className)}>
      <Spinner className="size-7 text-brand-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5" style={{ width: `${60 - i * 7}%` }} />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <Skeleton className="size-11" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}
