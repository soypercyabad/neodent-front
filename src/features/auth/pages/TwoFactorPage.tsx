import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Alert, Button, Card, Icon, OtpInput } from '@/shared/components/ui'
import { useAuth } from '../model/useAuth'

const INITIAL_COOLDOWN_SECONDS = 45

export function TwoFactorPage() {
  const {
    user,
    pendingTwoFactor,
    verifyTwoFactor,
    resendTwoFactor,
  } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const from: string =
    location.state?.from ?? '/'

  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)

  const [countdown, setCountdown] = useState(
    INITIAL_COOLDOWN_SECONDS,
  )

  useEffect(() => {
    if (countdown <= 0) return

    const timer = window.setInterval(() => {
      setCountdown((prev) =>
        prev > 0 ? prev - 1 : 0,
      )
    }, 1000)

    return () => window.clearInterval(timer)
  }, [countdown])

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0')

    const secs = (totalSeconds % 60)
      .toString()
      .padStart(2, '0')

    return `${mins}:${secs}`
  }

  /*
   * Si ya existía sesión antes de entrar manualmente
   * a esta ruta, regresamos al inicio.
   *
   * Pero después de verificar correctamente dejamos
   * visible la pantalla de éxito.
   */
  if (user && !verified && !pendingTwoFactor) {
    return <Navigate to="/" replace />
  }

  if (!pendingTwoFactor && !verified && !user) {
    return <Navigate to="/login" replace />
  }

  const executeVerify = async (
    codeToVerify: string,
  ) => {
    if (!/^\d{6}$/.test(codeToVerify)) {
      setError('Ingresa el código de 6 dígitos.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await verifyTwoFactor(codeToVerify)

      /*
       * Importante:
       * NO navegamos todavía.
       * Mostramos primero la confirmación.
       */
      setVerified(true)
    } catch (err) {
      setCodigo('')

      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo verificar el código.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (
    event?: FormEvent,
  ) => {
    event?.preventDefault()
    await executeVerify(codigo)
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return

    setResending(true)
    setError(null)
    setMessage(null)

    try {
      await resendTwoFactor()

      setCodigo('')
      setCountdown(60)

      setMessage(
        'Te enviamos un nuevo código a tu correo.',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo reenviar el código.',
      )
    } finally {
      setResending(false)
    }
  }

  const handleContinue = () => {
    navigate(from, {
      replace: true,
    })
  }

  return (
    <AnimatePresence mode="wait">
      {!verified ? (
        <motion.div
          key="verification"
          initial={{
            opacity: 0,
            y: 18,
            scale: 0.985,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: -12,
            scale: 0.985,
          }}
          transition={{
            duration: 0.28,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Card className="rounded-[28px] border border-line/70 bg-surface px-8 py-10 shadow-sm sm:px-10 sm:py-12">
            <header className="text-center">
              <h2 className="text-[1.55rem] font-bold text-ink sm:text-[1.65rem]">
                Verifica tu correo
              </h2>

              <p className="mx-auto mt-2 max-w-[320px] text-[0.88rem] leading-relaxed text-muted">
                Te enviamos un código de verificación
                a tu correo electrónico para confirmar
                tu identidad.
              </p>
            </header>

            <form
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col gap-6"
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Alert
                      variant="error"
                      shake
                      onClose={() => setError(null)}
                    >
                      {error}
                    </Alert>
                  </motion.div>
                )}

                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Alert
                      variant="success"
                      onClose={() =>
                        setMessage(null)
                      }
                    >
                      {message}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="py-2">
                <OtpInput
                  value={codigo}
                  onChange={(nextCode) => {
                    setCodigo(nextCode)
                    if (error) setError(null)
                  }}
                  length={6}
                  disabled={submitting}
                  isError={Boolean(error)}
                />
              </div>

              <Button
                type="submit"
                disabled={
                  submitting ||
                  codigo.length < 6
                }
                className="h-12 w-full justify-center rounded-xl text-base font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {submitting
                  ? 'Verificando…'
                  : 'Verificar código'}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[0.88rem]">
                <span className="text-muted">
                  ¿No lo recibiste?
                </span>

                <button
                  type="button"
                  disabled={
                    resending ||
                    countdown > 0
                  }
                  onClick={handleResend}
                  className="cursor-pointer font-medium text-brand transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
                >
                  {resending
                    ? 'Reenviando…'
                    : 'Reenviar código'}
                </button>

                {countdown > 0 && (
                  <span className="font-semibold text-[#f97316]">
                    {formatCountdown(
                      countdown,
                    )}
                  </span>
                )}
              </div>
            </form>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="success"
          initial={{
            opacity: 0,
            y: 18,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Card className="rounded-[28px] border border-line/70 bg-surface px-8 py-12 text-center shadow-sm sm:px-10 sm:py-14">
            <motion.div
              initial={{
                scale: 0,
                rotate: -20,
              }}
              animate={{
                scale: 1,
                rotate: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 18,
                delay: 0.08,
              }}
              className="mx-auto grid size-14 place-items-center rounded-full bg-success text-white"
            >
              <Icon name="check" size={28} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 text-[1.55rem] font-bold text-ink"
            >
              Verificación completada
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mt-2 max-w-[320px] text-[0.9rem] leading-relaxed text-ink-soft"
            >
              Tu identidad ha sido verificada
              correctamente.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-8"
            >
              <Button
                type="button"
                onClick={handleContinue}
                className="h-12 w-full justify-center rounded-xl text-base font-semibold"
              >
                Continuar
              </Button>
            </motion.div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}