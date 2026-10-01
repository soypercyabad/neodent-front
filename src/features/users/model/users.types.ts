import type { Id } from '@/shared/lib/id'

export const ROLES = [
  'Odontólogo',
  'Administrador',
  'Recepcionista',
  'Paciente',
] as const

export type Role = (typeof ROLES)[number]

export const STAFF_ROLES = [
  'Odontólogo',
  'Administrador',
  'Recepcionista',
] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const PATIENT_ROLES = ['Paciente'] as const

export type PatientRole = (typeof PATIENT_ROLES)[number]

export interface User {
  id: Id
  nombre: string
  apellido: string
  correo: string
  /** Nivel de acceso a la aplicación. */
  rol: Role
  /** Especialidad clínica o cargo, según el rol. */
  esp: string
  activo: boolean
  /**
   * Si tiene disponibilidad configurada. Vendrá del endpoint de horarios;
   * mientras tanto se lee de los datos de ejemplo.
   */
  tieneHorario: boolean
  /**
   * Ficha de paciente asociada a la cuenta. Sólo la tienen las cuentas con rol
   * Paciente, y es la que enlaza al usuario con sus citas.
   */
  pacId?: Id
}

export type UserInput = Pick<User, 'nombre' | 'apellido' | 'correo' | 'rol' | 'esp' | 'activo'>
