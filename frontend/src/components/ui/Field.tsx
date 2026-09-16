import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  htmlFor?: string
  className?: string
  children: ReactNode
  aside?: ReactNode
}

export function Field({ label, hint, error, htmlFor, className, children, aside }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || aside) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">
              {label}
            </label>
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? (
        <p role="alert" className="animate-fade-up text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-3">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  leading?: ReactNode
  trailing?: ReactNode
  wrapperClassName?: string
  aside?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leading, trailing, className, wrapperClassName, id, aside, ...props },
  ref,
) {
  const generated = useId()
  const inputId = id || generated
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName} aside={aside}>
      <div className="relative flex items-center">
        {leading && <span className="pointer-events-none absolute left-3.5 text-fg-3">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn('field-input', Boolean(leading) && 'pl-10', Boolean(trailing) && 'pr-11', className)}
          {...props}
        />
        {trailing && <span className="absolute right-2 flex items-center">{trailing}</span>}
      </div>
    </Field>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  wrapperClassName?: string
  aside?: ReactNode
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, id, aside, ...props },
  ref,
) {
  const generated = useId()
  const inputId = id || generated
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName} aside={aside}>
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn('field-input min-h-28 resize-y leading-relaxed', className)}
        {...props}
      />
    </Field>
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  options: { value: string; label: string }[]
  wrapperClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, className, wrapperClassName, id, ...props },
  ref,
) {
  const generated = useId()
  const inputId = id || generated
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={wrapperClassName}>
      <div className="relative">
        <select ref={ref} id={inputId} className={cn('field-input appearance-none pr-10', className)} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
      </div>
    </Field>
  )
})
