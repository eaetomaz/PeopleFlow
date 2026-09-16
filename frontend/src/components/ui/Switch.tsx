import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  const id = useId()
  return (
    <div className={cn('flex items-center justify-between gap-4', disabled && 'opacity-60', className)}>
      {(label || description) && (
        <label htmlFor={id} className="flex cursor-pointer flex-col">
          {label && <span className="text-sm font-semibold text-fg">{label}</span>}
          {description && <span className="text-xs text-fg-3">{description}</span>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300',
          checked ? 'bg-brand-500' : 'bg-surface-3',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          className={cn('size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]', checked ? 'ml-auto' : 'ml-0')}
        />
      </button>
    </div>
  )
}
