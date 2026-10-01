import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Alert, Button, Card, Icon, OtpInput } from '@/shared/components/ui'
import { authApi } from '../api/authApi'
import { useAuth } from '../model/useAuth'

const INITIAL_COOLDOWN_SECONDS = 45

interface RegistrationState {
  challengeId: number
  correo: string
}

export function VerifyEmailPage() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const registration = location.state as RegistrationState | null

  const [challengeId, setChallengeId] = useState(registration?.challengeId ?? 0)
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(INITIAL_COOLDOWN_SECONDS)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [countdown])

  const formatCountdown = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60)
      .toString()
      .padStart(2, '0')}`

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!challengeId || loading || !/^\d{6}$/.test(codigo)) return

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await authApi.verifyRegistrationEmail(challengeId, codigo)

      if (!response.verified) throw new Error(response.message)

      setVerified(true)
    } catch (err) {
      setCodigo('')
      setError(err instanceof Error ? err.message : 'No se pudo verificar el código.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!challengeId || countdown > 0 || resending || loading) return

    setResending(true)
    setError(null)
    setMessage(null)

    try {
      const response = await authApi.resendCode(challengeId)

      setChallengeId(response.challengeId)
      setCodigo('')
      setCountdown(60)
      setMessage(response.message || 'Te enviamos un nuevo código a tu correo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el código.')
    } finally {
      setResending(false)
    }
  }

  if (isLoading) return <p className="text-center text-muted">Cargando…</p>
  if (user) return <Navigate to="/" replace />
  if (!registration?.challengeId || !registration.correo)
    return <Navigate to="/registro" replace />

  return (
    <AnimatePresence mode="wait">
      {!verified ? (
        <motion.div
          key="verification"
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="rounded-[28px] border border-line/70 bg-surface px-8 py-10 shadow-sm sm:px-10 sm:py-12">
            <header className="text-center">
              <h2 className="text-[1.55rem] font-bold text-ink sm:text-[1.65rem]">
                Verifica tu correo
              </h2>

              <p className="mx-auto mt-2 max-w-[320px] text-[0.88rem] leading-relaxed text-muted">
                Ingresa el código de 6 dígitos enviado a{' '}
                <strong>{registration.correo}</strong>.
              </p>
            </header>

            <form onSubmit={handleVerify} className="mt-8 flex flex-col gap-6">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Alert variant="error" shake onClose={() => setError(null)}>
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
                    <Alert variant="success" onClose={() => setMessage(null)}>
                      {message}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="py-2">
                <OtpInput
                  value={codigo}
                  length={6}
                  disabled={loading}
                  isError={Boolean(error)}
                  onChange={value => {
                    setCodigo(value)
                    if (error) setError(null)
                  }}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || codigo.length !== 6}
                className="h-12 w-full justify-center rounded-xl text-base font-semibold disabled:opacity-50"
              >
                {loading ? 'Verificando…' : 'Verificar código'}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[0.88rem]">
                <span className="text-muted">¿No lo recibiste?</span>

                <button
                  type="button"
                  disabled={resending || countdown > 0}
                  onClick={handleResend}
                  className="cursor-pointer font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
                >
                  {resending ? 'Reenviando…' : 'Reenviar código'}
                </button>

                {countdown > 0 && (
                  <span className="font-semibold text-[#f97316]">
                    {formatCountdown(countdown)}
                  </span>
                )}
              </div>
            </form>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="rounded-[28px] border border-line/70 bg-surface px-8 py-12 text-center shadow-sm sm:px-10 sm:py-14">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.08 }}
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
              ¡Cuenta activada!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mt-2 max-w-[320px] text-[0.9rem] leading-relaxed text-ink-soft"
            >
              Tu correo fue verificado correctamente. Ya puedes iniciar sesión en NeoDent.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-8"
            >
              <Link
                to="/login"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand-dark"
              >
                Continuar
              </Link>
            </motion.div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}