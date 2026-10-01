import type { Id } from '@/shared/lib/id'

export interface Patient {
  id: Id
  nombre: string
  apellido: string
  cel: string
  correo: string
  edad: number
  distrito: string
}
