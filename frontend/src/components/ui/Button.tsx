import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'dark' | 'outline-light'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const base =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-(--ease-out-soft) active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-gradient text-white shadow-brand hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-14px_rgba(13,148,136,0.8)]',
  secondary:
    'border border-line-2 bg-surface text-fg shadow-soft hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-300 dark:hover:border-brand-500/50',
  ghost: 'text-fg-2 hover:bg-surface-2 hover:text-fg',
  soft: 'bg-brand-500/10 text-brand-600 hover:bg-brand-500/15 dark:text-brand-300',
  danger: 'bg-danger text-white hover:bg-[#d23b40] shadow-[0_10px_24px_-12px_rgba(229,72,77,0.7)]',
  dark: 'bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-white/90',
  'outline-light': 'border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/35 hover:-translate-y-0.5',
}

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs rounded-lg',
  sm: 'h-9 px-3.5 text-sm rounded-[10px]',
  md: 'h-11 px-5 text-[0.94rem] rounded-xl',
  lg: 'h-13 px-7 text-base rounded-[14px]',
  icon: 'size-10 rounded-xl',
  'icon-sm': 'size-8 rounded-lg',
}

function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', shine = false) {
  return cn(base, variants[variant], sizes[size], shine && 'btn-shine')
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  shine?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, shine, icon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(buttonClasses(variant, size, shine), className)} disabled={disabled || loading} {...props}>
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  shine?: boolean
  icon?: ReactNode
}

export function LinkButton({ variant = 'primary', size = 'md', shine, icon, className, children, ...props }: LinkButtonProps) {
  return (
    <Link className={cn(buttonClasses(variant, size, shine), className)} {...props}>
      {icon}
      {children}
    </Link>
  )
}
