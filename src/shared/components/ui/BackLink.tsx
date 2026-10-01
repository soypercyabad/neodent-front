import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

/** Enlace de vuelta a la pantalla anterior con icono estilizado y micro-interacción. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group mb-4 inline-flex items-center gap-2 print:hidden text-[0.92rem] font-semibold text-ink-soft hover:text-brand transition-colors"
    >
      <span className="flex size-7 items-center justify-center rounded-lg border border-line bg-surface shadow-xs transition-transform group-hover:-translate-x-1 group-hover:border-brand/30 group-hover:bg-brand-soft/50 text-ink-soft group-hover:text-brand">
        <Icon name="arrowLeft" size={15} strokeWidth={2.2} />
      </span>
      <span>{children}</span>
    </Link>
  )
}
