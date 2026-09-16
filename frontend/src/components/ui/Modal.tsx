import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

function useLockScroll(open: boolean) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])
}

const escapeStack: symbol[] = []

function useEscape(open: boolean, onClose: () => void) {
  const ref = useRef(onClose)
  useEffect(() => {
    ref.current = onClose
  })
  useEffect(() => {
    if (!open) return
    const id = Symbol('dialog')
    escapeStack.push(id)
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && escapeStack[escapeStack.length - 1] === id) {
        event.stopPropagation()
        ref.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      const index = escapeStack.indexOf(id)
      if (index >= 0) escapeStack.splice(index, 1)
    }
  }, [open])
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  hideClose?: boolean
}

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md', className, hideClose }: ModalProps) {
  useLockScroll(open)
  useEscape(open, onClose)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-(--app-overlay) backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-float sm:rounded-3xl',
              widths[size],
              className,
            )}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-6">
                <div>
                  {title && <h2 className="text-lg font-bold text-fg">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-fg-2">{description}</p>}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className="-mr-2 -mt-1 grid size-9 place-items-center rounded-xl text-fg-3 transition hover:rotate-90 hover:bg-surface-2 hover:text-fg"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/60 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  side?: 'left' | 'right'
  className?: string
  width?: string
  label?: string
}

export function Drawer({ open, onClose, title, children, side = 'right', className, width = 'min(380px,88vw)', label }: DrawerProps) {
  useLockScroll(open)
  useEscape(open, onClose)
  const offset = side === 'right' ? '100%' : '-100%'

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-(--app-overlay) backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: offset }}
            animate={{ x: 0 }}
            exit={{ x: offset }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className={cn(
              'absolute top-0 bottom-0 flex flex-col border-line bg-surface shadow-float',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className,
            )}
            style={{ width }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="text-base font-bold">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-xl text-fg-3 hover:bg-surface-2 hover:text-fg">
                  <X className="size-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirmar', danger, loading }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-sm text-fg-2">{description}</p>}
    </Modal>
  )
}
