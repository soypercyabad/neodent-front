import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Alert, Button, Card, Field, Icon, Input } from '@/shared/components/ui'
import { authApi } from '../api/authApi'

type Estado = 'validando' | 'valido' | 'invalido' | 'completado'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token') ?? ''

  const [estado, setEstado] = useState<Estado>('validando')
  const [error, setError] = useState<string | null>(null)

  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')

  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    const validarEnlace = async () => {
      if (!token) {
        setEstado('invalido')
        return
      }

      setEstado('validando')

      try {
        const response = await authApi.validatePasswordReset(token)

        if (!active) return

        setEstado(response.valid ? 'valido' : 'invalido')
      } catch {
        if (active) {
          setEstado('invalido')
        }
      }
    }

    void validarEnlace()

    return () => {
      active = false
    }
  }, [token])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (loading) return

    if (contrasena.length < 8 || contrasena.length > 72) {
      setError('La contraseña debe tener entre 8 y 72 caracteres.')
      return
    }

    if (contrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await authApi.resetPassword(
        token,
        contrasena,
        confirmacion,
      )

      setContrasena('')
      setConfirmacion('')
      setEstado('completado')

      // El enlace ya fue utilizado: retiramos el token de la URL.
      window.history.replaceState(
        window.history.state,
        '',
        '/reset-password',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar tu contraseña.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {estado === 'validando' && (
        <motion.div
          key="validando"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Card className="px-8 py-12 text-center">
            <p role="status" className="text-ink-soft">
              Validando tu enlace de recuperación…
            </p>
          </Card>
        </motion.div>
      )}

      {estado === 'invalido' && (
        <motion.div
          key="invalido"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="px-8 py-12 text-center max-sm:px-5">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
              <Icon name="warning" size={28} />
            </div>

            <h2 className="mt-6 text-[1.5rem] font-bold text-ink">
              Enlace no disponible
            </h2>

            <p className="mt-3 text-[0.92rem] leading-6 text-ink-soft">
              El enlace no es válido, ha expirado o ya fue utilizado.
              Solicita uno nuevo para continuar.
            </p>

            <Link
              to="/recuperar"
              className="mt-8 inline-flex w-full items-center justify-center rounded-control bg-brand px-5 py-3 text-[0.92rem] font-bold text-white hover:bg-brand-dark"
            >
              Solicitar un nuevo enlace
            </Link>
          </Card>
        </motion.div>
      )}

      {estado === 'valido' && (
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
                Restablecer contraseña
              </h2>

              <p className="mt-2 text-[0.92rem] leading-6 text-muted">
                Ingresa tu nueva contraseña para recuperar
                el acceso a NeoDent.
              </p>
            </header>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5"
            >
              {error && (
                <Alert
                  variant="error"
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <Field label="Nueva contraseña">
                <Input
                  type={mostrarContrasena ? 'text' : 'password'}
                  name="nuevaContrasena"
                  icon="lock"
                  autoComplete="new-password"
                  placeholder="Ingresa tu nueva contraseña"
                  value={contrasena}
                  disabled={loading}
                  minLength={8}
                  maxLength={72}
                  onChange={(event) => {
                    setContrasena(event.target.value)
                    setError(null)
                  }}
                />
              </Field>

              <Field label="Confirmar contraseña">
                <Input
                  type={mostrarContrasena ? 'text' : 'password'}
                  name="confirmarContrasena"
                  icon="lock"
                  autoComplete="new-password"
                  placeholder="Repite tu nueva contraseña"
                  value={confirmacion}
                  disabled={loading}
                  onChange={(event) => {
                    setConfirmacion(event.target.value)
                    setError(null)
                  }}
                />
              </Field>

              <label className="flex cursor-pointer items-center gap-2 text-[0.88rem] text-ink-soft">
                <input
                  type="checkbox"
                  checked={mostrarContrasena}
                  onChange={(event) =>
                    setMostrarContrasena(event.target.checked)
                  }
                />
                Mostrar contraseñas
              </label>

              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center"
              >
                {loading
                  ? 'Actualizando contraseña…'
                  : 'Restablecer contraseña'}
              </Button>

              <Link
                to="/login"
                className="text-center text-[0.88rem] font-bold text-brand hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </form>
          </Card>
        </motion.div>
      )}

      {estado === 'completado' && (
        <motion.div
          key="completado"
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
              Contraseña actualizada
            </h2>

            <p className="mt-3 text-[0.92rem] leading-6 text-ink-soft">
              Tu contraseña se restableció correctamente.
              Ya puedes iniciar sesión con tu nueva contraseña.
            </p>

            <Link
              to="/login"
              className="mt-8 inline-flex w-full items-center justify-center rounded-control bg-brand px-5 py-3 text-[0.92rem] font-bold text-white hover:bg-brand-dark"
            >
              Iniciar sesión
            </Link>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}