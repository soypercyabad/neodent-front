import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Alert, Button, Card, Field, Icon, Input } from '@/shared/components/ui'
import { authApi } from '../api/authApi'
import { EMAIL_RE } from '@/shared/lib/validation'
import { SecurityVerification } from '../components/SecurityVerification'
import { useAuth } from '../model/useAuth'

export function RestartVerificationPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [correo, setCorreo] = useState<string>(location.state?.correo ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [securityKey, setSecurityKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    if (!EMAIL_RE.test(correo.trim()) || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    if (!token) {
      setError('Completa la verificación de seguridad.')
      return
    }

    setSubmitting(true)
    setError(null)
    setToken(null)

    try {
      const email = correo.trim().toLowerCase()
      const response = await authApi.restartRegistrationVerification(email, password, token)

      if (!response.challengeId) throw new Error('No se recibió un desafío de verificación válido.')

      navigate('/verificar-correo', {
        replace: true,
        state: { challengeId: response.challengeId, correo: email },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reiniciar la verificación.')
      setSecurityKey(current => current + 1)
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <p className="text-center text-muted">Cargando…</p>
  if (user) return <Navigate to="/" replace />

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}>
      <Card className="px-8 py-9 max-sm:px-5">
        <header className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-ink">Activa tu cuenta</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Ingresa tus credenciales para recibir un nuevo código de verificación.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {error && <Alert variant="error" shake onClose={() => setError(null)}>{error}</Alert>}

          <Field label="Correo electrónico">
            <Input type="email" icon="mail" autoComplete="email" placeholder="Ingresa tu correo"
              value={correo} disabled={submitting}
              onChange={e => { setCorreo(e.target.value); setError(null) }} />
          </Field>

          <Field label="Contraseña">
            <Input type={showPassword ? 'text' : 'password'} icon="lock"
              autoComplete="current-password" placeholder="Ingresa tu contraseña"
              value={password} disabled={submitting}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              trailing={
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="grid size-9 place-items-center text-ink-soft hover:text-ink">
                  <Icon name={showPassword ? 'eye' : 'eyeOff'} size={20} />
                </button>
              } />
          </Field>

          <SecurityVerification resetKey={securityKey} onToken={setToken} />

          <Button type="submit" disabled={submitting || !token}
            className="w-full justify-center disabled:opacity-60">
            {submitting ? 'Enviando código…' : 'Enviar nuevo código'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          ¿Ya activaste tu cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">Inicia sesión</Link>
        </p>
      </Card>
    </motion.div>
  )
}