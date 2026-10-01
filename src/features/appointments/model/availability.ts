import { TODAY } from '@/shared/lib/constants'
import type { Id } from '@/shared/lib/id'

/** Horas libres de un día concreto. */
export interface DaySlots {
  /** Fecha en ISO (yyyy-mm-dd). */
  fecha: string
  /** Horas libres ese día, en formato HH:mm y orden ascendente. */
  horas: string[]
}

const MANANA = ['09:00', '10:00', '11:00', '12:00']
const TARDE = ['14:00', '15:00', '16:00', '17:00', '18:00']
const COMPLETO = [...MANANA, ...TARDE]

/**
 * Horario semanal de un odontólogo: las horas que atiende cada día de la
 * semana, donde 0 es domingo. Un día ausente significa que no atiende.
 */
type WeeklySchedule = Partial<Record<number, string[]>>

/**
 * Horario de cada odontólogo, por su id. Cada uno tiene el suyo: unos atienden
 * mañanas, otros tardes y otros el día completo.
 *
 * Al conectar el backend esto desaparece y `availabilityFor` pasa a resolver
 * contra la API, que devuelve la disponibilidad de un odontólogo concreto
 * (por ejemplo `GET /odontologos/:id/disponibilidad`). El resto de la pantalla
 * no cambia, porque ya pide el horario por especialista.
 */
const SCHEDULES: Record<number, WeeklySchedule> = {
  // Henry Luján: lunes completo, martes por la mañana y el resto por la tarde.
  1: { 1: COMPLETO, 2: [...MANANA, '14:00', '15:00'], 3: TARDE, 4: TARDE, 5: TARDE, 6: TARDE },
  // María Álvarez: sólo mañanas, de lunes a viernes.
  2: { 1: MANANA, 2: MANANA, 3: MANANA, 4: MANANA, 5: MANANA },
  // Juan Pérez: tardes de lunes a sábado.
  3: { 1: TARDE, 2: TARDE, 3: TARDE, 4: TARDE, 5: TARDE, 6: TARDE },
  // Valeria Correa: días alternos, jornada completa.
  7: { 1: COMPLETO, 3: COMPLETO, 5: COMPLETO },
  // Carlos Mendoza: mañanas de martes a sábado, con jueves completo.
  8: { 2: MANANA, 3: MANANA, 4: COMPLETO, 5: MANANA, 6: MANANA },
  // Andrea Salas: aún no tiene disponibilidad configurada.
  9: {},
}

/** Suma días a una fecha ISO y devuelve la nueva fecha, también en ISO. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, '0'),
    String(dt.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Cuántos días hacia adelante se ofrecen al reservar. */
const HORIZON_DAYS = 14

/**
 * Días con cupo de un odontólogo, del más próximo en adelante. Devuelve sólo
 * los días en los que atiende, así que una lista vacía significa que todavía no
 * tiene horario configurado.
 */
export function availabilityFor(docId: Id, desde: string = TODAY): DaySlots[] {
  const schedule = SCHEDULES[docId]
  if (!schedule) return []

  const dias: DaySlots[] = []
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const fecha = addDays(desde, i)
    const [y, m, d] = fecha.split('-').map(Number)
    const horas = schedule[new Date(y, m - 1, d).getDay()]
    if (horas?.length) dias.push({ fecha, horas })
  }
  return dias
}

/** Primera fecha con cupo del odontólogo, o `null` si no tiene ninguna. */
export function nextSlotFor(docId: Id, desde: string = TODAY): string | null {
  return availabilityFor(docId, desde)[0]?.fecha ?? null
}
