import type { CSSProperties, ReactNode } from 'react'
import { useInView } from '@/hooks/ui'
import { cn } from '@/lib/cn'

interface RevealProps {
  children: ReactNode
  delay?: number
  variant?: 'up' | 'left' | 'right' | 'scale'
  className?: string
  as?: 'div' | 'li' | 'section'
}

export function Reveal({ children, delay = 0, variant = 'up', className, as = 'div' }: RevealProps) {
  const [ref, visible] = useInView<HTMLDivElement>()
  const Tag = as as 'div'
  return (
    <Tag ref={ref} className={cn('reveal', `reveal-${variant}`, visible && 'is-visible', className)} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  )
}
