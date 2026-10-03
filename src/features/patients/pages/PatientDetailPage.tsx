import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Avatar,
  BackLink,
  Badge,
  Button,
  Card,
  Icon,
  InfoRow,
  Toast,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { documentTypesApi, type TipoDocumentoOption } from '@/shared/api/documentTypesApi'
import { patientsApi, type PacienteResponse } from '../api/patientsApi'

type Aviso = {
  tipo: 'success' | 'error'
  texto: string
}

function nombreCompleto(p: PacienteResponse) {
  return [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ')
}

function calcularEdad(fechaStr?: string | null): number | null {
  if (!fechaStr) return null
  const partes = fechaStr.split('-')
  if (partes.length === 3) {
    const anio = parseInt(partes[0], 10)
    const mes = parseInt(partes[1], 10) - 1
    const dia = parseInt(partes[2], 10)
    const fecha = new Date(anio, mes, dia)
    if (isNaN(fecha.getTime())) return null
    const hoy = new Date()
    let edad = hoy.getFullYear() - anio
    const m = hoy.getMonth() - mes
    if (m < 0 || (m === 0 && hoy.getDate() < dia)) {
      edad--
    }
    return edad >= 0 ? edad : null
  }
  const fecha = new Date(fechaStr)
  if (isNaN(fecha.getTime())) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - fecha.getFullYear()
  const m = hoy.getMonth() - fecha.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) {
    edad--
  }
  return edad >= 0 ? edad : null
}

function formatearFechaNacimiento(fechaStr?: string | null): string {
  if (!fechaStr) return 'No registrada'
  const partes = fechaStr.split('-')
  if (partes.length === 3) {
    const anio = parseInt(partes[0], 10)
    const mes = parseInt(partes[1], 10) - 1
    const dia = parseInt(partes[2], 10)
    const d = new Date(anio, mes, dia)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    }
  }
  return fechaStr
}

function formatearFechaLarga(fechaStr?: string | null): string {
  if (!fechaStr) return 'No disponible'
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr
    return d.toLocaleString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fechaStr
  }
}

export function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, user } = useAuth()

  const puedeEditar =
    user?.rol === 'Administrador' ||
    user?.rol === 'Recepcionista'

  const [paciente, setPaciente] = useState<PacienteResponse | null>(null)
  const [tiposDoc, setTiposDoc] = useState<TipoDocumentoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)

  // Mensajes de redirección
  useEffect(() => {
    const state = location.state as { aviso?: Aviso } | null
    if (!state?.aviso) return
    setAviso(state.aviso)
    window.history.replaceState({}, document.title)
  }, [location.state])

  // Desvanecer toast
  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(
      () => setAviso(null),
      aviso.tipo === 'error' ? 7000 : 4500,
    )
    return () => window.clearTimeout(timer)
  }, [aviso])

  // Cargar catálogo de tipos de documento
  useEffect(() => {
    documentTypesApi
      .listar()
      .then(setTiposDoc)
      .catch(() => setTiposDoc([]))
  }, [])

  // Cargar paciente
  useEffect(() => {
    if (!accessToken || !id) return

    let activo = true
    setLoading(true)
    setError('')

    patientsApi
      .obtener(accessToken, Number(id))
      .then(response => {
        if (activo) setPaciente(response)
      })
      .catch(e => {
        if (activo) {
          setError(
            e instanceof Error
              ? e.message
              : 'No se pudo cargar la información del paciente.',
          )
        }
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, id, actualizacion])

  const tipoDoc = tiposDoc.find(
    t => t.codigo === paciente?.tipoDocumento || t.nombre === paciente?.tipoDocumento,
  )

  const documentoTexto = paciente?.numeroDocumento
    ? tipoDoc
      ? `${tipoDoc.codigo} · ${paciente.numeroDocumento}`
      : `${paciente.tipoDocumento} · ${paciente.numeroDocumento}`
    : 'No registrado'

  const edad = calcularEdad(paciente?.fechaNacimiento)

  return (
    <>
      <BackLink to="/pacientes">
        Volver a Pacientes
      </BackLink>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* CARGA */}
      {loading && (
        <Card className="mt-4 flex items-center justify-center gap-3 p-12">
          <Icon
            name="spinner"
            size={22}
            className="animate-spin text-brand"
          />
          <p className="text-sm text-muted">
            Cargando información del paciente…
          </p>
        </Card>
      )}

      {/* ERROR */}
      {!loading && (error || !paciente) && (
        <Card className="mt-4 flex flex-col items-center gap-4 p-10 text-center">
          <Icon
            name="warning"
            size={32}
            className="text-danger"
          />
          <p role="alert" className="text-sm text-danger">
            {error || 'No se encontró la información del paciente.'}
          </p>
          <Button
            variant="ghost"
            onClick={() => setActualizacion(n => n + 1)}
          >
            Intentar nuevamente
          </Button>
        </Card>
      )}

      {/* FICHA REAL DEL PACIENTE */}
      {!loading && paciente && !error && (
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
                <Avatar
                  nombre={paciente.nombres}
                  apellido={paciente.apellidoPaterno}
                  seed={paciente.id}
                  size={100}
                  animate="hover"
                  trackCursor={false}
                  className="ring-4 ring-brand-soft shadow-md"
                />

                <span
                  title={paciente.activo ? 'Paciente Activo' : 'Paciente Inactivo'}
                  className={`absolute bottom-1 right-1 size-5 rounded-full border-2 border-surface ${
                    paciente.activo ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {nombreCompleto(paciente)}
                </h1>

                <p className="mt-1 text-xs font-semibold text-muted">
                  Paciente #{paciente.id}
                </p>

                <p className="mt-1.5 break-words text-sm text-ink-soft">
                  {paciente.email || 'Sin correo registrado'}
                  {paciente.telefono && ` · ${paciente.telefono}`}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge tone={paciente.activo ? 'green' : 'gray'}>
                    {paciente.activo ? 'Activo' : 'Inactivo'}
                  </Badge>

                  <Badge tone={paciente.tieneCuenta ? 'blue' : 'amber'}>
                    {paciente.tieneCuenta ? 'Cuenta creada' : 'Sin cuenta de portal'}
                  </Badge>
                </div>
              </div>

              {puedeEditar && paciente.activo && (
                <Button
                  variant="ghost"
                  icon="edit"
                  onClick={() => navigate(`/pacientes/${paciente.id}/editar`)}
                >
                  Editar datos
                </Button>
              )}
            </div>
          </Card>

          {/* INFORMACIÓN EN CARDS */}
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {/* CONTACTO E IDENTIDAD */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                <Icon
                  name="user"
                  size={20}
                  className="text-brand"
                />
                Contacto e identidad
              </h2>

              <InfoRow
                label="Documento"
                value={documentoTexto}
              />

              <InfoRow
                label="Fecha de nacimiento"
                value={formatearFechaNacimiento(paciente.fechaNacimiento)}
              />

              <InfoRow
                label="Edad"
                value={
                  edad !== null
                    ? `${edad} ${edad === 1 ? 'año' : 'años'}`
                    : 'No disponible'
                }
              />

              <InfoRow
                label="Teléfono"
                value={paciente.telefono || 'No registrado'}
              />

              <InfoRow
                label="Correo electrónico"
                value={
                  paciente.email ? (
                    <span className="break-all">{paciente.email}</span>
                  ) : (
                    'No registrado'
                  )
                }
              />

              <InfoRow
                label="Dirección"
                value={paciente.direccion || 'No registrada'}
              />
            </Card>

            {/* CUENTA Y REGISTRO */}
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                <Icon
                  name="lock"
                  size={20}
                  className="text-brand"
                />
                Cuenta y registro
              </h2>

              <InfoRow
                label="Estado del paciente"
                value={
                  <Badge tone={paciente.activo ? 'green' : 'gray'}>
                    {paciente.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                }
              />

              <InfoRow
                label="Cuenta de portal"
                value={
                  !paciente.tieneCuenta ? (
                    <Badge tone="gray">Sin cuenta</Badge>
                  ) : paciente.estadoCuenta === 'ACTIVO' || paciente.correoVerificado === true ? (
                    <Badge tone="blue">Activa</Badge>
                  ) : paciente.estadoCuenta === 'PENDIENTE' || paciente.correoVerificado === false ? (
                    <Badge tone="amber">Pendiente de verificación</Badge>
                  ) : paciente.estadoCuenta === 'BLOQUEADO' ? (
                    <Badge tone="red">Bloqueada</Badge>
                  ) : (
                    <Badge tone="gray">{paciente.estadoCuenta || 'Inactiva'}</Badge>
                  )
                }
              />

              <InfoRow
                label="Verificación de correo"
                value={
                  !paciente.tieneCuenta
                    ? 'No aplica'
                    : paciente.correoVerificado
                      ? '✓ Correo verificado'
                      : 'Pendiente de confirmación OTP'
                }
              />

              <InfoRow
                label="Fecha de registro"
                value={formatearFechaLarga(paciente.fechaCreacion)}
              />

              {paciente.fechaActualizacion && (
                <InfoRow
                  label="Última actualización"
                  value={formatearFechaLarga(paciente.fechaActualizacion)}
                />
              )}
            </Card>
          </div>
        </motion.div>
      )}
    </>
  )
}