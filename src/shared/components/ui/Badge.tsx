import type { ReactNode } from 'react'

export type BadgeTone = 'green' | 'teal' | 'blue' | 'purple' | 'amber' | 'red' | 'gray'

const TONES: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  teal: 'bg-teal-50 text-teal-800 border-teal-200/80',
  blue: 'bg-sky-50 text-sky-800 border-sky-200/80',
  purple: 'bg-purple-50 text-purple-800 border-purple-200/80',
  amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
  red: 'bg-rose-50 text-rose-800 border-rose-200/80',
  gray: 'bg-slate-100/90 text-slate-700 border-slate-200/80',
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  )
}
