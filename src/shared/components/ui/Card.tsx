import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/** Contenedor blanco con borde y radio grande. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-card border border-line bg-surface shadow-card', className)}>
      {children}
    </section>
  )
}
