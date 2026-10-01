import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './Icon'

export interface Column {
  label: string
  align?: 'left' | 'center' | 'right'
}

/**
 * Tabla de datos. El estilo de celdas se aplica desde aquí con selectores
 * descendentes, así las filas de cada feature sólo aportan contenido.
 */
export function Table({ columns, children }: { columns: Column[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse text-[0.95rem]',
          '[&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-4 [&_td]:align-middle [&_td]:whitespace-nowrap',
        )}
      >
        <thead>
          <tr className="border-y border-line bg-[#F8FAFD]">
            {columns.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={cn(
                  'border-y border-line bg-[#F8FAFD] px-4 py-3.5 text-[0.78rem] font-bold tracking-wider text-muted uppercase',
                  c.align === 'center'
                    ? 'text-center'
                    : c.align === 'right'
                      ? 'text-right'
                      : 'text-left',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

/** Fila que agrupa las siguientes (por ejemplo, un día). */
export function SeparatorRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="!bg-alt !py-2.5 text-[0.82rem] font-bold text-ink-soft"
      >
        {children}
      </td>
    </tr>
  )
}

/** Celda de acciones de una fila (por defecto centrada bajo su cabecera). */
export function ActionsCell({
  children,
  align = 'center',
}: {
  children: ReactNode
  align?: 'left' | 'center' | 'right'
}) {
  return (
    <td className={cn(align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left')}>
      <div
        className={cn(
          'flex items-center gap-1.5',
          align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start',
        )}
      >
        {children}
      </div>
    </td>
  )
}

/** Pie de la tabla: resumen a la izquierda y, si se pasa, controles a la derecha. */
export function TableFoot({ summary, children }: { summary: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <span className="text-[0.85rem] text-muted">{summary}</span>
      {children}
    </div>
  )
}

interface TableStateProps {
  colSpan: number
  loading?: boolean
  error?: string | null
  empty?: boolean
  loadingLabel?: string
  emptyLabel?: string
}

/** Fila única para los estados de carga, error y vacío. Devuelve null si hay datos. */
export function TableState({
  colSpan,
  loading,
  error,
  empty,
  loadingLabel = 'Cargando…',
  emptyLabel = 'No hay resultados.',
}: TableStateProps) {
  if (!loading && !error && !empty) return null

  const [icon, text, tone] = error
    ? (['warning', error, 'text-danger'] as const)
    : loading
      ? (['spinner', loadingLabel, 'text-muted'] as const)
      : (['file', emptyLabel, 'text-muted'] as const)

  return (
    <tr>
      <td colSpan={colSpan} className="!py-12 text-center">
        <span className={cn('inline-flex items-center gap-2', tone)}>
          <Icon name={icon} size={18} className={loading ? 'animate-spin' : undefined} />
          {text}
        </span>
      </td>
    </tr>
  )
}
