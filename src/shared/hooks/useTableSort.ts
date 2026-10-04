import { useMemo, useState } from 'react'
import type { SortDirection } from '../components/ui/Table'

export interface UseTableSortOptions<T> {
  initialColumn?: string | null
  initialDirection?: 'asc' | 'desc'
  customComparators?: Partial<Record<string, (a: T, b: T) => number>>
}

export function useTableSort<T>(
  items: T[],
  options?: UseTableSortOptions<T>,
) {
  const [sortColumn, setSortColumn] = useState<string | null>(
    options?.initialColumn ?? null,
  )
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    options?.initialDirection ?? 'asc',
  )

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const sortedItems = useMemo(() => {
    if (!sortColumn || !sortDirection) return items

    const dir = sortDirection === 'asc' ? 1 : -1
    const custom = options?.customComparators?.[sortColumn]

    return [...items].sort((a, b) => {
      if (custom) {
        return custom(a, b) * dir
      }

      const valA = (a as Record<string, unknown>)[sortColumn]
      const valB = (b as Record<string, unknown>)[sortColumn]

      if (valA == null && valB == null) return 0
      if (valA == null) return 1 * dir
      if (valB == null) return -1 * dir

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir
      }

      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        return (Number(valA) - Number(valB)) * dir
      }

      // Fechas ISO o strings
      const strA = String(valA)
      const strB = String(valB)

      return strA.localeCompare(strB, 'es', { numeric: true, sensitivity: 'base' }) * dir
    })
  }, [items, sortColumn, sortDirection, options?.customComparators])

  return {
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    handleSort,
    sortedItems,
  }
}
