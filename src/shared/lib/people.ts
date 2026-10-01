const PALETTE = ['#2f80ed', '#12805c', '#b7791f', '#8b5cf6', '#e5484d', '#0ea5e9']

/** Quita tildes para que las iniciales salgan sin diacríticos (Álvarez -> A). */
const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')

export const initials = (a: string, b: string) =>
  stripAccents((a[0] || '') + (b[0] || '')).toUpperCase()

export const avatarColor = (seed: number) => PALETTE[seed % PALETTE.length]

export const fullName = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`

/**
 * Semilla del color de avatar a partir del id. Desplaza la paleta para que las
 * primeras personas no reciban el azul de marca, reservado a la interfaz.
 */
export const avatarSeed = (id: number) => id + 2
