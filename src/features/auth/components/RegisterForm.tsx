import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Alert, AnimatedDatePicker, AnimatedSelect, Button, Checkbox, Field, FieldCheck, FieldError, Icon, Input } from '@/shared/components/ui'
import { documentTypesApi, type TipoDocumentoOption } from '@/shared/api/documentTypesApi'
import { ApiError } from '@/shared/api/apiClient'
import { EMAIL_RE, MIN_PASSWORD } from '@/shared/lib/validation'
import { authApi } from '../api/authApi'
import type { RegisterInput } from '../model/auth.types'
import { SecurityVerification } from './SecurityVerification'

type Errors = Partial<Record<keyof RegisterInput, string>>
type DocumentStatus = 'idle' | 'waiting' | 'checking' | 'valid' | 'conflict' | 'error'

const PHONE_RE = /^\+?\d{7,15}$/
const DOCUMENT_DELAY = 1500
const FIELD_DELAY = 600

const INITIAL_VALUES: RegisterInput = {
  tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidoPaterno: '',
  apellidoMaterno: '', fechaNacimiento: '', telefono: '', correo: '',
  password: '', confirmPassword: '', aceptaTerminos: false,
}

function useDelayedValid(valid: boolean, key: string, delay = FIELD_DELAY) {
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

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={show}
      className="grid size-8 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:text-ink">
      <Icon name={show ? 'eye' : 'eyeOff'} size={18} />
    </button>
  )
}

interface RegisterFormProps {
  onSubmit: (input: RegisterInput, turnstileToken: string) => Promise<void>
  initialValues?: Partial<RegisterInput>
}

export function RegisterForm({ onSubmit, initialValues }: RegisterFormProps) {
  const [values, setValues] = useState<RegisterInput>(() => ({ ...INITIAL_VALUES, ...initialValues }))
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoOption[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [securityToken, setSecurityToken] = useState<string | null>(null)
  const [securityKey, setSecurityKey] = useState(0)
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('idle')
  const [documentoValidado, setDocumentoValidado] = useState<string | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [datosAutocompletados, setDatosAutocompletados] = useState(false)

  const documentoActual = useRef('')
  const ultimoDocumentoConsultado = useRef<string | null>(null)
  const consultaActual = useRef(0)

  const tipoActual = tiposDocumento.find(t => t.codigo === values.tipoDocumento)
  const esDni = values.tipoDocumento === 'DNI'
  const minDocumento = tipoActual?.longitudMin ?? (esDni ? 8 : 1)
  const maxDocumento = tipoActual?.longitudMax ?? (esDni ? 8 : 20)

  const validarDocumento = (valor = values.numeroDocumento) => {
    const v = valor.trim()
    if (!v) return 'Ingresa el número de documento.'
    if (v.length < minDocumento || v.length > maxDocumento)
      return minDocumento === maxDocumento
        ? `El documento debe tener ${minDocumento} caracteres.`
        : `El documento debe tener entre ${minDocumento} y ${maxDocumento} caracteres.`
    if (esDni && !/^\d{8}$/.test(v)) return 'El DNI debe tener exactamente 8 dígitos.'
    return ''
  }

  const documentoFormatoValido = !validarDocumento()
  const documentoManualConfirmado = useDelayedValid(
    !esDni && documentoFormatoValido && !!values.numeroDocumento,
    `${values.tipoDocumento}|${values.numeroDocumento}`,
    DOCUMENT_DELAY,
  )

  const dniEstaValidado = esDni && documentStatus === 'valid' && documentoValidado === values.numeroDocumento
  const identidadLista = esDni ? dniEstaValidado : documentoManualConfirmado
  const puedeEditarDatos = !submitting && (!esDni || (dniEstaValidado && !datosAutocompletados))

  useEffect(() => {
    documentTypesApi.listar()
      .then(lista => {
        setTiposDocumento(lista)
        if (!lista.some(t => t.codigo === values.tipoDocumento) && lista[0])
          setValues(v => ({ ...v, tipoDocumento: lista[0].codigo }))
      })
      .catch(() => setServerError('No se pudieron cargar los tipos de documento.'))
  }, [])

  const update = <K extends keyof RegisterInput>(key: K, value: RegisterInput[K]) => {
    setValues(v => ({ ...v, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
    setServerError(null)
  }

  const cambiarTipoDocumento = (codigo: string) => {
    consultaActual.current++
    documentoActual.current = ''
    ultimoDocumentoConsultado.current = null
    setDocumentoValidado(null)
    setDocumentError(null)
    setDatosAutocompletados(false)
    setDocumentStatus('idle')
    setValues(v => ({
      ...v, tipoDocumento: codigo, numeroDocumento: '',
      nombres: '', apellidoPaterno: '', apellidoMaterno: '',
    }))
    setErrors(e => ({
      ...e, numeroDocumento: undefined, nombres: undefined,
      apellidoPaterno: undefined, apellidoMaterno: undefined,
    }))
  }

  const handleDocumentChange = (value: string) => {
    const nuevo = esDni
      ? value.replace(/\D/g, '').slice(0, maxDocumento)
      : value.toUpperCase().replace(/\s/g, '').slice(0, maxDocumento)

    documentoActual.current = nuevo
    consultaActual.current++
    ultimoDocumentoConsultado.current = null
    setDocumentoValidado(null)
    setDocumentError(null)
    setDatosAutocompletados(false)
    setDocumentStatus(esDni && nuevo.length === 8 ? 'waiting' : 'idle')
    setErrors(e => ({ ...e, numeroDocumento: undefined }))

    setValues(v => ({
      ...v, numeroDocumento: nuevo,
      ...(esDni ? { nombres: '', apellidoPaterno: '', apellidoMaterno: '' } : {}),
    }))
  }

  const handleCheckDni = useCallback(async (dni: string, token: string) => {
    const consultaId = ++consultaActual.current
    setDocumentStatus('checking')
    setDocumentError(null)
    setSecurityToken(null)

    try {
      const response = await authApi.checkPatientDocument('DNI', dni, token)
      if (consultaActual.current !== consultaId || documentoActual.current !== dni) return

      setDocumentoValidado(dni)
      setDocumentStatus('valid')
      setDatosAutocompletados(!response.manualEntryRequired)

      setValues(v => ({
        ...v,
        nombres: response.nombres ?? '',
        apellidoPaterno: response.apellidoPaterno ?? '',
        apellidoMaterno: response.apellidoMaterno ?? '',
      }))

      setErrors(e => ({
        ...e,
        numeroDocumento: undefined,
        nombres: undefined,
        apellidoPaterno: undefined,
        apellidoMaterno: undefined,
      }))
    } catch (error) {
      if (consultaActual.current !== consultaId || documentoActual.current !== dni) return

      setDocumentoValidado(null)
      setDatosAutocompletados(false)

      if (error instanceof ApiError && error.status === 409) {
        setDocumentStatus('conflict')
        setDocumentError('Este documento ya está registrado.')
      } else {
        setDocumentStatus('error')
        setDocumentError(error instanceof Error ? error.message : 'No se pudo validar el DNI.')
      }
    } finally {
      setSecurityKey(k => k + 1)
    }
  }, [])

  useEffect(() => {
    if (!esDni || !/^\d{8}$/.test(values.numeroDocumento) || !securityToken || submitting) return
    if (documentStatus !== 'waiting' || ultimoDocumentoConsultado.current === values.numeroDocumento) return

    const timer = window.setTimeout(() => {
      ultimoDocumentoConsultado.current = values.numeroDocumento
      void handleCheckDni(values.numeroDocumento, securityToken)
    }, DOCUMENT_DELAY)

    return () => window.clearTimeout(timer)
  }, [esDni, values.numeroDocumento, securityToken, documentStatus, submitting, handleCheckDni])

  const handleRetryDni = () => {
    consultaActual.current++
    ultimoDocumentoConsultado.current = null
    setDocumentError(null)
    setDocumentStatus('waiting')
    setSecurityToken(null)
    setSecurityKey(k => k + 1)
  }

  const validarFormulario = (): Errors => {
    const e: Errors = {}
    const errorDocumento = validarDocumento()
    if (errorDocumento) e.numeroDocumento = errorDocumento
    if (!values.nombres.trim()) e.nombres = 'Ingresa tus nombres.'
    if (!values.apellidoPaterno.trim()) e.apellidoPaterno = 'Ingresa tu apellido paterno.'

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
    if (!values.fechaNacimiento) e.fechaNacimiento = 'Ingresa tu fecha de nacimiento.'
    else if (values.fechaNacimiento > hoy) e.fechaNacimiento = 'La fecha no puede ser futura.'

    const telefono = values.telefono.replace(/[\s-]/g, '')
    if (!PHONE_RE.test(telefono))
      e.telefono = 'Ingresa un teléfono válido. Puedes usar código de país, por ejemplo +51987654321.'

    if (!EMAIL_RE.test(values.correo.trim())) e.correo = 'Ingresa un correo válido.'
    if (values.password.length < MIN_PASSWORD) e.password = `Debe tener al menos ${MIN_PASSWORD} caracteres.`
    if (!values.confirmPassword || values.confirmPassword !== values.password)
      e.confirmPassword = 'Las contraseñas no coinciden.'
    if (!values.aceptaTerminos) e.aceptaTerminos = 'Debes aceptar los términos y condiciones.'

    return e
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || documentStatus === 'checking') return

    const found = validarFormulario()
    if (esDni && !dniEstaValidado) found.numeroDocumento = 'Primero debes validar tu DNI.'
    if (!esDni && !documentoManualConfirmado)
      found.numeroDocumento = 'Espera un momento mientras validamos el formato del documento.'

    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    if (!securityToken) {
      setServerError('Completa la verificación de seguridad.')
      return
    }

    setSubmitting(true)
    setServerError(null)
    const token = securityToken
    setSecurityToken(null)

    try {
      await onSubmit({
        ...values,
        numeroDocumento: values.numeroDocumento.trim(),
        telefono: values.telefono.replace(/[\s-]/g, ''),
      }, token)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar el registro.'

      if (error instanceof ApiError && error.status === 409) {
        const campo = /teléfono|telefono/i.test(message) ? 'telefono'
          : /correo|email/i.test(message) ? 'correo'
            : /documento|DNI|pasaporte|carn[eé]/i.test(message) ? 'numeroDocumento'
              : null

        if (campo) setErrors(current => ({ ...current, [campo]: message }))
        else setServerError(message)
      } else setServerError(message)

      setSecurityKey(current => current + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

  const nombreOk = identidadLista && !!values.nombres.trim()
  const paternoOk = identidadLista && !!values.apellidoPaterno.trim()
  const maternoOk = identidadLista && !!values.apellidoMaterno.trim()
  const fechaOk = !!values.fechaNacimiento && values.fechaNacimiento <= hoy
  const telefonoOk = PHONE_RE.test(values.telefono.replace(/[\s-]/g, ''))
  const correoOk = EMAIL_RE.test(values.correo.trim())
  const passwordOk = values.password.length >= MIN_PASSWORD
  const confirmarOk = !!values.confirmPassword && values.confirmPassword === values.password

  const nombreConfirmado = useDelayedValid(nombreOk, `${identidadLista}|${values.nombres}`)
  const paternoConfirmado = useDelayedValid(paternoOk, `${identidadLista}|${values.apellidoPaterno}`)
  const maternoConfirmado = useDelayedValid(maternoOk, `${identidadLista}|${values.apellidoMaterno}`)
  const fechaConfirmada = useDelayedValid(fechaOk, values.fechaNacimiento)
  const telefonoConfirmado = useDelayedValid(telefonoOk, values.telefono)
  const correoConfirmado = useDelayedValid(correoOk, values.correo)
  const passwordConfirmado = useDelayedValid(passwordOk, values.password)
  const confirmarConfirmado = useDelayedValid(confirmarOk, `${values.password}|${values.confirmPassword}`)

  const indicador = (campo: keyof RegisterInput, valido: boolean) =>
    errors[campo] ? <FieldError invalid /> : valido ? <FieldCheck valid /> : null

  const documentIndicator = (
    <AnimatePresence mode="wait">
      {esDni && (documentStatus === 'waiting' || documentStatus === 'checking') && (
        <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0 }} role="status" aria-label="Validando documento"
          className="grid size-5 place-items-center">
          <span className="size-3.5 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
        </motion.span>
      )}

      {((esDni && documentStatus === 'valid') || (!esDni && documentoManualConfirmado)) && (
        <motion.span key="valid" initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid size-5 place-items-center rounded-full bg-success text-white">
          <Icon name="check" size={12} />
        </motion.span>
      )}

      {esDni && (documentStatus === 'conflict' || documentStatus === 'error') && (
        <motion.span key="invalid" initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid size-5 place-items-center rounded-full bg-danger-soft text-danger">
          <Icon name="warning" size={12} />
        </motion.span>
      )}
    </AnimatePresence>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full min-w-0 max-w-full flex-col gap-4">
      {serverError && (
        <Alert variant="error" shake onClose={() => setServerError(null)}>
          {serverError}
        </Alert>
      )}

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="w-full min-w-0">
          <Field label="Tipo de Documento">
            <AnimatedSelect
              value={values.tipoDocumento}
              options={tiposDocumento.map(t => ({ value: t.codigo, label: t.nombre }))}
              onChange={cambiarTipoDocumento}
              placeholder="Selecciona un documento"
              disabled={submitting}
            />
          </Field>
        </div>

        <div className="w-full min-w-0">
          <Field label="Número de Documento" error={errors.numeroDocumento}>
            <Input
              icon="idCard"
              placeholder={esDni ? 'Ej. 87654321' : values.tipoDocumento === 'CE' ? 'Ej. 001234567' : 'Ej. AB123456'}
              inputMode={esDni ? 'numeric' : 'text'}
              maxLength={maxDocumento}
              value={values.numeroDocumento}
              disabled={submitting}
              trailing={documentIndicator}
              onChange={e => handleDocumentChange(e.target.value)}
            />
          </Field>

          <AnimatePresence initial={false} mode="wait">
            {esDni && (documentStatus === 'waiting' || documentStatus === 'checking') && (
              <motion.p key="checking"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 text-[0.82rem] font-semibold text-brand">
                Validando DNI…
              </motion.p>
            )}

            {esDni && documentStatus === 'valid' && datosAutocompletados && (
              <motion.p key="found"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 text-[0.82rem] font-semibold text-success">
                DNI validado. Datos encontrados correctamente.
              </motion.p>
            )}

            {esDni && documentStatus === 'valid' && !datosAutocompletados && (
              <motion.p key="manual"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 text-[0.82rem] font-semibold text-ink-soft">
                DNI disponible. Completa tus datos manualmente.
              </motion.p>
            )}

            {!esDni && values.numeroDocumento && !documentoManualConfirmado && (
              <motion.p key="manual-waiting"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 text-[0.82rem] text-muted">
                Completa el documento. Validaremos el formato cuando dejes de escribir.
              </motion.p>
            )}

            {!esDni && documentoManualConfirmado && (
              <motion.p key="manual-ready"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 text-[0.82rem] font-semibold text-success">
                Formato válido. Completa tus datos personales manualmente.
              </motion.p>
            )}

            {esDni && documentStatus === 'conflict' && (
              <motion.p key="conflict" role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 text-[0.82rem] font-semibold text-danger">
                {documentError}{' '}
                <Link to="/login" className="font-semibold text-brand hover:underline">
                  Inicia sesión
                </Link>
              </motion.p>
            )}

            {esDni && documentStatus === 'error' && (
              <motion.p key="error" role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 text-[0.82rem] font-semibold text-danger">
                {documentError}{' '}
                <button type="button" onClick={handleRetryDni}
                  className="font-semibold text-brand hover:underline">
                  Reintentar
                </button>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Field label="Nombres" error={errors.nombres}>
        <Input icon="user" placeholder="Ej. María" autoComplete="given-name"
          value={values.nombres} disabled={!puedeEditarDatos}
          trailing={indicador('nombres', nombreConfirmado)}
          onChange={e => update('nombres', e.target.value)} />
      </Field>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Apellido Paterno" error={errors.apellidoPaterno}>
          <Input icon="user" placeholder="Ej. Rojas" autoComplete="family-name"
            value={values.apellidoPaterno} disabled={!puedeEditarDatos}
            trailing={indicador('apellidoPaterno', paternoConfirmado)}
            onChange={e => update('apellidoPaterno', e.target.value)} />
        </Field>

        <Field label="Apellido Materno (opcional)" error={errors.apellidoMaterno}>
          <Input icon="user" placeholder="Ej. Pérez"
            value={values.apellidoMaterno} disabled={!puedeEditarDatos}
            trailing={indicador('apellidoMaterno', maternoConfirmado)}
            onChange={e => update('apellidoMaterno', e.target.value)} />
        </Field>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Fecha de Nacimiento" error={errors.fechaNacimiento}>
          <AnimatedDatePicker
            value={values.fechaNacimiento}
            onChange={val => update('fechaNacimiento', val)}
            disabled={submitting}
            max={hoy}
            placeholder="dd/mm/aaaa"
            defaultViewDate="2000-01-01"
            trailing={indicador('fechaNacimiento', fechaConfirmada)}
          />
        </Field>

        <Field label="Teléfono" error={errors.telefono}>
          <Input icon="phone" placeholder="Ej. +51987654321" inputMode="tel"
            maxLength={16} autoComplete="tel" value={values.telefono}
            disabled={submitting}
            trailing={indicador('telefono', telefonoConfirmado)}
            onChange={e =>
              update('telefono',
                e.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 16))
            } />
        </Field>
      </div>

      <Field label="Correo electrónico" error={errors.correo}>
        <Input type="email" icon="mail" placeholder="Ingresa tu correo"
          autoComplete="email" value={values.correo} disabled={submitting}
          trailing={indicador('correo', correoConfirmado)}
          onChange={e => update('correo', e.target.value)} />
      </Field>

      <Field label="Contraseña" error={errors.password}>
        <Input type={showPassword ? 'text' : 'password'} icon="lock"
          placeholder="••••••••••••" autoComplete="new-password"
          value={values.password} disabled={submitting}
          onChange={e => update('password', e.target.value)}
          trailing={
            <span className="flex items-center gap-1">
              {indicador('password', passwordConfirmado)}
              <PasswordToggle show={showPassword}
                onToggle={() => setShowPassword(v => !v)} />
            </span>
          } />
      </Field>

      <Field label="Confirmar contraseña" error={errors.confirmPassword}>
        <Input type={showConfirm ? 'text' : 'password'} icon="lock"
          placeholder="••••••••••••" autoComplete="new-password"
          value={values.confirmPassword} disabled={submitting}
          onChange={e => update('confirmPassword', e.target.value)}
          trailing={
            <span className="flex items-center gap-1">
              {indicador('confirmPassword', confirmarConfirmado)}
              <PasswordToggle show={showConfirm}
                onToggle={() => setShowConfirm(v => !v)} />
            </span>
          } />
      </Field>

      <div>
        <Checkbox checked={values.aceptaTerminos}
          onChange={e => update('aceptaTerminos', e.target.checked)}
          label={
            <>Estoy de acuerdo con los{' '}
              <Link to="/terminos" className="font-bold text-brand hover:underline">
                Términos y condiciones
              </Link>
            </>
          } />
        {errors.aceptaTerminos && (
          <p className="mt-1 text-xs text-danger">{errors.aceptaTerminos}</p>
        )}
      </div>

      <SecurityVerification resetKey={securityKey} onToken={setSecurityToken} />

      <Button type="submit"
        disabled={submitting || !identidadLista || !securityToken}
        className="w-full justify-center disabled:opacity-60">
        {submitting ? 'Registrando…' : 'Registrar'}
      </Button>
    </form>
  )
}