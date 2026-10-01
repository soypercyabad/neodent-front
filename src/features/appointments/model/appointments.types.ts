import type { Id } from '@/shared/lib/id'

export const APPOINTMENT_STATUSES = ['Programada', 'Reprogramada', 'Cancelada', 'Atendida'] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const PAYMENT_STATUSES = ['Pendiente', 'Pagado', 'No realizado'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_METHODS = ['Yape', 'Plin', 'Efectivo', 'Tarjeta', 'Transferencia'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const SEDES = ['Jesús María', 'Miraflores', 'San Isidro', 'San Pedro', 'Santiago de Surco']

export interface Appointment {
  id: Id
  pacId: Id
  docId: Id
  fecha: string
  hora: string
  lugar: string
  estado: AppointmentStatus
  pago: PaymentStatus
  precio: number | null
  tipoPago: PaymentMethod | null
  /** Referencia del cobro (operación de Yape, voucher de tarjeta…). */
  codigoTransaccion: string
}

/** Campos que edita la tarjeta de pago del detalle. */
export type PaymentInput = Pick<Appointment, 'pago' | 'precio' | 'tipoPago' | 'codigoTransaccion'>

/** Reprogramar y cancelar sólo tienen sentido en citas todavía vigentes. */
export const canActOn = (a: Pick<Appointment, 'estado'>) =>
  a.estado === 'Programada' || a.estado === 'Reprogramada'
