import type { ReactNode } from 'react'

/** Fila etiqueta/valor de una ficha, separada por una línea superior. */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-4 first:border-t-0">
      <span className="text-[0.95rem] text-ink-soft">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  )
}
