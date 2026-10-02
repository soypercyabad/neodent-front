import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AnimatedSelect, Avatar, Button, Card, Field, FieldCheck, FieldError, Input, MultiSelectChips, PageHead } from '@/shared/components/ui'
import { apiBlob, ApiError } from '@/shared/api/apiClient'
import { documentTypesApi, type TipoDocumentoOption } from '@/shared/api/documentTypesApi'
import { useAuth } from '@/features/auth'
import { rolesApi, type RolResponse } from '@/features/roles/api/rolesApi'
import { EMAIL_RE, MIN_PASSWORD } from '@/shared/lib/validation'
import { usersApi, type UsuarioInternoResponse } from '../api/usersApi'
import { useNavigate, useParams } from 'react-router-dom'
import { normalizarImagenAJpeg } from '@/shared/lib/image'

const PHONE_RE = /^\+?\d{7,15}$/
const FIELD_DELAY = 600
const INITIAL = {
  numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
  telefono: '', correo: '', numeroColegiatura: '', nuevaContrasena: '',
}

type FormKey = keyof typeof INITIAL
type Errors = Partial<Record<FormKey | 'tipoDocumento' | 'roles' | 'especialidades', string>>

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

function CurrentPhoto({
  usuario,
  accessToken,
}: {
  usuario: UsuarioInternoResponse
  accessToken: string | null
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!usuario.odontologoId || !usuario.fotoNombreArchivo || !accessToken) {
      setSrc(null)
      return
    }

    let activo = true
    let url: string | null = null

    apiBlob(`/api/odontologos/${usuario.odontologoId}/foto`, accessToken)
      .then(blob => {
        if (!activo) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => {
        if (activo) setSrc(null)
      })

    return () => {
      activo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [
    usuario.odontologoId,
    usuario.fotoNombreArchivo,
    accessToken,
  ])

  if (!src) {
    return (
      <Avatar
        nombre={usuario.nombres}
        apellido={usuario.apellidoPaterno}
        seed={usuario.usuarioId}
        size={96}
        animate="hover"
        trackCursor={false}
      />
    )
  }

  return (
    <img
      src={src}
      alt={`Foto de ${usuario.nombres}`}
      className="size-24 rounded-full object-cover"
    />
  )
}

export function EditUserPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const usuarioId = Number(id)

  const [usuario, setUsuario] = useState<UsuarioInternoResponse | null>(null)
  const [form, setForm] = useState(INITIAL)

  const [roles, setRoles] = useState<string[]>([])
  const [rolesDisponibles, setRolesDisponibles] = useState<RolResponse[]>([])
  const [especialidades, setEspecialidades] = useState<{ id: number; nombre: string }[]>([])
  const [especialidadIds, setEspecialidadIds] = useState<string[]>([])

  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoOption[]>([])
  const [tipoDocumentoId, setTipoDocumentoId] = useState('')

  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [eliminarFoto, setEliminarFoto] = useState(false)
  const [fotoError, setFotoError] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState('')

  const fotoInputRef = useRef<HTMLInputElement>(null)

  const esOdontologo = roles.includes('ODONTOLOGO')

  const tipoDocumento =
    tiposDocumento.find(t => String(t.id) === tipoDocumentoId)

  const esDni = tipoDocumento?.codigo === 'DNI'
  const minDocumento = tipoDocumento?.longitudMin ?? 1
  const maxDocumento = tipoDocumento?.longitudMax ?? 20

  const rolOptions = rolesDisponibles
    .filter(r => r.activo && r.nombre !== 'PACIENTE')
    .map(r => ({
      value: r.nombre,
      label: r.nombre,
    }))

  useEffect(() => {
    if (
      !accessToken ||
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0
    ) {
      setLoading(false)
      setError('Usuario no válido.')
      return
    }

    let activo = true

    setLoading(true)
    setError('')

    Promise.all([
      usersApi.obtener(accessToken, usuarioId),
      documentTypesApi.listar(),
      usersApi.listarEspecialidades(accessToken),
      rolesApi.listar(accessToken, true),
    ])
      .then(([u, tipos, especialidadesData, rolesData]) => {
        if (!activo) return

        setUsuario(u)
        setTiposDocumento(tipos)
        setEspecialidades(especialidadesData)
        setRolesDisponibles(rolesData)

        setTipoDocumentoId(String(u.tipoDocumentoId))
        setRoles(u.roles)
        setEspecialidadIds(u.especialidadIds.map(String))

        setForm({
          numeroDocumento: u.numeroDocumento,
          nombres: u.nombres,
          apellidoPaterno: u.apellidoPaterno,
          apellidoMaterno: u.apellidoMaterno ?? '',
          telefono: u.telefono ?? '',
          correo: u.correo,
          numeroColegiatura: u.numeroColegiatura ?? '',
          nuevaContrasena: '',
        })
      })
      .catch(e => {
        if (activo) {
          setError(
            e instanceof Error
              ? e.message
              : 'No se pudo cargar el usuario.',
          )
        }
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, usuarioId])

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

    setEspecialidadIds([])
    setFoto(null)
    setEliminarFoto(false)
    setFotoError('')

    if (fotoInputRef.current) {
      fotoInputRef.current.value = ''
    }
  }, [esOdontologo])

  const validarDocumento = (valor: string) => {
    const v = valor.trim()

    if (!tipoDocumentoId)
      return 'Selecciona un tipo de documento.'

    if (!v)
      return 'Ingresa el número de documento.'

    if (
      v.length < minDocumento ||
      v.length > maxDocumento
    ) {
      return minDocumento === maxDocumento
        ? `El documento debe tener ${minDocumento} caracteres.`
        : `El documento debe tener entre ${minDocumento} y ${maxDocumento} caracteres.`
    }

    if (esDni && !/^\d{8}$/.test(v))
      return 'El DNI debe tener exactamente 8 dígitos.'

    return ''
  }

  const validarCampo = (
    key: FormKey,
    value: string,
  ) => {
    const v = value.trim()

    if (key === 'numeroDocumento')
      return validarDocumento(v)

    if (key === 'nombres')
      return v.length < 2
        ? 'Ingresa los nombres del trabajador.'
        : ''

    if (key === 'apellidoPaterno')
      return v.length < 2
        ? 'Ingresa el apellido paterno.'
        : ''

    if (key === 'apellidoMaterno')
      return v && v.length < 2
        ? 'Ingresa un apellido válido.'
        : ''

    if (key === 'telefono')
      return v && !PHONE_RE.test(v)
        ? 'Ingresa un teléfono válido.'
        : ''

    if (key === 'correo')
      return !EMAIL_RE.test(v)
        ? 'Ingresa un correo válido.'
        : ''

    if (key === 'numeroColegiatura')
      return esOdontologo && !v
        ? 'Ingresa la colegiatura.'
        : ''

    if (key === 'nuevaContrasena')
      return v && v.length < MIN_PASSWORD
        ? `Debe tener al menos ${MIN_PASSWORD} caracteres.`
        : ''

    return ''
  }

  const update = (
    key: FormKey,
    value: string,
  ) => {
    setForm(c => ({ ...c, [key]: value }))
    setErrors(c => ({ ...c, [key]: '' }))
    setError('')
  }

  const marcar = (key: FormKey) => {
    setErrors(c => ({
      ...c,
      [key]: validarCampo(key, form[key]),
    }))
  }

  const campoOk = (key: FormKey) =>
    !!form[key].trim() &&
    !validarCampo(key, form[key])

  const nombreOk =
    useDelayedValid(
      campoOk('nombres'),
      form.nombres,
    )

  const paternoOk =
    useDelayedValid(
      campoOk('apellidoPaterno'),
      form.apellidoPaterno,
    )

  const telefonoOk =
    useDelayedValid(
      campoOk('telefono'),
      form.telefono,
    )

  const correoOk =
    useDelayedValid(
      campoOk('correo'),
      form.correo,
    )

  const colegiaturaOk =
    useDelayedValid(
      esOdontologo &&
      campoOk('numeroColegiatura'),
      form.numeroColegiatura,
    )

  const passOk =
    useDelayedValid(
      campoOk('nuevaContrasena'),
      form.nuevaContrasena,
    )

  const check = (
    key: FormKey,
    ok: boolean,
  ) => {
    if (errors[key])
      return <FieldError invalid />

    return ok
      ? <FieldCheck valid />
      : null
  }

  const seleccionarFoto = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
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
      setEliminarFoto(false)
      setFotoError('')
    } catch {
      setFoto(null)
      setFotoError('El archivo seleccionado no contiene una imagen válida.')
      e.target.value = ''
    }
  }

  const quitarFoto = () => {
    setFoto(null)
    setEliminarFoto(true)
    setFotoError('')

    if (fotoInputRef.current) {
      fotoInputRef.current.value = ''
    }
  }

  const guardar = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()

    if (!accessToken || saving) return

    const nuevos: Errors = {}

    ;[
      'numeroDocumento',
      'nombres',
      'apellidoPaterno',
      'apellidoMaterno',
      'telefono',
      'correo',
      'nuevaContrasena',
    ].forEach(key => {
      const k = key as FormKey
      const msg = validarCampo(k, form[k])

      if (msg) nuevos[k] = msg
    })

    if (esOdontologo) {
      const msg =
        validarCampo(
          'numeroColegiatura',
          form.numeroColegiatura,
        )

      if (msg)
        nuevos.numeroColegiatura = msg
    }

    if (!tipoDocumentoId)
      nuevos.tipoDocumento =
        'Selecciona un tipo de documento.'

    if (!roles.length)
      nuevos.roles =
        'Selecciona al menos un rol.'

    if (
      esOdontologo &&
      !especialidadIds.length
    ) {
      nuevos.especialidades =
        'Selecciona al menos una especialidad.'
    }

    setErrors(nuevos)

    if (Object.keys(nuevos).length) return

    setSaving(true)
    setError('')

    try {
      await usersApi.actualizar(
        accessToken,
        usuarioId,
        {
          correo:
            form.correo
              .trim()
              .toLowerCase(),

          nuevaContrasena:
            form.nuevaContrasena.trim() ||
            null,

          roles,

          tipoDocumentoId:
            Number(tipoDocumentoId),

          numeroDocumento:
            form.numeroDocumento.trim(),

          nombres:
            form.nombres.trim(),

          apellidoPaterno:
            form.apellidoPaterno.trim(),

          apellidoMaterno:
            form.apellidoMaterno.trim() ||
            null,

          telefono:
            form.telefono.trim() ||
            null,

          numeroColegiatura:
            esOdontologo
              ? form.numeroColegiatura.trim()
              : null,

          especialidadIds:
            esOdontologo
              ? especialidadIds.map(Number)
              : [],
        },
      )

      if (esOdontologo && foto) {
        const actualizado =
          await usersApi.subirFoto(
            accessToken,
            usuarioId,
            foto,
          )

        if (!actualizado.fotoNombreArchivo) {
          throw new Error(
            'El servidor no confirmó el guardado de la fotografía.',
          )
        }
      } else if (
        esOdontologo &&
        eliminarFoto &&
        usuario?.fotoNombreArchivo
      ) {
        await usersApi.eliminarFoto(
          accessToken,
          usuarioId,
        )
      }

      navigate(
        `/usuarios/${usuarioId}`,
        {
          replace: true,
          state: {
            aviso: {
              tipo: 'success',
              texto:
                'Trabajador actualizado correctamente.',
            },
          },
        },
      )
    } catch (e) {
      const mensaje =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo actualizar el trabajador.'

      const texto = mensaje.toLowerCase()

      if (
        texto.includes('correo') ||
        texto.includes('email')
      ) {
        setErrors(c => ({
          ...c,
          correo: mensaje,
        }))
      } else if (
        texto.includes('documento') ||
        texto.includes('dni') ||
        texto.includes('pasaporte') ||
        texto.includes('carné')
      ) {
        setErrors(c => ({
          ...c,
          numeroDocumento: mensaje,
        }))
      } else if (
        texto.includes('colegiatura')
      ) {
        setErrors(c => ({
          ...c,
          numeroColegiatura: mensaje,
        }))
      } else if (
        texto.includes('especialidad')
      ) {
        setErrors(c => ({
          ...c,
          especialidades: mensaje,
        }))
      } else if (
        texto.includes('rol')
      ) {
        setErrors(c => ({
          ...c,
          roles: mensaje,
        }))
      } else {
        setError(mensaje)
      }

      if (
        e instanceof ApiError &&
        e.fieldErrors
      ) {
        setErrors(c => ({
          ...c,
          ...e.fieldErrors,
        }))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-10 text-center text-sm text-muted">
        Cargando trabajador…
      </Card>
    )
  }

  if (!usuario) {
    return (
      <Card className="p-10 text-center text-sm text-danger">
        {error || 'Usuario no encontrado.'}
      </Card>
    )
  }

  const iniciales =
    `${form.nombres.trim().charAt(0)}${form.apellidoPaterno.trim().charAt(0)}`
      .toUpperCase() || 'OD'

  return (
    <>
      <PageHead
        title="Editar trabajador"
        description={`Actualiza la información y permisos de ${usuario.nombres} ${usuario.apellidoPaterno}.`}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                `/usuarios/${usuarioId}`,
              )
            }
          >
            Cancelar edición
          </Button>
        }
      />

      <Card className="mx-auto w-full min-w-0 max-w-5xl overflow-visible p-4 sm:p-7 lg:p-8">
        <form
          onSubmit={guardar}
          noValidate
          className="min-w-0 space-y-5"
        >
          <div>
            <label className="mb-2 block text-[0.92rem] font-bold text-ink">
              Roles del trabajador{' '}
              <span className="text-danger">
                *
              </span>
            </label>

            <MultiSelectChips
              options={rolOptions}
              value={roles}
              onChange={value => {
                setRoles(value)

                setErrors(c => ({
                  ...c,
                  roles: '',
                }))
              }}
              placeholder="Selecciona uno o varios roles"
              disabled={saving}
            />

            {errors.roles ? (
              <p className="mt-1.5 text-xs text-danger">
                {errors.roles}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted">
                Debe conservar al menos un rol operativo.
              </p>
            )}
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Tipo de documento *"
              error={errors.tipoDocumento}
            >
              <AnimatedSelect
                value={tipoDocumentoId}
                options={
                  tiposDocumento.map(t => ({
                    value: String(t.id),
                    label:
                      `${t.codigo} · ${t.nombre}`,
                  }))
                }
                onChange={value => {
                  setTipoDocumentoId(value)

                  setErrors(c => ({
                    ...c,
                    tipoDocumento: '',
                    numeroDocumento: '',
                  }))
                }}
                disabled={saving}
              />
            </Field>

            <Field
              label="Número de documento *"
              error={errors.numeroDocumento}
            >
              <Input
                icon="idCard"
                value={form.numeroDocumento}
                inputMode={
                  esDni
                    ? 'numeric'
                    : 'text'
                }
                maxLength={maxDocumento}
                disabled={saving}
                onBlur={() =>
                  marcar('numeroDocumento')
                }
                onChange={e =>
                  update(
                    'numeroDocumento',
                    esDni
                      ? e.target.value
                          .replace(/\D/g, '')
                          .slice(
                            0,
                            maxDocumento,
                          )
                      : e.target.value
                          .toUpperCase()
                          .replace(/\s/g, '')
                          .slice(
                            0,
                            maxDocumento,
                          ),
                  )
                }
              />
            </Field>
          </div>

          <Field
            label="Nombres *"
            error={errors.nombres}
          >
            <Input
              icon="user"
              value={form.nombres}
              disabled={saving}
              onBlur={() =>
                marcar('nombres')
              }
              onChange={e =>
                update(
                  'nombres',
                  e.target.value,
                )
              }
              trailing={
                check(
                  'nombres',
                  nombreOk,
                )
              }
            />
          </Field>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Apellido paterno *"
              error={errors.apellidoPaterno}
            >
              <Input
                icon="user"
                value={form.apellidoPaterno}
                disabled={saving}
                onBlur={() =>
                  marcar('apellidoPaterno')
                }
                onChange={e =>
                  update(
                    'apellidoPaterno',
                    e.target.value,
                  )
                }
                trailing={
                  check(
                    'apellidoPaterno',
                    paternoOk,
                  )
                }
              />
            </Field>

            <Field
              label="Apellido materno"
              error={errors.apellidoMaterno}
            >
              <Input
                icon="user"
                value={form.apellidoMaterno}
                disabled={saving}
                onBlur={() =>
                  marcar('apellidoMaterno')
                }
                onChange={e =>
                  update(
                    'apellidoMaterno',
                    e.target.value,
                  )
                }
              />
            </Field>

            <Field
              label="Teléfono"
              error={errors.telefono}
            >
              <Input
                icon="phone"
                value={form.telefono}
                disabled={saving}
                inputMode="tel"
                maxLength={16}
                onBlur={() =>
                  marcar('telefono')
                }
                onChange={e =>
                  update(
                    'telefono',
                    e.target.value
                      .replace(
                        /[^\d+]/g,
                        '',
                      )
                      .replace(
                        /(?!^)\+/g,
                        '',
                      )
                      .slice(0, 16),
                  )
                }
                trailing={
                  check(
                    'telefono',
                    telefonoOk,
                  )
                }
              />
            </Field>

            <Field
              label="Correo electrónico *"
              error={errors.correo}
            >
              <Input
                type="email"
                icon="mail"
                value={form.correo}
                disabled={saving}
                onBlur={() =>
                  marcar('correo')
                }
                onChange={e =>
                  update(
                    'correo',
                    e.target.value,
                  )
                }
                trailing={
                  check(
                    'correo',
                    correoOk,
                  )
                }
              />
            </Field>
          </div>

          <Field
            label="Nueva contraseña (opcional)"
            error={errors.nuevaContrasena}
          >
            <Input
              type="password"
              icon="lock"
              value={form.nuevaContrasena}
              disabled={saving}
              autoComplete="new-password"
              placeholder="Déjalo vacío para conservar la actual"
              onBlur={() =>
                marcar('nuevaContrasena')
              }
              onChange={e =>
                update(
                  'nuevaContrasena',
                  e.target.value,
                )
              }
              trailing={
                check(
                  'nuevaContrasena',
                  passOk,
                )
              }
            />
          </Field>

          <AnimatePresence initial={false}>
            {esOdontologo && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -6,
                }}
                className="relative z-20 space-y-4 rounded-card border border-line p-4"
              >
                <h2 className="font-bold text-ink">
                  Datos profesionales
                </h2>

                <div className="flex flex-col gap-4 rounded-2xl bg-alt/40 p-4 sm:flex-row sm:items-center">
                  <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-surface bg-brand-soft text-2xl font-bold text-brand shadow-md">
                    {fotoPreview ? (
                      <img
                        src={fotoPreview}
                        alt="Nueva fotografía"
                        className="size-full object-cover"
                      />
                    ) : eliminarFoto ||
                      !usuario.fotoNombreArchivo ? (
                      iniciales
                    ) : (
                      <CurrentPhoto
                        usuario={usuario}
                        accessToken={accessToken}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">
                      Fotografía profesional
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      JPG, PNG o WEBP de hasta 5 MB.
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
                        onClick={() =>
                          fotoInputRef.current?.click()
                        }
                        disabled={saving}
                      >
                        {foto ||
                        (
                          usuario.fotoNombreArchivo &&
                          !eliminarFoto
                        )
                          ? 'Cambiar fotografía'
                          : 'Seleccionar fotografía'}
                      </Button>

                      {(foto ||
                        (
                          usuario.fotoNombreArchivo &&
                          !eliminarFoto
                        )) && (
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

                    {fotoError && (
                      <p className="mt-2 text-xs text-danger">
                        {fotoError}
                      </p>
                    )}
                  </div>
                </div>

                <Field
                  label="Número de colegiatura *"
                  error={errors.numeroColegiatura}
                >
                  <Input
                    icon="tooth"
                    value={form.numeroColegiatura}
                    disabled={saving}
                    onBlur={() =>
                      marcar('numeroColegiatura')
                    }
                    onChange={e =>
                      update(
                        'numeroColegiatura',
                        e.target.value,
                      )
                    }
                    trailing={
                      check(
                        'numeroColegiatura',
                        colegiaturaOk,
                      )
                    }
                  />
                </Field>

                <div>
                  <label className="mb-2 block text-sm font-bold text-ink">
                    Especialidades{' '}
                    <span className="text-danger">
                      *
                    </span>
                  </label>

                  <MultiSelectChips
                    options={
                      especialidades.map(e => ({
                        value:
                          String(e.id),
                        label: e.nombre,
                      }))
                    }
                    value={especialidadIds}
                    onChange={value => {
                      setEspecialidadIds(value)

                      setErrors(c => ({
                        ...c,
                        especialidades: '',
                      }))
                    }}
                    disabled={saving}
                  />

                  {errors.especialidades && (
                    <p className="mt-1.5 text-xs text-danger">
                      {errors.especialidades}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p
              role="alert"
              className="text-sm text-danger"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  `/usuarios/${usuarioId}`,
                )
              }
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'Guardando…'
                : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}