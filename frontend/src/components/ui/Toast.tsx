import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ToastContext, type ToastContextValue, type ToastItem, type ToastTone } from './toastContext'

const tones: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: 'text-ok' },
  error: { icon: CircleAlert, className: 'text-danger' },
  info: { icon: Info, className: 'text-info' },
  warning: { icon: TriangleAlert, className: 'text-warn' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((t) => t.id !== id)), [])

  const show = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = ++counter.current
      setItems((current) => [...current.slice(-3), { ...toast, id }])
      window.setTimeout(() => dismiss(id), toast.tone === 'error' ? 7000 : 4800)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (title, description) => show({ tone: 'success', title, description }),
      error: (title, description) => show({ tone: 'error', title, description }),
      info: (title, description) => show({ tone: 'info', title, description }),
      warning: (title, description) => show({ tone: 'warning', title, description }),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6" aria-live="polite">
          <AnimatePresence initial={false}>
            {items.map((toast) => {
              const tone = tones[toast.tone]
              const Icon = tone.icon
              return (
                <motion.div
                  key={toast.id}
                  layout
                  role={toast.tone === 'error' ? 'alert' : 'status'}
                  initial={{ opacity: 0, y: 24, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-float"
                >
                  <Icon className={cn('mt-0.5 size-5 shrink-0', tone.className)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{toast.title}</p>
                    {toast.description && <p className="mt-0.5 text-sm text-fg-2">{toast.description}</p>}
                    {toast.action && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.action?.onClick()
                          dismiss(toast.id)
                        }}
                        className="mt-2 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"
                      >
                        {toast.action.label}
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={() => dismiss(toast.id)} aria-label="Fechar aviso" className="text-fg-3 transition hover:text-fg">
                    <X className="size-4" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
