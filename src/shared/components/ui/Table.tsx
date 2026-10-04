import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './Icon'

export type SortDirection = 'asc' | 'desc' | null

export interface Column<T = string> {
  key?: T
  label: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  className?: string
}

export interface TableProps<T = string> {
  columns: Column<T>[]
  children: ReactNode
  className?: string
  sortColumn?: T | null
  sortDirection?: SortDirection
  onSort?: (columnKey: T) => void
}

/**
 * Tabla de datos con soporte para ordenamiento por cabecera y estilos unificados.
 */
export function Table<T = string>({
  columns,
  children,
  className,
  sortColumn,
  sortDirection,
  onSort,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          'w-full border-collapse text-[0.95rem]',
          '[&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle [&_td]:whitespace-nowrap',
          className,
        )}
      >
        <thead>
          <tr className="border-y border-line bg-[#F8FAFD]">
            {columns.map((c) => {
              const isSortable = Boolean(onSort && (c.sortable || c.key))
              const isSorted = Boolean(c.key && sortColumn === c.key)
              const currentDir = isSorted ? sortDirection : null

              return (
                <th
                  key={String(c.key ?? c.label)}
                  scope="col"
                  onClick={isSortable && c.key ? () => onSort?.(c.key as T) : undefined}
                  className={cn(
                    'border-y border-line bg-[#F8FAFD] px-4 py-3.5 text-[0.78rem] font-bold tracking-wider uppercase transition-colors',
                    isSortable ? 'cursor-pointer select-none hover:bg-alt/80 group' : '',
                    isSorted ? 'text-brand font-extrabold bg-brand-soft/20' : 'text-muted',
                    c.align === 'center'
                      ? 'text-center'
                      : c.align === 'right'
                        ? 'text-right'
                        : 'text-left',
                    c.className,
                  )}
                  title={isSortable ? `Ordenar por ${c.label}` : undefined}
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      c.align === 'center'
                        ? 'justify-center w-full'
                        : c.align === 'right'
                          ? 'justify-end w-full'
                          : 'justify-start',
                    )}
                  >
                    <span>{c.label}</span>
                    {isSortable && (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center transition-colors',
                          isSorted ? 'text-brand' : 'text-muted/40 group-hover:text-muted',
                        )}
                      >
                        {currentDir === 'asc' ? (
                          <Icon name="chevronUp" size={14} strokeWidth={2.5} />
                        ) : currentDir === 'desc' ? (
                          <Icon name="chevronDown" size={14} strokeWidth={2.5} />
                        ) : (
                          <Icon name="chevronsUpDown" size={13} strokeWidth={1.8} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              )
            })}
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
  className,
}: {
  children: ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}) {
  return (
    <td
      className={cn(
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
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
