import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Card } from '@/shared/components/ui'
import { LoginForm } from '../components/LoginForm'
import { useAuth } from '../model/useAuth'
import type { Credentials } from '../model/auth.types'
import { motion } from 'motion/react'

/** La raíz reparte a cada rol su pantalla de inicio. */
const HOME = '/'

export function LoginPage() {
  const { user, login, isLoading } = useAuth()  
  const navigate = useNavigate()
  const location = useLocation()

  const from: string = location.state?.from?.pathname ?? HOME

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-soft">
        Cargando sesión...
      </div>
    )
  } 

  if (user) {
    return <Navigate to={HOME} replace />
  }

  const handleSubmit = async (credentials: Credentials) => {
    await login(credentials)

    navigate('/verificar-2fa', {
      replace: true,
      state: { from },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
      }}
    > 
      <Card className="px-8 py-9 max-sm:px-5">
        <header className="mb-7 text-center">
          <h2 className="text-[1.5rem] font-bold text-ink">
            Inicia sesión
          </h2>

          <p className="mt-1 text-[0.92rem] text-muted">
            Ingresa tus credenciales para acceder
          </p>
        </header>

        <LoginForm onSubmit={handleSubmit} />

        <div className="my-6 flex items-center gap-3 text-[0.85rem] text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          O
          <span className="h-px flex-1 bg-line" />
        </div>

        <p className="text-center text-[0.92rem] text-ink-soft">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-bold text-brand hover:underline">Regístrate</Link>
        </p>
      </Card>
    </motion.div>
  )
}