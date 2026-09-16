import { AnimatePresence, motion } from 'motion/react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/themeContext'
import { cn } from '@/lib/cn'

export function ThemeToggle({ className, light }: { className?: string; light?: boolean }) {
  const { resolved, toggle } = useTheme()
  const dark = resolved === 'dark'
  return (
    <button
      type="button"
      onClick={(event) => toggle({ x: event.clientX, y: event.clientY })}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      title={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      className={cn(
        'relative grid size-10 place-items-center overflow-hidden rounded-xl transition-colors',
        light ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ y: 14, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -14, rotate: 90, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {dark ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
