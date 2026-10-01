import { cn } from '@/shared/lib/cn'

/** Punto de color con etiqueta, para estados binarios (activo / inactivo). */
export function StatusDot({ on, children }: { on: boolean; children: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className={cn('size-2.5 rounded-full', on ? 'bg-success' : 'bg-muted')} />
      <span className={on ? 'text-ink' : 'text-ink-soft'}>{children}</span>
    </span>
  )
}
