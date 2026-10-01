import { cn } from '@/shared/lib/cn'
import { Icon } from './Icon'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

/**
 * Base sin color de fondo: cada estado aporta el suyo. Ponerlo aquí haría que
 * el fondo de la página activa dependiese del orden de las reglas CSS.
 */
const cell = 'grid size-8.5 place-items-center rounded-lg border text-xs font-bold transition select-none'
const idle = 'cursor-pointer border-line bg-surface text-ink-soft hover:border-brand/40 hover:bg-alt hover:text-ink'

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const effectiveTotal = Math.max(totalPages, 1)

  const getPageNumbers = () => {
    if (effectiveTotal <= 7) {
      return Array.from({ length: effectiveTotal }, (_, i) => i + 1)
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', effectiveTotal]
    }
    if (page >= effectiveTotal - 3) {
      return [1, '...', effectiveTotal - 4, effectiveTotal - 3, effectiveTotal - 2, effectiveTotal - 1, effectiveTotal]
    }
    return [1, '...', page - 1, page, page + 1, '...', effectiveTotal]
  }

  const items = getPageNumbers()

  return (
    <nav aria-label="Paginación" className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(cell, idle, 'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface disabled:hover:border-line')}
      >
        <Icon name="chevronLeft" size={15} strokeWidth={2.2} />
      </button>

      {items.map((item, idx) => {
        if (item === '...') {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="grid size-8.5 place-items-center text-xs font-semibold text-muted select-none"
            >
              …
            </span>
          )
        }
        const p = item as number
        return (
          <button
            key={p}
            type="button"
            aria-label={`Página ${p}`}
            aria-current={p === page ? 'page' : undefined}
            disabled={effectiveTotal <= 1}
            onClick={() => onChange(p)}
            className={cn(
              cell,
              p === page
                ? 'cursor-default border-brand bg-brand text-white shadow-xs'
                : idle,
              effectiveTotal <= 1 && 'cursor-default',
            )}
          >
            {p}
          </button>
        )
      })}

      <button
        type="button"
        aria-label="Página siguiente"
        disabled={page >= effectiveTotal}
        onClick={() => onChange(page + 1)}
        className={cn(cell, idle, 'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface disabled:hover:border-line')}
      >
        <Icon name="chevronRight" size={15} strokeWidth={2.2} />
      </button>
    </nav>
  )
}
