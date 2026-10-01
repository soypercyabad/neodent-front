import type { BadgeTone } from '@/shared/components/ui'
import { TODAY } from '@/shared/lib/constants'
import type { Appointment, AppointmentStatus, PaymentStatus } from './appointments.types'

export const statusTone: Record<AppointmentStatus, BadgeTone> = {
  Programada: 'green',
  Reprogramada: 'blue',
  Cancelada: 'red',
  Atendida: 'teal',
}

export const paymentTone: Record<PaymentStatus, BadgeTone> = {
  Pendiente: 'amber',
  Pagado: 'green',
  'No realizado': 'gray',
}

type Sortable = Pick<Appointment, 'fecha' | 'hora'>

/** Clave ordenable fecha+hora. */
const sortKey = (a: Sortable) => a.fecha + a.hora

/**
 * Orden de la tabla: primero las citas de hoy en adelante (la más próxima
 * arriba) y debajo las pasadas (la más reciente arriba). El corte es por fecha,
 * así que cada día cae en un único bloque de la tabla.
 */
export function compareAppointments(a: Sortable, b: Sortable) {
  const aFuture = a.fecha >= TODAY
  const bFuture = b.fecha >= TODAY
  if (aFuture !== bFuture) return aFuture ? -1 : 1
  return aFuture ? sortKey(a).localeCompare(sortKey(b)) : sortKey(b).localeCompare(sortKey(a))
}
