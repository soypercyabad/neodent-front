import type { ReactNode } from 'react'

interface PageHeadProps {
  title: string
  description?: string
  actions?: ReactNode
}

/** Cabecera de página: título, descripción y acciones alineadas a la derecha. */
export function PageHead({ title, description, actions }: PageHeadProps) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[1.9rem] leading-tight font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[0.95rem] text-ink-soft">{description}</p>}
      </div>
      {actions}
    </header>
  )
}
