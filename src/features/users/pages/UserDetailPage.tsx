import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, BackLink, Badge, Button, Card, Icon, InfoRow } from '@/shared/components/ui'
import { apiBlob } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth'
import { documentTypesApi, type TipoDocumentoOption } from '@/shared/api/documentTypesApi'
import { usersApi, type UsuarioInternoResponse } from '../api/usersApi'

const NOMBRES_ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ODONTOLOGO: 'Odontólogo',
}

function nombreCompleto(usuario: UsuarioInternoResponse) {
  return [usuario.nombres, usuario.apellidoPaterno, usuario.apellidoMaterno]
    .filter(Boolean)
    .join(' ')
}

function estadoCuenta(usuario: UsuarioInternoResponse) {
  if (usuario.estado === 'PENDIENTE') {
    return { texto: 'Pendiente de activación', tono: 'amber' as const }
  }
  if (usuario.estado === 'BLOQUEADO') {
    return { texto: 'Cuenta bloqueada', tono: 'red' as const }
  }
  if (usuario.estado === 'ACTIVO' && usuario.personalActivo) {
    return { texto: 'Cuenta activa', tono: 'green' as const }
  }
  return { texto: 'Cuenta inactiva', tono: 'gray' as const }
}

export function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  const usuarioId = Number(id)
  const idValido = Number.isSafeInteger(usuarioId) && usuarioId > 0

  const [usuario, setUsuario] = useState<UsuarioInternoResponse | null>(null)
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoOption[]>([])
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

    Promise.all([
      usersApi.obtener(accessToken, usuarioId),
      documentTypesApi.listar().catch(() => [] as TipoDocumentoOption[]),
    ])
      .then(([userData, docsData]) => {
        if (activo) {
          setUsuario(userData)
          if (docsData.length > 0) setTiposDocumento(docsData)
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

  const esOdontologo = usuario?.roles.includes('ODONTOLOGO') ?? false
  const estado = usuario ? estadoCuenta(usuario) : null
  const tipoDoc = tiposDocumento.find(t => t.id === usuario?.tipoDocumentoId)
  const documentoTexto = usuario
    ? tipoDoc
      ? `${tipoDoc.codigo} · ${usuario.numeroDocumento}`
      : usuario.numeroDocumento
    : 'No registrado'

  return (
    <>
      <BackLink to="/usuarios">Volver a Usuarios</BackLink>

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

                <span
                  title={estado?.texto}
                  className={`absolute bottom-1 right-1 size-5 rounded-full border-2 border-surface ${
                    estado?.tono === 'green'
                      ? 'bg-emerald-500'
                      : estado?.tono === 'amber'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {nombreCompleto(usuario)}
                </h1>

                <p className="mt-2 break-words text-sm text-muted">{usuario.correo}</p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {usuario.roles.map(rol => (
                    <Badge
                      key={rol}
                      tone={rol === 'ODONTOLOGO' ? 'green' : rol === 'ADMIN' ? 'blue' : 'gray'}
                    >
                      {NOMBRES_ROL[rol] ?? rol}
                    </Badge>
                  ))}

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

          {/* INFORMACIÓN REAL */}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {/* CONTACTO E IDENTIDAD */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                <Icon name="user" size={20} className="text-brand" />
                Contacto e identidad
              </h2>

              <InfoRow label="Documento" value={documentoTexto} />
              <InfoRow label="Teléfono" value={usuario.telefono || 'No registrado'} />
              <InfoRow
                label="Correo electrónico"
                value={<span className="break-all">{usuario.correo}</span>}
              />
            </Card>

            {/* INFORMACIÓN PROFESIONAL O ROL */}
            {esOdontologo ? (
              <Card className="p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                  <Icon name="tooth" size={20} className="text-brand" />
                  Información profesional
                </h2>

                <InfoRow
                  label="Número de colegiatura (COP)"
                  value={usuario.numeroColegiatura || 'No registrado'}
                />

                <div className="border-t border-line pt-4 pb-1">
                  <p className="text-[0.95rem] text-ink-soft">Especialidades</p>
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
                  <Icon name="lock" size={20} className="text-brand" />
                  Acceso y funciones
                </h2>

                <InfoRow
                  label="Roles asignados"
                  value={usuario.roles.map(rol => NOMBRES_ROL[rol] ?? rol).join(', ')}
                />

                <InfoRow label="Estado de la cuenta" value={estado?.texto || 'No disponible'} />
              </Card>
            )}
          </div>
        </motion.div>
      )}
    </>
  )
}