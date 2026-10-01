import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Alert, Button, Card, Field, Input, Icon } from '@/shared/components/ui'
import { authApi } from '../api/authApi'

export function ForgotPasswordPage() {
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const email = correo.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido.')
      return
    }

    if (loading) return

    setLoading(true)
    setError(null)

    try {
      await authApi.forgotPassword(email)
      setEnviado(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos procesar tu solicitud. Inténtalo nuevamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!enviado ? (
        <motion.div
          key="formulario"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="px-8 py-10 max-sm:px-5">
            <header className="mb-7 text-center">
              <h2 className="text-[1.5rem] font-bold text-ink">
                ¿Olvidaste tu contraseña?
              </h2>

              <p className="mt-2 text-[0.92rem] leading-6 text-muted">
                Ingresa tu correo electrónico y te enviaremos
                un enlace para restablecer tu contraseña.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <Alert
                  variant="error"
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <Field label="Correo electrónico">
                <Input
                  type="email"
                  name="correo"
                  icon="user"
                  placeholder="Ingresa tu correo"
                  autoComplete="email"
                  value={correo}
                  disabled={loading}
                  onChange={(event) => {
                    setCorreo(event.target.value)
                    setError(null)
                  }}
                />
              </Field>

              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center"
              >
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </Button>

              <Link
                to="/login"
                className="text-center text-[0.9rem] font-bold text-brand hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </form>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="confirmacion"
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="px-8 py-12 text-center max-sm:px-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 18,
              }}
              className="mx-auto grid size-14 place-items-center rounded-full bg-success text-white"
            >
              <Icon name="check" size={28} />
            </motion.div>

            <h2 className="mt-6 text-[1.5rem] font-bold text-ink">
              Revisa tu correo
            </h2>

            <p className="mt-3 text-[0.92rem] leading-6 text-ink-soft">
              Si existe una cuenta asociada a ese correo,
              recibirás un enlace para restablecer tu contraseña.
            </p>

            <p className="mt-3 text-[0.85rem] text-muted">
              Revisa también tu carpeta de correo no deseado.
            </p>

            <Link
              to="/login"
              className="mt-8 inline-flex w-full items-center justify-center rounded-control bg-brand px-5 py-3 text-[0.92rem] font-bold text-white transition hover:bg-brand-dark"
            >
              Volver a iniciar sesión
            </Link>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}