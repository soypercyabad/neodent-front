import type { UsuarioInternoResponse } from '../api/usersApi'
import type { Role, User } from '@/domain/identity'

const BACKEND_ROLES: Record<string, Role> = {
  ADMIN: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ODONTOLOGO: 'Odontólogo',
  PACIENTE: 'Paciente',
}

const ROLE_PRIORITY = [
  'ADMIN',
  'RECEPCIONISTA',
  'ODONTOLOGO',
  'PACIENTE',
]

export function mapUsuarioInterno(
  usuario: UsuarioInternoResponse,
): User {
  const backendRole = ROLE_PRIORITY.find((role) =>
    usuario.roles.includes(role),
  )

  if (!backendRole) {
    throw new Error(
      `El usuario ${usuario.usuarioId} no tiene un rol reconocido.`,
    )
  }

  return {
    id: usuario.usuarioId,
    nombre: usuario.nombres,
    apellido: [
      usuario.apellidoPaterno,
      usuario.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' '),

    correo: usuario.correo,
    rol: BACKEND_ROLES[backendRole],
    esp: usuario.roles.includes('ODONTOLOGO')   
      ? usuario.especialidades.join(', ')
      : '',
    activo:
      usuario.estado === 'ACTIVO' &&
      usuario.personalActivo,

    // La disponibilidad se conectará con el módulo de horarios.
    tieneHorario: false,
  }
}

export const ROLE_TO_BACKEND: Record<string, string> = {
  Administrador: 'ADMIN',
  Recepcionista: 'RECEPCIONISTA',
  Odontólogo: 'ODONTOLOGO',
}