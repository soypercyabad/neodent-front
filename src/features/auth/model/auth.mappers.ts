import type { Role, User } from '@/domain/identity'
import type { AuthenticatedUserResponse } from '../api/authApi.types'

export function mapBackendRole(roles: string[]): Role {
  if (roles.includes('ADMIN')) return 'Administrador'
  if (roles.includes('RECEPCIONISTA')) return 'Recepcionista'
  if (roles.includes('ODONTOLOGO')) return 'Odontólogo'
  if (roles.includes('PACIENTE')) return 'Paciente'
  if (roles.length > 0) return roles[0]

  return 'Personal'
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
    modulos: profile.modulos ?? [],
    rolesRaw: profile.roles,

    ...(profile.idPaciente !== null
      ? { pacId: profile.idPaciente }
      : {}),
  }
}
