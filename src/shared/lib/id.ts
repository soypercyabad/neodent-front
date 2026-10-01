/**
 * Identificador de entidad. Todo el dominio lo usa en lugar de `number`, así
 * que migrar a los identificadores del backend (por ejemplo UUIDs) es cambiar
 * este alias y sus helpers, sin tocar los componentes.
 */
export type Id = number

/** Convierte un parámetro de ruta o el value de un <select>. */
export const parseId = (raw: string): Id => Number(raw)

/** Semilla numérica estable para el color del avatar. */
export const seedOf = (id: Id): number => id
