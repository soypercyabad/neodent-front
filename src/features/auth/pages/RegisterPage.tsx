import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Card } from '@/shared/components/ui'
import { authApi } from '../api/authApi'
import { useAuth } from '../model/useAuth'
import { RegisterForm } from '../components/RegisterForm'
import type { RegisterInput } from '../model/auth.types'

export function RegisterPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const initialValues = (location.state as { initialValues?: Partial<RegisterInput> } | null)?.initialValues

  const handleSubmit = async (input: RegisterInput, turnstileToken: string) => {
    const response = await authApi.initPatientRegistration({
      tipoDocumento: input.tipoDocumento,
      numeroDocumento: input.numeroDocumento.trim(),
      email: input.correo.trim().toLowerCase(),
      turnstileToken,
    })

    navigate('/verificar-correo', {
      replace: true,
      state: {
        challengeId: response.challengeId,
        correo: input.correo.trim().toLowerCase(),
        registrationData: input,
      },
    })
  }

  if (isLoading) return <p className="text-center text-muted">Cargando…</p>
  if (user) return <Navigate to="/" replace />

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="px-8 py-10 sm:px-10 lg:px-12">
        <header className="mb-7 text-center">
          <h2 className="text-2xl font-bold text-ink">Crear cuenta</h2>
          <p className="mt-2 text-sm text-muted">Completa tus datos para registrarte como paciente.</p>
        </header>
        <RegisterForm onSubmit={handleSubmit} initialValues={initialValues} />
        <p className="mt-7 text-center text-sm text-ink-soft">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-bold text-brand hover:underline">Inicia sesión</Link>
        </p>
      </Card>
    </motion.div>
  )
}