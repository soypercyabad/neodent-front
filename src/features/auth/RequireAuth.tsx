import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '@/domain/identity'
import { SessionLoadingScreen } from '@/shared/components/ui'
import { useAuth } from './model/useAuth'

interface RequireAuthProps {
  roles?: readonly Role[]
  module?: string
}

export function RequireAuth({ roles, module }: RequireAuthProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <SessionLoadingScreen />
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location }} />
    )
  }

  const isAdmin = user.rol === 'Administrador' || user.rolesRaw?.includes('ADMIN')

  // Si la ruta requiere un módulo específico, validar que el usuario tenga ese módulo asignado
  if (module) {
    const isSystemAdminModule = (module === 'ROLES' || module === 'MODULOS') && isAdmin
    const hasModule = user.modulos?.some(m => m.codigo === module)
    if (!hasModule && !isSystemAdminModule) {
      return <Navigate to="/403" replace />
    }
  }

  // Si la ruta tiene restricción por rol
  if (roles && !isAdmin && !roles.includes(user.rol)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}