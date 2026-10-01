import type { Patient } from './patients.types'

/** Datos de ejemplo. Sustituir por la respuesta del backend. */
export const MOCK_PATIENTS: Patient[] = [
  { id: 1, nombre: 'Rosa', apellido: 'Aguilar', cel: '+51 987 221 004', correo: 'rosa.aguilar@gmail.com', edad: 34, distrito: 'Miraflores' },
  { id: 2, nombre: 'María', apellido: 'López', cel: '+51 954 887 100', correo: 'maria.lopez@outlook.com', edad: 41, distrito: 'San Isidro' },
  { id: 3, nombre: 'Carmen', apellido: 'Díaz', cel: '+51 921 340 552', correo: 'carmen.diaz@gmail.com', edad: 27, distrito: 'Santiago de Surco' },
  { id: 4, nombre: 'Luis', apellido: 'Quispe', cel: '+51 933 110 889', correo: 'luis.quispe@gmail.com', edad: 52, distrito: 'La Molina' },
  { id: 5, nombre: 'Ana', apellido: 'Torres', cel: '+51 962 774 221', correo: 'ana.torres@gmail.com', edad: 19, distrito: 'Jesús María' },
]
