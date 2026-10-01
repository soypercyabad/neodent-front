import { createContext } from 'react'
import type { Id } from '@/shared/lib/id'
import type { Appointment, PaymentInput } from '@/features/appointments/model/appointments.types'
import type { Patient } from '@/features/patients/model/patients.types'
import type { User } from '@/domain/identity'

/** Contrato del estado compartido: lecturas, búsquedas y operaciones. */
export interface DataStore {
  appointments: Appointment[]
  patients: Patient[]
  users: User[]
  appointmentById: (id: Id) => Appointment | undefined
  patientById: (id: Id) => Patient | undefined
  userById: (id: Id) => User | undefined
  pacName: (id: Id) => string
  docName: (id: Id) => string
  docEsp: (id: Id) => string
  cancelAppointment: (id: Id) => void
  deleteUser: (id: Id) => void
  savePayment: (id: Id, input: PaymentInput) => void
}

export const DataContext = createContext<DataStore | null>(null)
