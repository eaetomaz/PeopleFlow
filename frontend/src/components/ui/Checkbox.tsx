import { useId, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

export function Checkbox({ checked, onChange, label, description, disabled, className }: CheckboxProps) {
  const id = useId()
  return (
    <label htmlFor={id} className={cn('group flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-60', className)}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-md border border-line-2 bg-surface transition-colors checked:border-brand-500 checked:bg-brand-500 group-hover:border-brand-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <motion.span
          initial={false}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          className="pointer-events-none relative text-white"
        >
          <Check className="size-3.5" strokeWidth={3} />
        </motion.span>
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-fg">{label}</span>}
          {description && <span className="text-xs text-fg-3">{description}</span>}
        </span>
      )}
    </label>
  )
}
