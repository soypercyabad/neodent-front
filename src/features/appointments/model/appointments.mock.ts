import type { Appointment } from './appointments.types'

/** Datos de ejemplo. Sustituir por la respuesta del backend. */
export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 1, pacId: 1, docId: 1, fecha: '2026-08-24', hora: '09:00', lugar: 'Jesús María', estado: 'Programada', pago: 'Pendiente', precio: 120, tipoPago: 'Yape', codigoTransaccion: '' },
  { id: 2, pacId: 2, docId: 8, fecha: '2026-09-15', hora: '10:30', lugar: 'San Pedro', estado: 'Atendida', pago: 'Pagado', precio: 200, tipoPago: 'Tarjeta', codigoTransaccion: 'TRX-884210' },
  { id: 3, pacId: 4, docId: 1, fecha: '2026-08-24', hora: '11:30', lugar: 'Miraflores', estado: 'Reprogramada', pago: 'Pendiente', precio: null, tipoPago: null, codigoTransaccion: '' },
  { id: 4, pacId: 3, docId: 9, fecha: '2026-08-26', hora: '16:00', lugar: 'San Isidro', estado: 'Programada', pago: 'No realizado', precio: null, tipoPago: null, codigoTransaccion: '' },
  { id: 5, pacId: 5, docId: 8, fecha: '2026-08-27', hora: '08:30', lugar: 'Jesús María', estado: 'Programada', pago: 'Pendiente', precio: 80, tipoPago: 'Plin', codigoTransaccion: '' },
  { id: 6, pacId: 1, docId: 1, fecha: '2026-08-05', hora: '12:00', lugar: 'Jesús María', estado: 'Cancelada', pago: 'No realizado', precio: null, tipoPago: null, codigoTransaccion: '' },
  { id: 7, pacId: 4, docId: 9, fecha: '2026-07-28', hora: '15:30', lugar: 'San Isidro', estado: 'Atendida', pago: 'Pagado', precio: 350, tipoPago: 'Efectivo', codigoTransaccion: '' },
]
