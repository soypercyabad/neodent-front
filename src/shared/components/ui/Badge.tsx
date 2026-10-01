import type { ReactNode } from 'react'

export type BadgeTone = 'green' | 'teal' | 'blue' | 'amber' | 'red' | 'gray'

const TONES: Record<BadgeTone, string> = {
  green: 'bg-success-soft text-success',
  teal: 'bg-success-soft/60 text-success',
  blue: 'bg-brand-soft text-brand',
  amber: 'bg-warn-soft text-warn',
  red: 'bg-danger-soft text-danger',
  gray: 'bg-neutral-badge-soft text-neutral-badge',
}

/** Etiqueta de estado en forma de píldora. */
export function Badge({
  tone = 'gray',
  className = '',
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.82rem] font-bold whitespace-nowrap ${TONES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  )
}
