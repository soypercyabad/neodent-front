import type { BadgeTone } from '@/shared/components/ui'
import type { UsuarioInternoResponse } from '../api/usersApi'

export const ROL_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  ADMIN: { label: 'Administrador', tone: 'purple' },
  ODONTOLOGO: { label: 'Odontólogo', tone: 'blue' },
  RECEPCIONISTA: { label: 'Recepcionista', tone: 'teal' },
  FARMACIA: { label: 'Farmacia', tone: 'amber' },
  PACIENTE: { label: 'Paciente', tone: 'gray' },
}

export function rolBadgeInfo(rol: string): { label: string; tone: BadgeTone } {
  if (ROL_CONFIG[rol]) {
    return ROL_CONFIG[rol]
  }

  // Si es un rol personalizado dinámico (ej. auditor, asistente, etc.)
  const formatted = rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase()
  return {
    label: formatted,
    tone: 'blue',
  }
}

export function nombreCompleto(
  usuario: Pick<UsuarioInternoResponse, 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'>,
): string {
  return [usuario.nombres, usuario.apellidoPaterno, usuario.apellidoMaterno]
    .filter(Boolean)
    .join(' ')
}

export function esOdontologo(
  usuario: Pick<UsuarioInternoResponse, 'roles' | 'odontologoId'>,
): boolean {
  return (
    usuario.roles.includes('ODONTOLOGO') ||
    Boolean(usuario.odontologoId)
  )
}

export function prefijoProfesional(
  usuario: Pick<UsuarioInternoResponse, 'roles' | 'odontologoId'>,
): string {
  return esOdontologo(usuario) ? 'Dr(a). ' : ''
}

export function estadoUsuario(
  usuario: Pick<UsuarioInternoResponse, 'estado' | 'personalActivo'>,
): { texto: string; tono: BadgeTone } {
  if (usuario.estado === 'PENDIENTE') {
    return { texto: 'Pendiente', tono: 'amber' }
  }
  if (usuario.estado === 'BLOQUEADO') {
    return { texto: 'Bloqueado', tono: 'red' }
  }
  if (usuario.estado === 'ACTIVO' && usuario.personalActivo) {
    return { texto: 'Activo', tono: 'green' }
  }
  return { texto: 'Inactivo', tono: 'gray' }
}
