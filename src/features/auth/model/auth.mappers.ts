import type { Role, User } from '@/domain/identity'
import type { AuthenticatedUserResponse } from '../api/authApi.types'

export function mapBackendRole(roles: string[]): Role {
  if (roles.includes('ADMIN')) return 'Administrador'
  if (roles.includes('RECEPCIONISTA')) return 'Recepcionista'
  if (roles.includes('ODONTOLOGO')) return 'Odontólogo'
  if (roles.includes('PACIENTE')) return 'Paciente'

  throw new Error('El usuario no tiene un rol válido.')
}

export function mapProfileToUser(profile: AuthenticatedUserResponse): User {
  const rol = mapBackendRole(profile.roles)

  return {
    id: profile.idUsuario,
    nombre: profile.nombres,
    apellido: [
      profile.apellidoPaterno,
      profile.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' '),

    correo: profile.correo,
    rol,
    esp: '',
    activo: profile.estado === 'ACTIVO',
    tieneHorario: false,

    ...(profile.idPaciente !== null
      ? { pacId: profile.idPaciente }
      : {}),
  }
}
