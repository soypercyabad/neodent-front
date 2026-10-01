import type { User } from '@/domain/identity'

/** Datos de ejemplo. Sustituir por la respuesta del backend. */
export const MOCK_USERS: User[] = [
  { id: 1, nombre: 'Henry', apellido: 'Luján', correo: 'henry.lujan@neodents.com', rol: 'Odontólogo', esp: 'Ortodoncia', activo: true, tieneHorario: true },
  { id: 2, nombre: 'María', apellido: 'Álvarez', correo: 'maria.alvarez@neodents.com', rol: 'Odontólogo', esp: 'Endodoncia', activo: true, tieneHorario: true },
  { id: 3, nombre: 'Juan', apellido: 'Pérez', correo: 'juan.perez@neodents.com', rol: 'Odontólogo', esp: 'Periodoncia', activo: true, tieneHorario: true },
  { id: 4, nombre: 'Laura', apellido: 'Castro', correo: 'laura.castro@neodents.com', rol: 'Odontólogo', esp: 'Prostodoncia', activo: false, tieneHorario: false },
  { id: 5, nombre: 'Gustavo', apellido: 'Pérez', correo: 'gustavo.perez@neodents.com', rol: 'Administrador', esp: 'Recepción', activo: true, tieneHorario: true },
  { id: 6, nombre: 'Ricardo', apellido: 'Sánchez', correo: 'ricardo.sanchez@neodents.com', rol: 'Administrador', esp: 'Administrador', activo: true, tieneHorario: true },
  { id: 7, nombre: 'Valeria', apellido: 'Correa', correo: 'valeria.correa@neodents.com', rol: 'Odontólogo', esp: 'Odontopediatría', activo: true, tieneHorario: true },
  { id: 8, nombre: 'Carlos', apellido: 'Mendoza', correo: 'carlos.mendoza@neodents.com', rol: 'Odontólogo', esp: 'Endodoncia', activo: true, tieneHorario: true },
  { id: 9, nombre: 'Andrea', apellido: 'Salas', correo: 'andrea.salas@neodents.com', rol: 'Odontólogo', esp: 'Periodoncia', activo: true, tieneHorario: false },
  { id: 10, nombre: 'Diego', apellido: 'Vargas', correo: 'diego.vargas@neodents.com', rol: 'Administrador', esp: 'Administración', activo: false, tieneHorario: true },
  // Cuenta de paciente: `pacId` apunta a su ficha en MOCK_PATIENTS y es lo que
  // permite mostrarle sus propias citas.
  { id: 11, nombre: 'Rosa', apellido: 'Aguilar', correo: 'rosa.aguilar@gmail.com', rol: 'Paciente', esp: '', activo: true, tieneHorario: false, pacId: 1 },
]
