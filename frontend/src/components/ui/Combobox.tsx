import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ComboOption {
  value: string
  label: string
  description?: string
  keywords?: string
}

interface ComboboxProps {
  options: ComboOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  label?: ReactNode
  className?: string
  buttonClassName?: string
  disabled?: boolean
  error?: string
}

function normalizar(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function Combobox({ options, value, onChange, placeholder = 'Selecione…', searchPlaceholder = 'Buscar…', emptyText = 'Nada encontrado.', label, className, buttonClassName, disabled, error }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()
  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = normalizar(term.trim())
    if (!q) return options
    return options.filter((o) => normalizar(`${o.label} ${o.description ?? ''} ${o.keywords ?? ''}`).includes(q))
  }, [options, term])

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    const timer = window.setTimeout(() => input.current?.focus(), 20)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (option: ComboOption) => {
    onChange(option.value)
    setOpen(false)
    setTerm('')
  }

  return (
    <div ref={root} className={cn('relative flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-fg">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        onClick={() => {
          setOpen((v) => !v)
          setActive(Math.max(0, options.findIndex((o) => o.value === value)))
        }}
        className={cn('field-input flex items-center gap-2 text-left', buttonClassName)}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-fg-3')}>{selected ? selected.label : placeholder}</span>
        {selected?.description && <span className="hidden truncate text-xs text-fg-3 sm:inline">{selected.description}</span>}
        <ChevronsUpDown className="size-4 shrink-0 text-fg-3" />
      </button>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 left-0 z-[65] mt-2 min-w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-float"
          >
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="size-4 text-brand-500" />
              <input
                ref={input}
                value={term}
                onChange={(event) => {
                  setTerm(event.target.value)
                  setActive(0)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setActive((i) => Math.min(filtered.length - 1, i + 1))
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setActive((i) => Math.max(0, i - 1))
                  } else if (event.key === 'Enter') {
                    event.preventDefault()
                    if (filtered[active]) choose(filtered[active])
                  } else if (event.key === 'Escape') {
                    event.stopPropagation()
                    setOpen(false)
                  }
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-11 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-3"
              />
            </div>
            <ul ref={list} role="listbox" className="max-h-72 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-fg-3">{emptyText}</li>
              ) : (
                filtered.map((option, i) => (
                  <li key={option.value} role="option" aria-selected={option.value === value}>
                    <button
                      type="button"
                      data-index={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => choose(option)}
                      className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors', i === active ? 'bg-surface-2 text-fg' : 'text-fg-2')}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{option.label}</span>
                        {option.description && <span className="block truncate text-xs text-fg-3">{option.description}</span>}
                      </span>
                      {option.value === value && <Check className="size-4 text-brand-500" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
