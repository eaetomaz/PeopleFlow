import { motion } from 'motion/react'
import { ArrowLeft, Compass } from 'lucide-react'
import { LinkButton } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex max-w-md flex-col items-center text-center">
        <motion.span
          initial={{ rotate: -30, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="grid size-20 place-items-center rounded-3xl bg-brand-500/10 text-brand-500"
        >
          <Compass className="size-10" />
        </motion.span>
        <p className="mt-6 font-display text-6xl font-extrabold text-gradient">404</p>
        <h1 className="mt-2 text-2xl font-extrabold">Página não encontrada</h1>
        <p className="mt-2 text-fg-2">O endereço pode ter mudado, ou o registro não existe mais.</p>
        <LinkButton to="/" className="mt-7" icon={<ArrowLeft className="size-4" />}>
          Voltar ao painel
        </LinkButton>
      </div>
    </div>
  )
}
