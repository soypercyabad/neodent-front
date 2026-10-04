import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AnimatedSelect, Button, Card, DateField, Field, FieldCheck, FieldError, Input } from '@/shared/components/ui'
import { documentTypesApi, type TipoDocumentoOption } from '@/shared/api/documentTypesApi'
import { ApiError } from '@/shared/api/apiClient'
import { EMAIL_RE } from '@/shared/lib/validation'
import { useAuth } from '@/features/auth'
import {
  patientsApi,
  type ActualizarPacienteRequest,
  type CrearPacienteRequest,
  type PacienteResponse,
} from '../api/patientsApi'

const PHONE_RE = /^\+?\d{7,15}$/
const DOCUMENT_DELAY = 1500
const FIELD_DELAY = 600

type Values = {
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  fechaNacimiento: string
  telefono: string
  email: string
  direccion: string
}

type Errors = Partial<Record<keyof Values, string>>

function useDelayedValid(valid: boolean, key: string, delay = FIELD_DELAY) {
  const [confirmed, setConfirmed] = useState<string | null>(null)

  useEffect(() => {
    if (!valid) {
      setConfirmed(null)
      return
    }
    const timer = window.setTimeout(() => setConfirmed(key), delay)
    return () => window.clearTimeout(timer)
  }, [valid, key, delay])

  return valid && confirmed === key
}

interface Props {
  paciente?: PacienteResponse | null
  initialTipoDocumento?: string
  initialNumeroDocumento?: string
  saving?: boolean
  onSubmit: (data: CrearPacienteRequest | ActualizarPacienteRequest) => Promise<void>
  onCancel: () => void
}

export function PatientForm({
  paciente,
  initialTipoDocumento = 'DNI',
  initialNumeroDocumento = '',
  saving = false,
  onSubmit,
  onCancel,
}: Props) {
  const { accessToken } = useAuth()
  const editing = Boolean(paciente)
  const requestId = useRef(0)

  const [tipos, setTipos] = useState<TipoDocumentoOption[]>([])
  const [values, setValues] = useState<Values>({
    tipoDocumento: paciente?.tipoDocumento ?? initialTipoDocumento,
    numeroDocumento: paciente?.numeroDocumento ?? initialNumeroDocumento,
    nombres: paciente?.nombres ?? '',
    apellidoPaterno: paciente?.apellidoPaterno ?? '',
    apellidoMaterno: paciente?.apellidoMaterno ?? '',
    fechaNacimiento: paciente?.fechaNacimiento ?? '',
    telefono: paciente?.telefono ?? '',
    email: paciente?.email ?? '',
    direccion: paciente?.direccion ?? '',
  })

  const [errors, setErrors] = useState<Errors>({})
  const [checking, setChecking] = useState(false)
  const [dniValidado, setDniValidado] = useState(false)
  const [datosAutomaticos, setDatosAutomaticos] = useState(false)
  const [manualReady, setManualReady] = useState(
    (editing || Boolean(initialNumeroDocumento)) &&
      (paciente?.tipoDocumento ?? initialTipoDocumento) !== 'DNI',
  )

  useEffect(() => {
    documentTypesApi.listar().then(setTipos).catch(() => setTipos([]))
  }, [])

  const tipo = tipos.find(t => t.codigo === values.tipoDocumento)
  const esDni = values.tipoDocumento === 'DNI'
  const minDoc = tipo?.longitudMin ?? (esDni ? 8 : 1)
  const maxDoc = tipo?.longitudMax ?? (esDni ? 8 : 20)

  const errorDocumento = useMemo(() => {
    const v = values.numeroDocumento.trim()
    if (!v) return 'Ingresa el número de documento.'
    if (v.length < minDoc || v.length > maxDoc) {
      return minDoc === maxDoc
        ? `El documento debe tener ${minDoc} caracteres.`
        : `El documento debe tener entre ${minDoc} y ${maxDoc} caracteres.`
    }
    if (esDni && !/^\d{8}$/.test(v)) return 'El DNI debe tener exactamente 8 dígitos.'
    return ''
  }, [values.numeroDocumento, minDoc, maxDoc, esDni])

  const documentoListo = esDni ? dniValidado : manualReady
  const camposBloqueados = !editing && esDni ? !dniValidado || datosAutomaticos : false

  // Para documentos distintos a DNI: validar formato con delay
  useEffect(() => {
    if (editing || esDni || !tipo || !values.numeroDocumento || errorDocumento) {
      setManualReady(false)
      return
    }
    const timer = window.setTimeout(() => setManualReady(true), DOCUMENT_DELAY)
    return () => window.clearTimeout(timer)
  }, [editing, esDni, tipo, values.numeroDocumento, errorDocumento])

  // Para DNI: validación en 2 fases (1. base de datos SQL, 2. API RENIEC con fallback manual)
  useEffect(() => {
    if (editing || !accessToken || !esDni || values.numeroDocumento.length !== 8) {
      if (!editing && esDni && values.numeroDocumento.length !== 8) {
        setDniValidado(false)
        setDatosAutomaticos(false)
        setChecking(false)
      }
      return
    }

    const currentId = ++requestId.current
    const dni = values.numeroDocumento
    setChecking(true)
    setDniValidado(false)
    setDatosAutomaticos(false)

    const timer = window.setTimeout(async () => {
      try {
        // 1. Validar primero si el DNI ya existe en SQL
        let existeEnBd = false
        try {
          const pacienteExistente = await patientsApi.buscarPorDocumento(accessToken, 'DNI', dni)
          if (pacienteExistente && pacienteExistente.id) {
            existeEnBd = true
          }
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            existeEnBd = false
          } else {
            existeEnBd = false
          }
        }

        if (currentId !== requestId.current) return

        if (existeEnBd) {
          setDniValidado(false)
          setDatosAutomaticos(false)
          setErrors(c => ({
            ...c,
            numeroDocumento: 'Ya existe un paciente registrado con este DNI.',
            nombres: '',
            apellidoPaterno: '',
            apellidoMaterno: '',
          }))
          return
        }

        // 2. Si no existe en SQL, consultar la API externa (RENIEC)
        try {
          const result = await patientsApi.consultarDni(accessToken, dni)
          if (currentId !== requestId.current) return

          if (result && (result.nombres || result.apellidoPaterno)) {
            setDniValidado(true)
            setDatosAutomaticos(true)
            setValues(c => ({
              ...c,
              nombres: result.nombres ?? '',
              apellidoPaterno: result.apellidoPaterno ?? '',
              apellidoMaterno: result.apellidoMaterno ?? '',
            }))
            setErrors(c => ({
              ...c,
              numeroDocumento: '',
              nombres: '',
              apellidoPaterno: '',
              apellidoMaterno: '',
            }))
          } else {
            // API respondió sin datos: habilitar ingreso manual
            setDniValidado(true)
            setDatosAutomaticos(false)
            setErrors(c => ({ ...c, numeroDocumento: '' }))
          }
        } catch {
          if (currentId !== requestId.current) return
          // En cuanto falle la validación del API, desbloquear inputs y permitir ingreso manual
          setDniValidado(true)
          setDatosAutomaticos(false)
          setErrors(c => ({ ...c, numeroDocumento: '' }))
        }
      } finally {
        if (currentId === requestId.current) {
          setChecking(false)
        }
      }
    }, DOCUMENT_DELAY)

    return () => {
      window.clearTimeout(timer)
    }
  }, [editing, accessToken, esDni, values.numeroDocumento])

  const set = (key: keyof Values, value: string) => {
    setValues(v => ({ ...v, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  const changeDocumento = (val: string) => {
    requestId.current++
    setDniValidado(false)
    setDatosAutomaticos(false)
    setChecking(false)
    setErrors(c => ({ ...c, numeroDocumento: '' }))

    const nuevo = esDni
      ? val.replace(/\D/g, '').slice(0, maxDoc)
      : val.toUpperCase().replace(/\s/g, '').slice(0, maxDoc)

    setValues(c => ({
      ...c,
      numeroDocumento: nuevo,
      ...(esDni ? { nombres: '', apellidoPaterno: '', apellidoMaterno: '' } : {}),
    }))
  }

  const cambiarTipoDocumento = (nuevoTipo: string) => {
    requestId.current++
    setDniValidado(false)
    setDatosAutomaticos(false)
    setManualReady(false)
    setChecking(false)

    setErrors(c => ({
      ...c,
      tipoDocumento: '',
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
    }))

    setValues(c => ({
      ...c,
      tipoDocumento: nuevoTipo,
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
    }))
  }

  const validar = () => {
    const e: Errors = {}
    if (!editing && errorDocumento) e.numeroDocumento = errorDocumento
    if (values.nombres.trim().length < 2) e.nombres = 'Ingresa los nombres del paciente.'
    if (values.apellidoPaterno.trim().length < 2) e.apellidoPaterno = 'Ingresa el apellido paterno.'
    if (values.apellidoMaterno.trim() && values.apellidoMaterno.trim().length < 2) {
      e.apellidoMaterno = 'Ingresa un apellido válido.'
    }

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
    if (values.fechaNacimiento && values.fechaNacimiento > hoy) {
      e.fechaNacimiento = 'La fecha no puede ser futura.'
    }
    if (values.telefono.trim() && !PHONE_RE.test(values.telefono.trim())) {
      e.telefono = 'Ingresa un teléfono válido.'
    }
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
      e.email = 'Ingresa un correo válido.'
    }
    return e
  }

  const nombreOk = useDelayedValid(
    documentoListo && values.nombres.trim().length >= 2,
    `${documentoListo}|${values.nombres}`,
  )
  const paternoOk = useDelayedValid(
    documentoListo && values.apellidoPaterno.trim().length >= 2,
    `${documentoListo}|${values.apellidoPaterno}`,
  )
  const maternoOk = useDelayedValid(
    documentoListo && (!values.apellidoMaterno.trim() || values.apellidoMaterno.trim().length >= 2),
    `${documentoListo}|${values.apellidoMaterno}`,
  )
  const telefonoOk = useDelayedValid(!values.telefono || PHONE_RE.test(values.telefono), values.telefono)
  const emailOk = useDelayedValid(!values.email || EMAIL_RE.test(values.email), values.email)

  const indicator = (key: keyof Values, ok: boolean) =>
    errors[key] ? <FieldError invalid /> : ok && values[key] ? <FieldCheck valid /> : null

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    const found = validar()
    setErrors(found)

    if (Object.keys(found).length) return

    if (!editing && !documentoListo) {
      setErrors(current => ({
        ...current,
        numeroDocumento: esDni
          ? 'Primero debes validar el DNI.'
          : 'Espera un momento mientras validamos el formato del documento.',
      }))
      return
    }

    if (editing) {
      await onSubmit({
        nombres: values.nombres.trim(),
        apellidoPaterno: values.apellidoPaterno.trim(),
        apellidoMaterno: values.apellidoMaterno.trim() || null,
        fechaNacimiento: values.fechaNacimiento || null,
        telefono: values.telefono.trim() || null,
        email: values.email.trim().toLowerCase() || null,
        direccion: values.direccion.trim() || null,
      })
      return
    }

    await onSubmit({
      tipoDocumento: values.tipoDocumento,
      numeroDocumento: values.numeroDocumento.trim(),
      nombres: values.nombres.trim(),
      apellidoPaterno: values.apellidoPaterno.trim(),
      apellidoMaterno: values.apellidoMaterno.trim() || null,
      fechaNacimiento: values.fechaNacimiento || null,
      telefono: values.telefono.trim() || null,
      email: values.email.trim().toLowerCase() || null,
      direccion: values.direccion.trim() || null,
    })
  }

  return (
    <Card className="mx-auto w-full max-w-5xl p-4 sm:p-7">
      <form onSubmit={guardar} className="grid min-w-0 gap-4" noValidate>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo de documento *">
            <AnimatedSelect
              value={values.tipoDocumento}
              options={tipos.map(t => ({
                value: t.codigo,
                label: `${t.codigo} · ${t.nombre}`,
              }))}
              onChange={cambiarTipoDocumento}
              disabled={editing || saving}
            />
          </Field>

          <div>
            <Field label="Número de documento *" error={errors.numeroDocumento}>
              <Input
                icon="idCard"
                placeholder={
                  esDni
                    ? 'Ej. 12345678'
                    : tipo?.codigo === 'CE'
                    ? 'Ej. 001234567'
                    : 'Ej. AB123456'
                }
                value={values.numeroDocumento}
                disabled={editing || saving}
                inputMode={esDni ? 'numeric' : 'text'}
                maxLength={maxDoc}
                onChange={e => changeDocumento(e.target.value)}
                trailing={
                  checking ? (
                    <span role="status" aria-label="Validando DNI" className="grid size-6 place-items-center">
                      <span className="size-4 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
                    </span>
                  ) : !editing && documentoListo ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="grid size-6 place-items-center rounded-full bg-success text-xs font-bold text-white"
                    >
                      ✓
                    </motion.span>
                  ) : null
                }
              />
            </Field>

            <AnimatePresence mode="wait" initial={false}>
              {checking && (
                <motion.p
                  key="checking"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-1.5 flex min-w-0 items-center gap-2 break-words text-xs font-semibold text-brand"
                >
                  <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-brand" />
                  Validando DNI…
                </motion.p>
              )}

              {!checking && !editing && esDni && dniValidado && datosAutomaticos && (
                <motion.p
                  key="automatico"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-1.5 break-words text-xs font-semibold text-success"
                >
                  DNI validado. Datos encontrados correctamente.
                </motion.p>
              )}

              {!checking && !editing && esDni && dniValidado && !datosAutomaticos && (
                <motion.p
                  key="manual-dni"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-1.5 break-words text-xs font-semibold text-ink-soft"
                >
                  DNI disponible. Completa los datos manualmente.
                </motion.p>
              )}

              {!checking && !editing && !esDni && tipo && values.numeroDocumento && !manualReady && (
                <motion.p
                  key="manual-espera"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-1.5 break-words text-xs text-muted"
                >
                  Validaremos el formato cuando dejes de escribir.
                </motion.p>
              )}

              {!checking && !editing && !esDni && tipo && manualReady && (
                <motion.p
                  key="manual-listo"
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-1.5 break-words text-xs font-semibold text-success"
                >
                  Formato válido. Completa los datos personales manualmente.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Field label="Nombres *" error={errors.nombres}>
          <Input
            icon="user"
            placeholder="Ej. María"
            value={values.nombres}
            onChange={e => set('nombres', e.target.value)}
            disabled={saving || camposBloqueados}
            trailing={indicator('nombres', nombreOk)}
          />
        </Field>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Apellido paterno *" error={errors.apellidoPaterno}>
            <Input
              icon="user"
              placeholder="Ej. Rojas"
              value={values.apellidoPaterno}
              onChange={e => set('apellidoPaterno', e.target.value)}
              disabled={saving || camposBloqueados}
              trailing={indicator('apellidoPaterno', paternoOk)}
            />
          </Field>

          <Field label="Apellido materno" error={errors.apellidoMaterno}>
            <Input
              icon="user"
              placeholder="Opcional"
              value={values.apellidoMaterno}
              onChange={e => set('apellidoMaterno', e.target.value)}
              disabled={saving || camposBloqueados}
              trailing={indicator('apellidoMaterno', maternoOk)}
            />
          </Field>

          <Field label="Fecha de nacimiento" error={errors.fechaNacimiento}>
            <DateField
              value={values.fechaNacimiento}
              onChange={val => set('fechaNacimiento', val)}
              placeholder="dd/mm/aaaa"
              max={new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })}
              min="1900-01-01"
              align="left"
              defaultViewDate="2000-01-01"
              disabled={saving}
            />
          </Field>

          <Field label="Teléfono" error={errors.telefono}>
            <Input
              icon="phone"
              placeholder="Ej. +51987654321"
              value={values.telefono}
              inputMode="tel"
              maxLength={16}
              onChange={e =>
                set(
                  'telefono',
                  e.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 16),
                )
              }
              disabled={saving}
              trailing={indicator('telefono', telefonoOk)}
            />
          </Field>
        </div>

        <div>
          <Field label="Correo electrónico" error={errors.email}>
            <Input
              type="email"
              icon="mail"
              placeholder="paciente@correo.com"
              value={values.email}
              onChange={e => set('email', e.target.value)}
              disabled={saving}
              trailing={indicator('email', emailOk)}
            />
          </Field>
          {editing && paciente?.tieneCuenta && (
            <p className="mt-1.5 text-xs text-ink-soft">
              Nota: Al modificar el correo de un paciente con cuenta, se actualizará su credencial de acceso y su cuenta pasará a <span className="font-semibold text-warning">Pendiente</span> hasta verificar el nuevo correo.
            </p>
          )}
        </div>

        <Field label="Dirección">
          <Input
            icon="location"
            placeholder="Ej. Av. Larco 123, Miraflores"
            value={values.direccion}
            onChange={e => set('direccion', e.target.value)}
            disabled={saving}
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>

          <Button type="submit" disabled={saving || checking}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar paciente'}
          </Button>
        </div>
      </form>
    </Card>
  )
}