import { Navigate } from 'react-router-dom'

import { homeFor } from '@/app/navigation'
import { useAuth } from './model/useAuth'

/* Redirige al usuario autenticado hacia la página principal de su rol. */
export function HomeRedirect() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-soft">
        Cargando sesión…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={homeFor(user.rol)} replace />
}