import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Checkbox, Field, Icon, Input } from '@/shared/components/ui'
import { ApiError } from '@/shared/api/apiClient'
import { EMAIL_RE } from '@/shared/lib/validation'
import type { Credentials } from '../model/auth.types'

interface Errors {
  correo?: string
  password?: string
}

function validate(values: Credentials): Errors {
  const errors: Errors = {}
  if (!values.correo.trim()) errors.correo = 'Ingresa tu correo electrónico.'
  else if (!EMAIL_RE.test(values.correo.trim())) errors.correo = 'El correo no tiene un formato válido.'
  if (!values.password) errors.password = 'Ingresa tu contraseña.'
  return errors
}

interface LoginFormProps {
  onSubmit: (credentials: Credentials) => Promise<void>
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [values, setValues] = useState<Credentials>({ correo: '', password: '', recordarme: true })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [activationRequired, setActivationRequired] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const update = <K extends keyof Credentials>(key: K, value: Credentials[K]) => {
    setValues(v => ({ ...v, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
    setServerError(null)
    setActivationRequired(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) return

    setSubmitting(true)
    setServerError(null)
    setActivationRequired(false)

    try {
      await onSubmit(values)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión.'
      setServerError(message)
      setActivationRequired(
        err instanceof ApiError &&
        err.status === 403 &&
        /cuenta.*no ha sido activada/i.test(message)
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {serverError && (
        <Alert variant="error" shake onClose={() => { setServerError(null); setActivationRequired(false) }}>
          {serverError}
        </Alert>
      )}

      {activationRequired && (
        <Link
          to="/activar-cuenta-pendiente"
          state={{ correo: values.correo.trim().toLowerCase() }}
          className="text-center text-sm font-semibold text-brand hover:underline"
        >
          Activar mi cuenta
        </Link>
      )}

      <Field label="Correo electrónico" error={errors.correo}>
        <Input type="email" name="correo" icon="user" placeholder="Ingresa tu correo"
          autoComplete="email" value={values.correo} disabled={submitting}
          onChange={e => update('correo', e.target.value)} />
      </Field>

      <Field label="Contraseña" error={errors.password}>
        <Input type={showPassword ? 'text' : 'password'} name="password" icon="lock"
          placeholder="••••••••••••" autoComplete="current-password"
          value={values.password} disabled={submitting}
          onChange={e => update('password', e.target.value)}
          trailing={
            <button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <Icon name={showPassword ? 'eye' : 'eyeOff'} size={20} />
            </button>
          } />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Checkbox label="Recuérdame" name="recordarme" checked={values.recordarme}
          onChange={e => update('recordarme', e.target.checked)} />
        <Link to="/recuperar" className="text-[0.88rem] font-bold text-brand hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button type="submit" disabled={submitting} className="w-full justify-center disabled:opacity-60">
        {submitting ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </form>
  )
}