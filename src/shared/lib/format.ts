import { DOW, MONTHS } from './constants'

/** 2026-08-12 -> 12/08/2026 */
export const isoToDMY = (iso: string) => iso.split('-').reverse().join('/')

/** 2026-08-24 -> Lunes 24 de Agosto de 2026 */
export function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DOW[dt.getDay()]} ${d} de ${MONTHS[m - 1]} de ${y}`
}

/** 2026-08-24 -> Lunes 24 de Agosto (sin año, para las tarjetas del paciente) */
export function longDateNoYear(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DOW[dt.getDay()]} ${d} de ${MONTHS[m - 1]}`
}

/** 2026-08-24 -> Lunes */
export function dayName(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return DOW[new Date(y, m - 1, d).getDay()]
}

/** 09:00 -> 9:00 AM */
export function time12h(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

export const money = (n: number | null | undefined) =>
  n != null ? `S/ ${Number(n).toFixed(2)}` : '—'
