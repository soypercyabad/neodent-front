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
  n != null ? `S/ ${Number(n).toFixed(2)}` : '-'

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('+')) {
    if (trimmed.startsWith('+51')) {
      const rest = trimmed.slice(3).replace(/\D/g, '').slice(0, 9)
      const parts = rest.match(/.{1,3}/g) || []
      return parts.length > 0 ? `+51 ${parts.join(' ')}` : '+51'
    }
    const digits = trimmed.slice(1).replace(/\D/g, '').slice(0, 15)
    const parts = digits.match(/.{1,3}/g) || []
    return `+${parts.join(' ')}`
  }

  const digits = trimmed.replace(/\D/g, '').slice(0, 9)
  const parts = digits.match(/.{1,3}/g) || []
  return parts.join(' ')
}

/**
 * Limpia el teléfono para guardado en base de datos (sin espacios ni guiones):
 * '123 456 789' -> '123456789'
 * '+51 987 654 321' -> '+51987654321'
 */
export function cleanPhone(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/[\s-]+/g, '').trim()
}
