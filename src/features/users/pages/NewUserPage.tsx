import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AnimatedSelect, Button, Card, Field, FieldCheck, FieldError, Input, MultiSelectChips, PageHead } from '@/shared/components/ui'
import { ApiError } from '@/shared/api/apiClient'
import { documentTypesApi, type TipoDocumentoOption } from '@/shared/api/documentTypesApi'
import { useAuth } from '@/features/auth'
import { EMAIL_RE } from '@/shared/lib/validation'
import { usersApi } from '../api/usersApi'
import { rolesApi, type RolResponse, } from '@/features/roles/api/rolesApi'
import { normalizarImagenAJpeg } from '@/shared/lib/image'

const INITIAL = {
  numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
  telefono: '', correo: '', numeroColegiatura: '',
}

const PHONE_RE = /^\+?\d{7,15}$/
const DOCUMENT_DELAY = 1500
const FIELD_DELAY = 600

type FormKey = keyof typeof INITIAL
type Errors = Partial<Record<FormKey | 'tipoDocumento' | 'roles' | 'especialidades', string>>

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

export function NewUserPage() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [form, setForm] = useState(INITIAL)
  const [roles, setRoles] = useState<string[]>([])
  const [rolesDisponibles, setRolesDisponibles] = useState<RolResponse[]>([])
  const [especialidades, setEspecialidades] = useState<{ id: number; nombre: string }[]>([])
  const [especialidadIds, setEspecialidadIds] = useState<string[]>([])
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoOption[]>([])
  const [tipoDocumentoId, setTipoDocumentoId] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoError, setFotoError] = useState('')
  const [dniValidado, setDniValidado] = useState(false)
  const [datosAutomaticos, setDatosAutomaticos] = useState(false)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [cargandoEspecialidades, setCargandoEspecialidades] = useState(false)
  const [cargandoRoles, setCargandoRoles,] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState('')

  const requestId = useRef(0)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const esOdontologo = roles.includes('ODONTOLOGO')
  const tipoDocumento = tiposDocumento.find(t => String(t.id) === tipoDocumentoId)
  const esDni = tipoDocumento?.codigo === 'DNI'
  const minDocumento = tipoDocumento?.longitudMin ?? 1
  const maxDocumento = tipoDocumento?.longitudMax ?? 20

  const rolOptions = rolesDisponibles
    .filter(rol => rol.activo && rol.nombre !== 'PACIENTE')
    .map(rol => ({
      value: rol.nombre,
      label: rol.nombre,
    }))

  const validarNumeroDocumento = (valor: string) => {
    const v = valor.trim()
    if (!tipoDocumentoId) return 'Selecciona un tipo de documento.'
    if (!v) return 'Ingresa el número de documento.'

    if (v.length < minDocumento || v.length > maxDocumento)
      return minDocumento === maxDocumento
        ? `El documento debe tener ${minDocumento} caracteres.`
        : `El documento debe tener entre ${minDocumento} y ${maxDocumento} caracteres.`

    if (esDni && !/^\d{8}$/.test(v))
      return 'El DNI debe contener exactamente 8 dígitos.'

    return ''
  }

  const documentoManualValido =
    !esDni && !!tipoDocumentoId && !validarNumeroDocumento(form.numeroDocumento)

  const documentoManualConfirmado = useDelayedValid(
    documentoManualValido,
    `${tipoDocumentoId}|${form.numeroDocumento}`,
    DOCUMENT_DELAY,
  )

  const documentoListo = esDni ? dniValidado : documentoManualConfirmado
  const camposBloqueados = esDni ? !dniValidado || datosAutomaticos : false

  const validarCampo = (key: FormKey, value: string): string => {
    const v = value.trim()

    switch (key) {
      case 'numeroDocumento':
        return validarNumeroDocumento(v)
      case 'nombres':
        return v.length < 2 ? 'Ingresa los nombres del trabajador.' : ''
      case 'apellidoPaterno':
        return v.length < 2 ? 'Ingresa el apellido paterno.' : ''
      case 'apellidoMaterno':
        return v && v.length < 2 ? 'Ingresa un apellido válido.' : ''
      case 'telefono':
        return v && !PHONE_RE.test(v)
          ? 'Ingresa un teléfono válido, por ejemplo +51987654321.'
          : ''
      case 'correo':
        return !EMAIL_RE.test(v)
          ? 'Ingresa un correo electrónico válido.'
          : ''
      case 'numeroColegiatura':
        return esOdontologo && !v
          ? 'Ingresa el número de colegiatura.'
          : ''
      default:
        return ''
    }
  }

  const nombreOk =
    documentoListo && !!form.nombres.trim() && !validarCampo('nombres', form.nombres)

  const paternoOk =
    documentoListo && !!form.apellidoPaterno.trim() &&
    !validarCampo('apellidoPaterno', form.apellidoPaterno)

  const maternoOk =
    documentoListo && !!form.apellidoMaterno.trim() &&
    !validarCampo('apellidoMaterno', form.apellidoMaterno)

  const telefonoOk =
    !!form.telefono.trim() && !validarCampo('telefono', form.telefono)

  const correoOk =
    !!form.correo.trim() && !validarCampo('correo', form.correo)

  const colegiaturaOk =
    esOdontologo && !!form.numeroColegiatura.trim() &&
    !validarCampo('numeroColegiatura', form.numeroColegiatura)

  const nombreConfirmado = useDelayedValid(
    nombreOk,
    `${documentoListo}|${form.nombres}`,
  )

  const paternoConfirmado = useDelayedValid(
    paternoOk,
    `${documentoListo}|${form.apellidoPaterno}`,
  )

  const maternoConfirmado = useDelayedValid(
    maternoOk,
    `${documentoListo}|${form.apellidoMaterno}`,
  )

  const telefonoConfirmado = useDelayedValid(
    telefonoOk,
    form.telefono,
  )

  const correoConfirmado = useDelayedValid(
    correoOk,
    form.correo,
  )

  const colegiaturaConfirmada = useDelayedValid(
    colegiaturaOk,
    `${esOdontologo}|${form.numeroColegiatura}`,
  )

  const confirmados: Partial<Record<FormKey, boolean>> = {
    nombres: nombreConfirmado,
    apellidoPaterno: paternoConfirmado,
    apellidoMaterno: maternoConfirmado,
    telefono: telefonoConfirmado,
    correo: correoConfirmado,
    numeroColegiatura: colegiaturaConfirmada,
  }

  const update = (key: FormKey, value: string) => {
    setForm(c => ({ ...c, [key]: value }))
    setErrors(c => ({ ...c, [key]: '' }))
    setError('')
  }

  const marcar = (key: FormKey) => {
    setErrors(c => ({ ...c, [key]: validarCampo(key, form[key]) }))
  }

  const check = (key: FormKey) => {
    if (errors[key]) return <FieldError invalid />
    return confirmados[key] ? <FieldCheck valid /> : null
  }

  const cambiarTipoDocumento = (id: string) => {
    requestId.current++
    setTipoDocumentoId(id)
    setDniValidado(false)
    setDatosAutomaticos(false)
    setChecking(false)

    setErrors(c => ({
      ...c,
      tipoDocumento: '',
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
    }))

    setForm(c => ({
      ...c,
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
    }))
  }

  const changeDocumento = (value: string) => {
    requestId.current++
    setDniValidado(false)
    setDatosAutomaticos(false)
    setChecking(false)
    setErrors(c => ({ ...c, numeroDocumento: '' }))
    setError('')

    const nuevo = esDni
      ? value.replace(/\D/g, '').slice(0, maxDocumento)
      : value.toUpperCase().replace(/\s/g, '').slice(0, maxDocumento)

    setForm(c => ({
      ...c,
      numeroDocumento: nuevo,
      ...(esDni
        ? { nombres: '', apellidoPaterno: '', apellidoMaterno: '' }
        : {}),
    }))
  }

  useEffect(() => {
    documentTypesApi.listar()
      .then(data => {
        setTiposDocumento(data)
        const inicial = data.find(t => t.codigo === 'DNI') ?? data[0]
        if (inicial) setTipoDocumentoId(String(inicial.id))
      })
      .catch(() =>
        setError('No se pudieron cargar los tipos de documento.')
      )
  }, [])

  useEffect(() => {
    if (!accessToken || !esDni || form.numeroDocumento.length !== 8 || !tipoDocumentoId) return

    const currentId = ++requestId.current
    const dni = form.numeroDocumento
    setChecking(true)

    const timer = window.setTimeout(async () => {
      try {
        const result = await usersApi.verificarDocumento(
          accessToken,
          Number(tipoDocumentoId),
          dni,
        )

        if (currentId !== requestId.current) return

        setDniValidado(result.disponible)
        setDatosAutomaticos(result.encontradoProveedor)

        setForm(c => ({
        ...c,
        nombres: result.nombres ?? '',
        apellidoPaterno: result.apellidoPaterno ?? '',
        apellidoMaterno: result.apellidoMaterno ?? '',
        }))

        setErrors(c => ({
        ...c,
        numeroDocumento: result.disponible ? '' : 'El documento no está disponible.',
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        }))
      } catch (err) {
        if (currentId !== requestId.current) return

        setDniValidado(false)
        setDatosAutomaticos(false)

        setErrors(c => ({
          ...c,
          numeroDocumento:
            err instanceof ApiError
              ? err.message
              : 'No se pudo consultar el DNI. Intenta nuevamente.',
        }))
      } finally {
        if (currentId === requestId.current) setChecking(false)
      }
    }, DOCUMENT_DELAY)

    return () => window.clearTimeout(timer)
  }, [accessToken, esDni, form.numeroDocumento, tipoDocumentoId])

  useEffect(() => {
    if (!accessToken) return

    let activo = true

    setCargandoRoles(true)

    rolesApi
      .listar(
        accessToken,
        true,
      )
      .then(data => {
        if (activo) {
          setRolesDisponibles(
            data,
          )
        }
      })
      .catch(() => {
        if (activo) {
          setError(
            'No se pudieron cargar los roles.',
          )
        }
      })
      .finally(() => {
        if (activo) {
          setCargandoRoles(
            false,
          )
        }
      })

    return () => {
      activo = false
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return

    let activo = true
    setCargandoEspecialidades(true)

    usersApi.listarEspecialidades(accessToken)
      .then(data => {
        if (activo) setEspecialidades(data)
      })
      .catch(() => {
        if (activo) setError('No se pudieron cargar las especialidades.')
      })
      .finally(() => {
        if (activo) setCargandoEspecialidades(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken])

  useEffect(() => {
    if (!foto) {
      setFotoPreview(null)
      return
    }

    const url = URL.createObjectURL(foto)
    setFotoPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [foto])

  useEffect(() => {
    if (esOdontologo) return

    setFoto(null)
    setFotoError('')
    setEspecialidadIds([])

    if (fotoInputRef.current)
      fotoInputRef.current.value = ''
  }, [esOdontologo])

  const seleccionarFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    const esImagen =
      archivo.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|avif|heic|jfif)$/i.test(archivo.name)

    if (!esImagen) {
      setFoto(null)
      setFotoError('Selecciona una imagen válida (JPG, PNG o WEBP).')
      e.target.value = ''
      return
    }

    if (archivo.size > 20 * 1024 * 1024) {
      setFoto(null)
      setFotoError('La fotografía no puede superar los 20 MB.')
      e.target.value = ''
      return
    }

    try {
      const archivoNormalizado = await normalizarImagenAJpeg(archivo)

      if (archivoNormalizado.size > 5 * 1024 * 1024) {
        setFoto(null)
        setFotoError('La fotografía procesada supera el límite de 5 MB.')
        e.target.value = ''
        return
      }

      setFoto(archivoNormalizado)
      setFotoError('')
    } catch {
      setFoto(null)
      setFotoError('El archivo seleccionado no contiene una imagen válida.')
      e.target.value = ''
    }
  }

  const quitarFoto = () => {
    setFoto(null)
    setFotoError('')

    if (fotoInputRef.current)
      fotoInputRef.current.value = ''
  }

  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (savingRef.current) return

    const campos: FormKey[] = [
      'numeroDocumento',
      'nombres',
      'apellidoPaterno',
      'apellidoMaterno',
      'telefono',
      'correo',
      ...(esOdontologo ? ['numeroColegiatura' as FormKey] : []),
    ]

    const nuevosErrores: Errors = {}

    if (!tipoDocumentoId) {
      nuevosErrores.tipoDocumento = 'Selecciona un tipo de documento.'
    }

    campos.forEach((k) => {
      const msg = validarCampo(k, form[k])

      if (msg) {
        nuevosErrores[k] = msg
      }
    })

    if (!roles.length) {
      nuevosErrores.roles = 'Selecciona al menos un rol.'
    }

    if (esOdontologo && !especialidadIds.length) {
      nuevosErrores.especialidades =
        'Selecciona al menos una especialidad.'
    }

    setErrors(nuevosErrores)
    setError('')

    if (!accessToken) {
      setError('Tu sesión ha expirado. Inicia sesión nuevamente.')
      return
    }

    if (!documentoListo) {
      setErrors((c) => ({
        ...c,
        numeroDocumento: esDni
          ? 'Primero debes validar el DNI.'
          : 'Espera un momento mientras validamos el formato del documento.',
      }))

      return
    }

    if (Object.keys(nuevosErrores).length) {
      return
    }

    savingRef.current = true
    setSaving(true)

    try {
      const usuarioCreado = await usersApi.crear(accessToken, {
        correo: form.correo.trim().toLowerCase(),
        roles,
        tipoDocumentoId: Number(tipoDocumentoId),
        numeroDocumento: form.numeroDocumento.trim(),
        nombres: form.nombres.trim(),
        apellidoPaterno: form.apellidoPaterno.trim(),
        apellidoMaterno: form.apellidoMaterno.trim() || null,
        telefono: form.telefono.trim() || null,
        numeroColegiatura: esOdontologo
          ? form.numeroColegiatura.trim()
          : null,
        especialidadIds: esOdontologo
          ? especialidadIds.map(Number)
          : [],
      })

      if (esOdontologo && foto) {
        try {
          const usuarioConFoto = await usersApi.subirFoto(
            accessToken,
            usuarioCreado.usuarioId,
            foto,
          )

          if (!usuarioConFoto.fotoNombreArchivo) {
            throw new Error(
              'El servidor no confirmó el guardado de la fotografía.',
            )
          }
        } catch (fotoErr) {
          const mensaje =
            fotoErr instanceof Error
              ? fotoErr.message
              : 'No se pudo subir la fotografía.'

          navigate('/usuarios', {
            replace: true,
            state: {
              aviso: {
                tipo: 'warning',
                texto:
                  `El trabajador fue registrado, pero la fotografía ` +
                  `no pudo guardarse: ${mensaje}`,
              },
            },
          })

          return
        }
      }

      navigate('/usuarios', {
        replace: true,
        state: {
          aviso: {
            tipo: 'success',
            texto: 'Trabajador registrado correctamente.',
          },
        },
      })
    } catch (err) {
      if (err instanceof ApiError) {
        const mensaje = err.message
        const texto = mensaje.toLowerCase()

        if (texto.includes('correo') || texto.includes('email')) {
          setErrors((c) => ({
            ...c,
            correo: mensaje,
          }))
        } else if (
          texto.includes('documento') ||
          texto.includes('dni') ||
          texto.includes('pasaporte') ||
          texto.includes('carné')
        ) {
          setErrors((c) => ({
            ...c,
            numeroDocumento: mensaje,
          }))
        } else if (texto.includes('colegiatura')) {
          setErrors((c) => ({
            ...c,
            numeroColegiatura: mensaje,
          }))
        } else if (texto.includes('especialidad')) {
          setErrors((c) => ({
            ...c,
            especialidades: mensaje,
          }))
        } else {
          setError(mensaje)
        }

        if (err.fieldErrors) {
          setErrors((c) => ({
            ...c,
            ...err.fieldErrors,
          }))
        }
      } else {
        setError(
          'No se pudo registrar al trabajador. Intenta nuevamente.',
        )
      }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const iniciales =
    `${form.nombres.trim().charAt(0)}${form.apellidoPaterno.trim().charAt(0)}`
      .toUpperCase() || 'OD'

  return (
    <>
      <PageHead
        title="Registrar trabajador"
        description="Configura sus datos personales, acceso al sistema y, si corresponde, su perfil profesional."
        actions={
          <Button variant="outline" onClick={() => navigate('/usuarios')} disabled={saving}>
            Volver a usuarios
          </Button>
        }
      />

      <Card className="mx-auto w-full min-w-0 max-w-5xl overflow-visible p-4 sm:p-7 lg:p-8">
        <form onSubmit={guardar} noValidate className="min-w-0 max-w-full space-y-5">
          <div>
            <label className="mb-2 block text-[0.92rem] font-bold text-ink">
              Roles del trabajador <span className="text-danger">*</span>
            </label>

            <MultiSelectChips
              options={rolOptions}
              value={roles}
              onChange={val => {
                setRoles(val)
                setErrors(c => ({ ...c, roles: '' }))
              }}
              placeholder={cargandoRoles ? 'Cargando roles…' : 'Selecciona uno o varios roles'}
              disabled={saving || cargandoRoles}
            />

            {errors.roles
              ? <p className="mt-1.5 text-xs text-danger">{errors.roles}</p>
              : <p className="mt-1.5 text-xs text-muted">
                  Puedes asignar más de un rol al mismo trabajador.
                </p>
            }
          </div>

          <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="w-full min-w-0 max-w-full">
                <Field label="Tipo de documento *">
                <AnimatedSelect
                    value={tipoDocumentoId}
                    options={tiposDocumento.map(t => ({
                    value: String(t.id),
                    label: `${t.codigo} · ${t.nombre}`,
                    }))}
                    onChange={cambiarTipoDocumento}
                    placeholder="Selecciona un documento"
                    disabled={saving}
                />
                </Field>

                {errors.tipoDocumento && (
                <p className="mt-1.5 break-words text-xs text-danger">
                    {errors.tipoDocumento}
                </p>
                )}
            </div>

            <div className="w-full min-w-0 max-w-full">
                <Field label="Número de documento *" error={errors.numeroDocumento}>
                <Input
                    icon="idCard"
                    placeholder={
                    esDni
                        ? 'Ej. 12345678'
                        : tipoDocumento?.codigo === 'CE'
                        ? 'Ej. 001234567'
                        : 'Ej. AB123456'
                    }
                    value={form.numeroDocumento}
                    onChange={e => changeDocumento(e.target.value)}
                    onBlur={() => marcar('numeroDocumento')}
                    inputMode={esDni ? 'numeric' : 'text'}
                    maxLength={maxDocumento}
                    disabled={saving}
                    trailing={
                    checking ? (
                        <span role="status" aria-label="Validando DNI" className="grid size-6 place-items-center">
                        <span className="size-4 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
                        </span>
                    ) : documentoListo ? (
                        <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="grid size-6 place-items-center rounded-full bg-success text-white"
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

                {!checking && esDni && dniValidado && datosAutomaticos && (
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

                {!checking && esDni && dniValidado && !datosAutomaticos && (
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

                {!esDni && tipoDocumento && form.numeroDocumento && !documentoManualConfirmado && (
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

                {!esDni && tipoDocumento && documentoManualConfirmado && (
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
              value={form.nombres}
              onChange={e => update('nombres', e.target.value)}
              onBlur={() => marcar('nombres')}
              trailing={check('nombres')}
              disabled={camposBloqueados || saving}
            />
          </Field>

          <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Apellido paterno *" error={errors.apellidoPaterno}>
              <Input
                icon="user"
                placeholder="Ej. Rojas"
                value={form.apellidoPaterno}
                onChange={e => update('apellidoPaterno', e.target.value)}
                onBlur={() => marcar('apellidoPaterno')}
                trailing={check('apellidoPaterno')}
                disabled={camposBloqueados || saving}
              />
            </Field>

            <Field label="Apellido materno" error={errors.apellidoMaterno}>
              <Input
                icon="user"
                placeholder="Opcional"
                value={form.apellidoMaterno}
                onChange={e => update('apellidoMaterno', e.target.value)}
                onBlur={() => marcar('apellidoMaterno')}
                trailing={check('apellidoMaterno')}
                disabled={camposBloqueados || saving}
              />
            </Field>

            <Field label="Teléfono" error={errors.telefono}>
              <Input
                icon="phone"
                placeholder="Ej. +51987654321"
                value={form.telefono}
                onChange={e =>
                  update(
                    'telefono',
                    e.target.value
                      .replace(/[^\d+]/g, '')
                      .replace(/(?!^)\+/g, '')
                      .slice(0, 16),
                  )
                }
                onBlur={() => marcar('telefono')}
                trailing={check('telefono')}
                inputMode="tel"
                maxLength={16}
                disabled={saving}
              />
            </Field>

            <Field label="Correo electrónico *" error={errors.correo}>
              <Input
                type="email"
                icon="mail"
                placeholder="usuario@correo.com"
                value={form.correo}
                onChange={e => update('correo', e.target.value)}
                onBlur={() => marcar('correo')}
                trailing={check('correo')}
                disabled={saving}
              />
            </Field>
          </div>

          <AnimatePresence initial={false}>
            {esOdontologo && (
              <motion.div
                key="datos-profesionales"
                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.995 }}
                transition={{ duration: 0.22 }}
                className="relative z-20"
              >
                <div className="space-y-4 rounded-card border border-line p-4">

                  <h2 className="font-bold text-ink">
                    Datos profesionales
                  </h2>

                  <div className="rounded-2xl border border-line bg-alt/40 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                      <div className="flex justify-center sm:block">
                        <div className="size-24 overflow-hidden rounded-full border-4 border-surface bg-brand-soft shadow-md">
                          {fotoPreview
                            ? (
                              <img
                                src={fotoPreview}
                                alt="Vista previa del odontólogo"
                                className="size-full object-cover"
                              />
                            )
                            : (
                              <div className="grid size-full place-items-center text-2xl font-bold text-brand">
                                {iniciales}
                              </div>
                            )
                          }
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink">
                          Fotografía profesional
                        </p>

                        <p className="mt-1 text-xs leading-5 text-muted">
                          Opcional. JPG, PNG o WEBP de hasta 5 MB.
                          NeoDents la optimizará automáticamente a WebP.
                        </p>

                        <input
                          ref={fotoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif,image/*"
                          onChange={seleccionarFoto}
                          disabled={saving}
                          className="hidden"
                        />

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fotoInputRef.current?.click()}
                            disabled={saving}
                          >
                            {foto
                              ? 'Cambiar fotografía'
                              : 'Seleccionar fotografía'}
                          </Button>

                          {foto && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={quitarFoto}
                              disabled={saving}
                            >
                              Quitar
                            </Button>
                          )}
                        </div>

                        {foto && !fotoError && (
                          <p className="mt-2 truncate text-xs text-muted">
                            {foto.name} · {(foto.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}

                        {fotoError && (
                          <p
                            role="alert"
                            className="mt-2 text-xs text-danger"
                          >
                            {fotoError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Field
                    label="Número de colegiatura *"
                    error={errors.numeroColegiatura}
                  >
                    <Input
                      icon="tooth"
                      placeholder="Ej. COP 12345"
                      value={form.numeroColegiatura}
                      onChange={e =>
                        update('numeroColegiatura', e.target.value)
                      }
                      onBlur={() => marcar('numeroColegiatura')}
                      trailing={check('numeroColegiatura')}
                      disabled={saving}
                    />
                  </Field>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-ink">
                      Especialidades{' '}
                      <span className="text-danger">*</span>
                    </label>

                    <MultiSelectChips
                      className="relative z-30"
                      options={especialidades.map(e => ({
                        value: String(e.id),
                        label: e.nombre,
                      }))}
                      value={especialidadIds}
                      onChange={val => {
                        setEspecialidadIds(val)
                        setErrors(c => ({
                          ...c,
                          especialidades: '',
                        }))
                      }}
                      placeholder={
                        cargandoEspecialidades
                          ? 'Cargando especialidades…'
                          : 'Selecciona una o varias especialidades'
                      }
                      disabled={saving || cargandoEspecialidades}
                    />

                    {errors.especialidades
                      ? (
                        <p className="mt-1.5 text-xs text-danger">
                          {errors.especialidades}
                        </p>
                      )
                      : (
                        <p className="mt-1.5 text-xs text-muted">
                          Puedes asignar varias especialidades al odontólogo.
                        </p>
                      )
                    }
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-muted">
            * Campos obligatorios. El trabajador recibirá una invitación
            por correo para activar su cuenta y crear su contraseña.
          </p>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/usuarios')}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={saving || checking || cargandoRoles || !documentoListo || (esOdontologo && cargandoEspecialidades)}
            >
              {saving ? 'Registrando…' : 'Registrar usuario'}
            </Button>

          </div>
        </form>
      </Card>
    </>
  )
}