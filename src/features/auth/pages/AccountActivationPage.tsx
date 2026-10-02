import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, AnimatedSelect, Button, Field, FieldCheck, FieldError, Icon, Input, OtpInput } from '@/shared/components/ui'
import { documentTypesApi, type TipoDocumentoOption } from '@/shared/api/documentTypesApi'
import { authApi } from '../api/authApi'
import { MIN_PASSWORD } from '@/shared/lib/validation'
import { ActivationCard } from '../components/ActivationCard'
import { SecurityVerification } from '../components/SecurityVerification'

type ActivationType = 'staff' | 'patient'
type Step = 'validando' | 'invalido' | 'documento' | 'codigo' | 'password' | 'completado'

interface Props {
  type: ActivationType
}

const OTP_RE = /^\d{6}$/
const DOCUMENT_DELAY = 1500
const FIELD_DELAY = 600

function useDelayedValid(valid: boolean, key: string, delay: number) {
  const [confirmedKey, setConfirmedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!valid) {
      setConfirmedKey(null)
      return
    }

    const timer = window.setTimeout(() => setConfirmedKey(key), delay)
    return () => window.clearTimeout(timer)
  }, [valid, key, delay])

  return valid && confirmedKey === key
}

export function AccountActivationPage({ type }: Props) {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [step, setStep] = useState<Step>('validando')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')

  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoOption[]>([])
  const [tipoDocumento, setTipoDocumento] = useState('DNI')
  const [numeroDocumento, setNumeroDocumento] = useState('')

  const [challengeId, setChallengeId] = useState<number | null>(null)
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [securityToken, setSecurityToken] = useState<string | null>(null)
  const [securityKey, setSecurityKey] = useState(0)

  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(45)

  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const tipoActual = tiposDocumento.find(t => t.codigo === tipoDocumento)
  const esDni = tipoDocumento === 'DNI'
  const minDocumento = tipoActual?.longitudMin ?? (esDni ? 8 : 1)
  const maxDocumento = tipoActual?.longitudMax ?? (esDni ? 8 : 20)

  const validarDocumento = (valor = numeroDocumento) => {
    const v = valor.trim()

    if (!v) return 'Ingresa tu número de documento.'

    if (v.length < minDocumento || v.length > maxDocumento) {
      return minDocumento === maxDocumento
        ? `El documento debe tener ${minDocumento} caracteres.`
        : `El documento debe tener entre ${minDocumento} y ${maxDocumento} caracteres.`
    }

    if (esDni && !/^\d{8}$/.test(v))
      return 'El DNI debe contener exactamente 8 dígitos.'

    return ''
  }

  const documentoFormatoValido = !validarDocumento()
  const documentoConfirmado = useDelayedValid(
    documentoFormatoValido && !!numeroDocumento,
    `${tipoDocumento}|${numeroDocumento}`,
    DOCUMENT_DELAY,
  )

  const passwordFormatoValido =
    password.length >= MIN_PASSWORD && password.length <= 100

  const confirmFormatoValido =
    !!confirmPassword && confirmPassword === password

  const passwordConfirmado = useDelayedValid(
    passwordFormatoValido,
    password,
    FIELD_DELAY,
  )

  const confirmPasswordConfirmado = useDelayedValid(
    confirmFormatoValido,
    `${password}|${confirmPassword}`,
    FIELD_DELAY,
  )

  const clearError = (field: string) => {
    setFieldErrors(current => ({ ...current, [field]: '' }))
    setError('')
  }

  const indicator = (field: string, valid: boolean) => {
    if (fieldErrors[field]) return <FieldError invalid />
    return valid ? <FieldCheck valid /> : null
  }

  useEffect(() => {
    documentTypesApi.listar()
      .then(lista => {
        setTiposDocumento(lista)
        const inicial = lista.find(t => t.codigo === 'DNI') ?? lista[0]
        if (inicial) setTipoDocumento(inicial.codigo)
      })
      .catch(() => setError('No se pudieron cargar los tipos de documento.'))
  }, [])

  useEffect(() => {
    let active = true

    setStep('validando')
    setError('')

    if (!token) {
      setStep('invalido')
      return
    }

    const request = type === 'staff'
      ? authApi.validateStaffInvitation(token)
      : authApi.validatePatientInvitation(token)

    request
      .then(response => {
        if (!active) return

        if (!response.valid) {
          setStep('invalido')
          return
        }

        setNombre(response.nombrePaciente)
        setCorreo(response.emailMasked)
        setStep('documento')
      })
      .catch(() => {
        if (active) setStep('invalido')
      })

    return () => {
      active = false
    }
  }, [token, type])

  useEffect(() => {
    if (step !== 'codigo' || countdown <= 0) return

    const timer = window.setTimeout(
      () => setCountdown(current => Math.max(0, current - 1)),
      1000,
    )

    return () => window.clearTimeout(timer)
  }, [step, countdown])

  const cambiarTipoDocumento = (codigoDocumento: string) => {
    setTipoDocumento(codigoDocumento)
    setNumeroDocumento('')
    setFieldErrors(current => ({ ...current, numeroDocumento: '' }))
    setError('')
  }

  const cambiarNumeroDocumento = (valor: string) => {
    const nuevo = esDni
      ? valor.replace(/\D/g, '').slice(0, maxDocumento)
      : valor.toUpperCase().replace(/\s/g, '').slice(0, maxDocumento)

    setNumeroDocumento(nuevo)
    clearError('numeroDocumento')
  }

  const formatTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  const startActivation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    const documentError = validarDocumento()

    if (documentError) {
      setFieldErrors({ numeroDocumento: documentError })
      return
    }

    if (!documentoConfirmado) {
      setFieldErrors({
        numeroDocumento: 'Espera un momento mientras validamos el formato del documento.',
      })
      return
    }

    if (!securityToken) {
      setError('Completa la verificación de seguridad.')
      return
    }

    setLoading(true)
    setError('')
    setFieldErrors({})

    const captcha = securityToken
    setSecurityToken(null)

    try {
      const response = type === 'staff'
        ? await authApi.startStaffActivation(
            token,
            tipoDocumento,
            numeroDocumento.trim(),
            captcha,
          )
        : await authApi.startPatientActivation(
            token,
            tipoDocumento,
            numeroDocumento.trim(),
            captcha,
          )

      setChallengeId(response.challengeId)
      setCorreo(response.emailMasked)
      setCodigo('')
      setCountdown(45)
      setStep('codigo')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo confirmar tu identidad.'

      if (/documento|identidad|DNI|pasaporte|carn[eé]/i.test(message))
        setFieldErrors({ numeroDocumento: message })
      else
        setError(message)

      setSecurityKey(current => current + 1)
    } finally {
      setLoading(false)
    }
  }

  const goToPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!OTP_RE.test(codigo)) {
      setFieldErrors({ codigo: 'Ingresa el código de 6 dígitos.' })
      return
    }

    setFieldErrors({})
    setError('')
    setStep('password')
  }

  const resendCode = async () => {
    if (challengeId === null || resending || loading || countdown > 0) return

    setResending(true)
    setError('')
    setFieldErrors({})

    try {
      const response = await authApi.resendCode(challengeId)

      setChallengeId(response.challengeId)
      setCodigo('')
      setCountdown(60)
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

  const completeActivation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading || challengeId === null) return

    const nextErrors: Record<string, string> = {}

    if (password.length < MIN_PASSWORD || password.length > 100)
      nextErrors.password =
        `La contraseña debe tener entre ${MIN_PASSWORD} y 100 caracteres.`

    if (!confirmPassword || confirmPassword !== password)
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.'

    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    setError('')

    try {
      if (type === 'staff') {
        await authApi.completeStaffActivation(
          token,
          challengeId,
          codigo,
          password,
        )
      } else {
        await authApi.completePatientActivation(
          token,
          challengeId,
          codigo,
          password,
        )
      }

      setPassword('')
      setConfirmPassword('')
      setCodigo('')

      window.history.replaceState(
        window.history.state,
        '',
        type === 'staff'
          ? '/activar-personal'
          : '/activate-account',
      )

      setStep('completado')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo activar tu cuenta.'

      if (/código|codigo|OTP|challenge|intentos/i.test(message)) {
        setFieldErrors({ codigo: message })
        setStep('codigo')
      } else if (/contraseña|password/i.test(message)) {
        setFieldErrors({ password: message })
      } else if (/invitación|invitacion|enlace|expirad/i.test(message)) {
        setStep('invalido')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (step === 'validando') {
    return (
      <ActivationCard title="Validando tu invitación">
        <p className="text-center text-sm text-muted">
          Espera un momento…
        </p>
      </ActivationCard>
    )
  }

  if (step === 'invalido') {
    return (
      <ActivationCard
        status="error"
        title="Enlace ya no válido"
        description="Este enlace de activación ha vencido o no es válido. Solicita uno nuevo para continuar."
      >
        <p className="text-center text-sm text-muted">
          Comunícate con la recepción o administración de NeoDents para solicitar una nueva invitación.
        </p>

        <Link
          to="/login"
          className="mt-7 flex h-12 items-center justify-center rounded-xl bg-brand font-semibold text-white"
        >
          Volver al inicio de sesión
        </Link>
      </ActivationCard>
    )
  }

  if (step === 'documento') {
    return (
      <ActivationCard
        title="Confirma tu identidad"
        description={
          <>
            {nombre ? `¡Hola, ${nombre}! ` : ''}
            Ingresa el documento con el que fuiste registrado para activar tu cuenta.
          </>
        }
      >
        <form
          onSubmit={startActivation}
          noValidate
          className="flex w-full min-w-0 max-w-full flex-col gap-5"
        >
          {error && (
            <Alert
              variant="error"
              shake
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          <div className="w-full min-w-0">
            <Field label="Tipo de documento">
              <AnimatedSelect
                value={tipoDocumento}
                options={tiposDocumento.map(t => ({
                  value: t.codigo,
                  label: `${t.codigo} · ${t.nombre}`,
                }))}
                onChange={cambiarTipoDocumento}
                placeholder="Selecciona tu documento"
                disabled={loading}
              />
            </Field>
          </div>

          <div className="w-full min-w-0">
            <Field
              label="Número de documento"
              error={fieldErrors.numeroDocumento}
            >
              <Input
                icon="idCard"
                value={numeroDocumento}
                placeholder={
                  esDni
                    ? 'Ingresa tu DNI'
                    : tipoDocumento === 'CE'
                      ? 'Ingresa tu carné de extranjería'
                      : 'Ingresa tu pasaporte'
                }
                inputMode={esDni ? 'numeric' : 'text'}
                maxLength={maxDocumento}
                disabled={loading}
                trailing={indicator(
                  'numeroDocumento',
                  documentoConfirmado,
                )}
                onChange={event =>
                  cambiarNumeroDocumento(event.target.value)
                }
              />
            </Field>

            {!!numeroDocumento && !documentoConfirmado && (
              <p className="mt-1.5 break-words text-xs text-muted">
                Validaremos el formato cuando dejes de escribir.
              </p>
            )}

            {documentoConfirmado && (
              <p className="mt-1.5 break-words text-xs font-semibold text-success">
                Formato de documento válido.
              </p>
            )}
          </div>

          <SecurityVerification
            resetKey={securityKey}
            onToken={setSecurityToken}
          />

          <Button
            type="submit"
            disabled={
              loading ||
              !securityToken ||
              !documentoConfirmado
            }
            className="h-12 w-full min-w-0 justify-center"
          >
            {loading
              ? 'Verificando…'
              : 'Continuar'}
          </Button>
        </form>
      </ActivationCard>
    )
  }

  if (step === 'codigo') {
    return (
      <ActivationCard
        title="Verifica tu correo"
        description={
          <>
            Te enviamos un código de verificación
            {correo ? <> a <strong>{correo}</strong></> : null}.
            Ingrésalo para continuar.
          </>
        }
      >
        <form
          onSubmit={goToPassword}
          className="flex w-full min-w-0 flex-col gap-6"
        >
          {error && (
            <Alert
              variant="error"
              shake
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          <OtpInput
            value={codigo}
            length={6}
            disabled={loading}
            isError={Boolean(fieldErrors.codigo)}
            onChange={value => {
              setCodigo(value)
              clearError('codigo')
            }}
          />

          {fieldErrors.codigo && (
            <p
              role="alert"
              className="break-words text-center text-sm text-danger"
            >
              {fieldErrors.codigo}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !OTP_RE.test(codigo)}
            className="h-12 w-full justify-center"
          >
            Continuar
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-muted">
              ¿No lo recibiste?
            </span>

            <button
              type="button"
              onClick={resendCode}
              disabled={countdown > 0 || resending || loading}
              className="font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resending
                ? 'Reenviando…'
                : 'Reenviar código'}
            </button>

            {countdown > 0 && (
              <span className="text-danger">
                {formatTime(countdown)}
              </span>
            )}
          </div>
        </form>
      </ActivationCard>
    )
  }

  if (step === 'password') {
    return (
      <ActivationCard
        title="Crea tu contraseña"
        description="Para proteger tu cuenta, crea una contraseña única y difícil de adivinar."
      >
        <form
          onSubmit={completeActivation}
          noValidate
          className="flex w-full min-w-0 flex-col gap-5"
        >
          {error && (
            <Alert
              variant="error"
              shake
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          <Field
            label="Nueva contraseña"
            error={fieldErrors.password}
          >
            <Input
              type={showPassword ? 'text' : 'password'}
              icon="lock"
              autoComplete="new-password"
              placeholder="Crea tu contraseña"
              value={password}
              disabled={loading}
              onChange={event => {
                setPassword(event.target.value)
                clearError('password')
              }}
              trailing={
                <span className="flex items-center gap-2">
                  {indicator(
                    'password',
                    passwordConfirmado,
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(value => !value)
                    }
                    aria-label={
                      showPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    <Icon
                      name={showPassword ? 'eyeOff' : 'eye'}
                      size={18}
                    />
                  </button>
                </span>
              }
            />
          </Field>

          <Field
            label="Confirmar contraseña"
            error={fieldErrors.confirmPassword}
          >
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              icon="lock"
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              disabled={loading}
              onChange={event => {
                setConfirmPassword(event.target.value)
                clearError('confirmPassword')
              }}
              trailing={
                <span className="flex items-center gap-2">
                  {indicator(
                    'confirmPassword',
                    confirmPasswordConfirmado,
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(value => !value)
                    }
                    aria-label={
                      showConfirmPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    <Icon
                      name={
                        showConfirmPassword
                          ? 'eyeOff'
                          : 'eye'
                      }
                      size={18}
                    />
                  </button>
                </span>
              }
            />
          </Field>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full min-w-0 justify-center"
          >
            {loading
              ? 'Activando cuenta…'
              : 'Crear mi cuenta'}
          </Button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setError('')
              setFieldErrors({})
              setStep('codigo')
            }}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Volver al código de verificación
          </button>
        </form>
      </ActivationCard>
    )
  }

  return (
    <ActivationCard
      status="success"
      title="Cuenta activada correctamente"
      description="Ya puedes acceder a NeoDents con tu correo y contraseña."
    >
      <Link
        to="/login"
        className="flex h-12 w-full min-w-0 items-center justify-center rounded-xl bg-brand font-semibold text-white hover:bg-brand-dark"
      >
        Iniciar sesión
      </Link>
    </ActivationCard>
  )
}