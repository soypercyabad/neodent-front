import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Avatar,
  BackLink,
  Badge,
  Button,
  Card,
  Icon,
} from '@/shared/components/ui'
import { apiBlob } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth'
import { formatPhone } from '@/shared/lib/format'
import { usersApi, type UsuarioInternoResponse } from '../api/usersApi'
import {
  esOdontologo as checkEsOdontologo,
  nombreCompleto,
  prefijoProfesional,
  rolBadgeInfo,
} from '../model/users.helpers'

export function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  const usuarioId = Number(id)
  const idValido = Number.isSafeInteger(usuarioId) && usuarioId > 0

  const [usuario, setUsuario] = useState<UsuarioInternoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actualizacion, setActualizacion] = useState(0)

  useEffect(() => {
    if (!accessToken || !idValido) {
      setUsuario(null)
      setError(idValido ? 'No se encontró una sesión activa.' : 'El identificador del usuario no es válido.')
      setLoading(false)
      return
    }

    let activo = true
    setLoading(true)
    setError('')

    usersApi
      .obtener(accessToken, usuarioId)
      .then(userData => {
        if (activo) {
          setUsuario(userData)
        }
      })
      .catch(err => {
        if (!activo) return
        setUsuario(null)
        setError(err instanceof Error ? err.message : 'No se pudo consultar el usuario.')
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, usuarioId, idValido, actualizacion])

  useEffect(() => {
    if (!accessToken || !usuario?.odontologoId || !usuario.fotoNombreArchivo) {
      setFotoUrl(null)
      return
    }

    let activo = true
    let url: string | null = null

    apiBlob(`/api/odontologos/${usuario.odontologoId}/foto`, accessToken)
      .then(blob => {
        if (!activo) return
        url = URL.createObjectURL(blob)
        setFotoUrl(url)
      })
      .catch(() => {
        if (activo) setFotoUrl(null)
      })

    return () => {
      activo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [accessToken, usuario?.odontologoId, usuario?.fotoNombreArchivo])

  const esMedico = usuario ? checkEsOdontologo(usuario) : false
  const documentoTexto = usuario
    ? usuario.tipoDocumentoCodigo
      ? `${usuario.tipoDocumentoCodigo} - ${usuario.numeroDocumento}`
      : usuario.numeroDocumento
    : 'No registrado'

  const nombreCompletoTexto = usuario ? nombreCompleto(usuario) : ''

  return (
    <div className="space-y-6">
      {/* RETORNO */}
      <div className="flex items-center justify-between">
        <BackLink to="/usuarios">Volver a personal</BackLink>
      </div>

      {/* ESTADO DE CARGA */}
      {loading && (
        <Card className="flex items-center justify-center gap-3 p-12">
          <Icon name="spinner" size={22} className="animate-spin text-brand" />
          <p className="text-sm text-muted">Cargando información del colaborador…</p>
        </Card>
      )}

      {/* ERROR */}
      {!loading && error && (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <Icon name="warning" size={32} className="text-danger" />
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
          <Button variant="ghost" onClick={() => setActualizacion(n => n + 1)}>
            Intentar nuevamente
          </Button>
        </Card>
      )}

      {/* CONTENIDO PRINCIPAL (IDÉNTICO A LA FICHA DEL PACIENTE) */}
      {!loading && usuario && !error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* CABECERA NEGRA (IDÉNTICA A LA FICHA DE PACIENTE DE LA CAPTURA) */}
          <div className="bg-[#181a24] text-white p-5 sm:p-7 rounded-2xl shadow-lg border border-slate-800">
            <div className="flex items-center gap-5 sm:gap-6 min-w-0">
              <div className="shrink-0 relative">
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt={`Foto de ${nombreCompletoTexto}`}
                    className="size-[76px] rounded-full object-cover ring-4 ring-white/10 shadow-xl"
                  />
                ) : (
                  <Avatar
                    nombre={usuario.nombres}
                    apellido={usuario.apellidoPaterno}
                    seed={usuario.usuarioId}
                    size={76}
                    animate="always"
                    trackCursor={true}
                    className="ring-4 ring-white/10 shadow-xl"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-white tracking-tight leading-tight truncate">
                  {prefijoProfesional(usuario)}
                  {nombreCompletoTexto}
                </h1>

                <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Documento</span>
                    <span className="font-semibold text-white truncate block mt-0.5">{documentoTexto}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo electrónico</span>
                    <span className="font-semibold text-white truncate block mt-0.5" title={usuario.correo}>
                      {usuario.correo || 'No registrado'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Teléfono</span>
                    <span className="font-semibold text-white truncate block mt-0.5">
                      {usuario.telefono ? formatPhone(usuario.telefono) : 'No registrado'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Rol principal</span>
                    <span className="font-semibold text-white truncate block mt-0.5">
                      {usuario.roles.map(r => rolBadgeInfo(r).label).join(', ')}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Usuario / COP</span>
                    <span className="font-semibold text-white truncate block mt-0.5">
                      {esMedico && usuario.numeroColegiatura
                        ? (usuario.numeroColegiatura.toUpperCase().startsWith('COP')
                            ? usuario.numeroColegiatura
                            : `COP ${usuario.numeroColegiatura}`)
                        : `@${usuario.aliasInterno}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 1: RESUMEN DEL PERSONAL (3 TARJETAS HORIZONTALES) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-ink">Resumen del personal</h2>
              <span className="text-xs text-muted">Información general de la cuenta</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* CARD 1: ESTADO DEL COLABORADOR */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line shadow-xs flex items-center gap-4">
                <div
                  className={`size-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    usuario.personalActivo
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  <Icon name="shield" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-muted font-medium">Estado del colaborador</span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-ink">
                      {usuario.personalActivo ? 'Personal Activo' : 'Personal Inactivo'}
                    </span>
                    <Badge tone={usuario.estado === 'ACTIVO' ? 'blue' : 'gray'}>
                      {usuario.estado === 'ACTIVO' ? 'Portal activo' : 'Sin portal'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* CARD 2: ESTADO DEL CORREO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line shadow-xs flex items-center gap-4">
                <div
                  className={`size-12 rounded-xl flex items-center justify-center shrink-0 border ${
                    usuario.correo
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}
                >
                  <Icon name={usuario.correo ? 'check' : 'alertCircle'} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-muted font-medium">Estado del correo</span>
                  <span className="text-sm sm:text-base font-bold text-ink mt-1 block truncate">
                    {usuario.correo ? 'Correo verificado' : 'Sin correo'}
                  </span>
                </div>
              </div>

              {/* CARD 3: SEDE DE REGISTRO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line shadow-xs flex items-center gap-4">
                <div className="size-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <Icon name="home" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-muted font-medium">Sede de registro</span>
                  <span className="text-sm sm:text-base font-bold text-ink mt-1 block truncate">
                    Sede Principal
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: INFORMACIÓN DETALLADA (2 TARJETAS EN GRID) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-ink">Información detallada</h2>
              <span className="text-xs text-muted">Información de identificación y cuenta</span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* CARD 1: DATOS PERSONALES Y CONTACTO (CON BOTÓN ÚNICO EDITAR DATOS) */}
              <Card className="p-6">
                <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Datos personales y contacto</h3>
                    <p className="text-xs text-muted">Información de identificación del colaborador</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon="edit"
                    onClick={() => navigate(`/usuarios/${usuario.usuarioId}/editar`)}
                  >
                    Editar datos
                  </Button>
                </div>

                <div className="divide-y divide-line/60">
                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Documento de identidad</span>
                    <span className="font-semibold text-ink">{documentoTexto}</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Nombres completos</span>
                    <span className="font-semibold text-ink">{nombreCompletoTexto}</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Teléfono</span>
                    <span className="font-semibold text-ink">
                      {usuario.telefono ? formatPhone(usuario.telefono) : 'No registrado'}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Correo electrónico</span>
                    <span className="font-semibold text-ink break-all">
                      {usuario.correo || 'No registrado'}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Usuario institucional</span>
                    <span className="font-semibold text-ink">
                      @{usuario.aliasInterno}
                    </span>
                  </div>
                </div>
              </Card>

              {/* CARD 2: CUENTA Y REGISTRO */}
              <Card className="p-6">
                <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Cuenta y registro</h3>
                    <p className="text-xs text-muted">Acceso al portal y actividad de la cuenta</p>
                  </div>

                  <Badge tone={usuario.estado === 'ACTIVO' ? 'blue' : 'gray'}>
                    {usuario.estado === 'ACTIVO' ? 'Portal activo' : 'Sin portal'}
                  </Badge>
                </div>

                <div className="divide-y divide-line/60">
                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Verificación de correo</span>
                    <span className="font-semibold text-emerald-600 inline-flex items-center gap-1.5">
                      <Icon name="check" size={13} />
                      <span>Correo verificado</span>
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Canal de registro</span>
                    <span className="font-semibold text-ink inline-flex items-center gap-1.5">
                      <Icon name="globe" size={13} className="text-muted" />
                      <span>Sistema interno Neodent</span>
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Sede de registro</span>
                    <span className="font-semibold text-ink">Sede Principal</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted">Rol asignado</span>
                    <span className="font-semibold text-ink">
                      {usuario.roles.map(r => rolBadgeInfo(r).label).join(', ')}
                    </span>
                  </div>

                  {esMedico ? (
                    <>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Colegiatura COP</span>
                        <span className="font-semibold text-ink">
                          {usuario.numeroColegiatura
                            ? (usuario.numeroColegiatura.toUpperCase().startsWith('COP')
                                ? usuario.numeroColegiatura
                                : `COP ${usuario.numeroColegiatura}`)
                            : 'No registrado'}
                        </span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Especialidad</span>
                        <span className="font-semibold text-ink text-right">
                          {usuario.especialidades.length > 0
                            ? usuario.especialidades.join(', ')
                            : 'Odontología General'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                      <span className="text-muted">Tipo de personal</span>
                      <span className="font-semibold text-ink">Personal Administrativo</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}