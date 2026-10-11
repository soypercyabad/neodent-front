import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, BackLink, Badge, Button, Card, Icon, InfoRow, Tooltip } from '@/shared/components/ui'
import { apiBlob } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth'
import { formatPhone } from '@/shared/lib/format'
import { usersApi, type UsuarioInternoResponse } from '../api/usersApi'
import {
  estadoUsuario,
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
  const estado = usuario ? estadoUsuario(usuario) : null
  const documentoTexto = usuario
    ? usuario.tipoDocumentoCodigo
      ? `${usuario.tipoDocumentoCodigo} · ${usuario.numeroDocumento}`
      : usuario.numeroDocumento
    : 'No registrado'

  return (
    <>
      <BackLink to="/usuarios">Volver a Personal</BackLink>

      {/* CARGA */}
      {loading && (
        <Card className="mt-4 flex items-center justify-center gap-3 p-12">
          <Icon name="spinner" size={22} className="animate-spin text-brand" />
          <p className="text-sm text-muted">Cargando información del trabajador…</p>
        </Card>
      )}

      {/* ERROR */}
      {!loading && error && (
        <Card className="mt-4 flex flex-col items-center gap-4 p-10 text-center">
          <Icon name="warning" size={32} className="text-danger" />
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <Button variant="ghost" onClick={() => setActualizacion(n => n + 1)}>
            Intentar nuevamente
          </Button>
        </Card>
      )}

      {/* FICHA REAL */}
      {!loading && usuario && !error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 space-y-5"
        >
          {/* ENCABEZADO */}
          <Card className="overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="relative shrink-0">
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt={`Foto de ${nombreCompleto(usuario)}`}
                    className="size-[100px] rounded-full object-cover ring-4 ring-brand-soft shadow-md"
                  />
                ) : (
                  <Avatar
                    nombre={usuario.nombres}
                    apellido={usuario.apellidoPaterno}
                    seed={usuario.usuarioId}
                    size={100}
                    animate="hover"
                    trackCursor={false}
                    className="ring-4 ring-brand-soft shadow-md"
                  />
                )}

                {estado?.texto ? (
                  <Tooltip
                    content={`Estado: ${estado.texto}`}
                    className="absolute bottom-1 right-1"
                  >
                    <span
                      className={`block size-5 rounded-full border-2 border-surface ${
                        estado.tono === 'green'
                          ? 'bg-emerald-500'
                          : estado.tono === 'amber'
                            ? 'bg-amber-500'
                            : estado.tono === 'red'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                      }`}
                    />
                  </Tooltip>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {prefijoProfesional(usuario)}
                  {nombreCompleto(usuario)}
                </h1>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {usuario.roles.map(rol => {
                    const badge = rolBadgeInfo(rol)
                    return (
                      <Badge key={rol} tone={badge.tone}>
                        {badge.label}
                      </Badge>
                    )
                  })}

                  {estado && <Badge tone={estado.tono}>{estado.texto}</Badge>}
                </div>
              </div>

              <Button
                variant="ghost"
                icon="edit"
                onClick={() => navigate(`/usuarios/${usuario.usuarioId}/editar`)}
              >
                Editar datos
              </Button>
            </div>
          </Card>

          {/* INFORMACIÓN DETALLADA */}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {/* CONTACTO E IDENTIDAD */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                <Icon name="user" size={20} className="text-brand" />
                Contacto e identidad
              </h2>

              <InfoRow label="Documento" value={documentoTexto} />
              <InfoRow
                label="Teléfono"
                value={usuario.telefono ? formatPhone(usuario.telefono) : 'No registrado'}
              />
              <InfoRow
                label="Correo electrónico"
                value={<span className="break-all">{usuario.correo}</span>}
              />
              <InfoRow label="Usuario del sistema" value={`@${usuario.aliasInterno}`} />
            </Card>

            {/* INFORMACIÓN PROFESIONAL O ROLES */}
            {esMedico ? (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                  <Icon name="tooth" size={20} className="text-brand" />
                  Información profesional
                </h2>

                <InfoRow
                  label="Colegiatura (COP)"
                  value={
                    usuario.numeroColegiatura ? (
                      <span className="inline-flex items-center rounded bg-brand-soft/50 px-2 py-0.5 text-xs font-semibold text-brand">
                        {usuario.numeroColegiatura.toUpperCase().startsWith('COP')
                          ? usuario.numeroColegiatura
                          : `COP ${usuario.numeroColegiatura}`}
                      </span>
                    ) : (
                      'No registrado'
                    )
                  }
                />

                <div className="border-t border-line pt-4 pb-1">
                  <p className="text-[0.95rem] text-ink-soft">Especialidades clínicas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {usuario.especialidades.length > 0 ? (
                      usuario.especialidades.map(esp => (
                        <span
                          key={esp}
                          className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
                        >
                          <Icon name="tooth" size={12} />
                          {esp}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm font-medium text-muted">
                        Sin especialidades asignadas
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                  <Icon name="briefcase" size={20} className="text-brand" />
                  Funciones del personal
                </h2>

                <InfoRow
                  label="Área / Rol"
                  value={usuario.roles.map(rol => rolBadgeInfo(rol).label).join(', ')}
                />

                <InfoRow
                  label="Estado del personal"
                  value={usuario.personalActivo ? 'Personal habilitado' : 'Personal suspendido'}
                />
              </Card>
            )}
          </div>
        </motion.div>
      )}
    </>
  )
}