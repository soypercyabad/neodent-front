import type { ReactNode } from 'react'

export interface ToolbarProps {
  children: ReactNode
  className?: string
}

/** Fila de filtros sobre una tabla. */
export function Toolbar({ children, className = '' }: ToolbarProps) {
  return (
    <div className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${className}`.trim()}>
      {children}
    </div>
  )
}
