import type { Step } from '@/shared/components/ui/Stepper'
import type { IconName } from '@/shared/components/ui/Icon'
import type { Id } from '@/shared/lib/id'

/** Pasos de la reserva, compartidos por todas las pantallas del proceso. */
export const BOOKING_STEPS: readonly Step[] = [
  { label: 'PASO 1', title: 'Datos generales' },
  { label: 'PASO 2', title: 'Fecha y hora' },
  { label: 'PASO 3', title: 'Confirmar' },
]

export const STAFF_BOOKING_STEPS: readonly Step[] = [
  { label: 'PASO 1', title: 'Paciente' },
  { label: 'PASO 2', title: 'Servicio y sede' },
  { label: 'PASO 3', title: 'Fecha y hora' },
  { label: 'PASO 4', title: 'Confirmar' },
]

export interface Service {
  id: string
  nombre: string
  /** Frase corta bajo el nombre, en la tarjeta del servicio. */
  detalle: string
  icon: IconName
}

/** Servicios que el paciente puede reservar. Sustituir por el catálogo del backend. */
export const SERVICES: readonly Service[] = [
  { id: 'profilaxis', nombre: 'Profilaxis', detalle: 'Limpieza dental', icon: 'braces' },
  { id: 'extraccion', nombre: 'Extracción', detalle: 'Extracción dental', icon: 'forceps' },
  { id: 'curacion', nombre: 'Curación', detalle: 'Curación dental', icon: 'toothCracked' },
  { id: 'otras', nombre: 'Otras consultas', detalle: 'Evaluamos tu caso', icon: 'tooth' },
]

export interface Branch {
  nombre: string
  direccion: string
}

/** Sedes que atienden citas, con la dirección que se muestra al elegirlas. */
export const BRANCHES: readonly Branch[] = [
  { nombre: 'Jesús María', direccion: 'Av. el consultorio dental, Jesús María' },
  { nombre: 'San Borja', direccion: 'Av. el consultorio dental, San Borja' },
  { nombre: 'Lince', direccion: 'Av. el consultorio dental, Lince' },
]

/** Datos que reúne el primer paso de la reserva. */
export interface AppointmentDraft {
  servicio: string
  sede: string
}

/** El segundo paso añade al borrador el especialista y el cupo elegido. */
export interface ScheduleDraft extends AppointmentDraft {
  docId: Id
  /** Fecha en ISO (yyyy-mm-dd). */
  fecha: string
  /** Hora en formato HH:mm. */
  hora: string
}
