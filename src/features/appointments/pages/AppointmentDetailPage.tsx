import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  BackLink,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Icon,
  Toast,
  type ToastAviso,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import { citaDetalleApi, type DetalleCita, type HistorialCita } from '../api/citaDetalleApi'
import { citaReferencia } from '../model/citaReferencia'
import { AppointmentReasonDialog } from '../components/AppointmentReasonDialog'

const fechaFormato = (fecha: string) =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'full',
  }).format(
    new Date(`${fecha.slice(0, 10)}T12:00:00`),
  )

const fechaHoraFormato = (fecha: string) =>
  new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))

const horaFormato = (fecha: string) => {
  const [h, m] = fecha.slice(11, 16).split(':').map(Number)

  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const tonoEstado = (
  estado: string,
): 'green' | 'blue' | 'amber' | 'red' | 'gray' => {
  if (estado === 'CONFIRMADA' || estado === 'ATENDIDA') return 'green'
  if (estado === 'PROGRAMADA') return 'blue'
  if (estado === 'EN_ATENCION') return 'amber'
  if (estado === 'CANCELADA' || estado === 'NO_ASISTIO') return 'red'
  return 'gray'
}

const formatearTexto = (texto?: string | null) => {
  if (!texto) return ''
  const limpio = texto.replaceAll('_', ' ').toLowerCase()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

const etiquetaEstado = (estado?: string | null) => {
  if (!estado) return ''
  const estados: Record<string, string> = {
    PROGRAMADA: 'Programada',
    CONFIRMADA: 'Confirmada',
    EN_ATENCION: 'En atención',
    ATENDIDA: 'Atendida',
    CANCELADA: 'Cancelada',
    NO_ASISTIO: 'No asistió',
  }
  return estados[estado] || formatearTexto(estado)
}

const etiquetaAccion = (accion?: string | null) => {
  if (!accion) return ''
  const acciones: Record<string, string> = {
    CREADA: 'Cita creada',
    CREACION: 'Creación de la cita',
    REPROGRAMACION: 'Reprogramación',
    CANCELACION: 'Cancelación',
    CONFIRMACION_ASISTENCIA: 'Confirmación de asistencia',
    INICIO_ATENCION: 'Inicio de atención',
    FIN_ATENCION: 'Finalización de atención',
    NO_ASISTIO: 'Marcada como no asistió',
    CAMBIO_ESTADO: 'Cambio de estado',
  }
  return acciones[accion] || formatearTexto(accion)
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string
  valor: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-ink-soft">
        {titulo}
      </dt>

      <dd className="mt-1 break-words text-sm font-semibold text-ink">
        {valor}
      </dd>
    </div>
  )
}

type AccionMotivo = 'cancelar' | 'no-asistio' | null

export function AppointmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, user } = useAuth()

  const esPaciente = location.pathname.startsWith('/mis-citas/')
  const administrativo =
    user?.rol === 'Administrador' ||
    user?.rol === 'Recepcionista'

  const esOdontologo =
    user?.rol === 'Odontólogo'

  const volver = esPaciente ? '/mis-citas' : '/citas'

  const citaId = Number(id)
  const idValido =
    Number.isSafeInteger(citaId) &&
    citaId > 0

  const [cita, setCita] = useState<DetalleCita | null>(null)
  const [historial, setHistorial] = useState<HistorialCita[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(
    (location.state as { aviso?: ToastAviso } | null)?.aviso ?? null,
  )
  const [actualizacion, setActualizacion] = useState(0)

  const [confirmarAsistencia, setConfirmarAsistencia] = useState(false)
  const [confirmarInicio, setConfirmarInicio] = useState(false)
  const [confirmarFin, setConfirmarFin] = useState(false)
  const [accionMotivo, setAccionMotivo] = useState<AccionMotivo>(null)

  useEffect(() => {
    const state = location.state as {
      aviso?: ToastAviso
    } | null

    if (!state?.aviso) return

    setAviso(state.aviso)
    window.history.replaceState({}, document.title)
  }, [location.state])

  useEffect(() => {
    if (!accessToken || !idValido) {
      setCita(null)
      setError(
        idValido
          ? 'No se encontró una sesión activa.'
          : 'El identificador de la cita no es válido.',
      )
      setLoading(false)
      return
    }

    let activo = true

    setLoading(true)
    setError('')

    const cargar = async () => {
      try {
        const detalle = await citaDetalleApi.detalle(
          accessToken,
          citaId,
        )

        if (!activo) return
        setCita(detalle)

        if (administrativo) {
          const cambios = await citaDetalleApi.historial(
            accessToken,
            citaId,
          )

          if (activo) setHistorial(cambios)
        } else {
          setHistorial([])
        }
      } catch (e) {
        if (!activo) return

        setCita(null)
        setError(
          e instanceof Error
            ? e.message
            : 'No se pudo obtener el detalle de la cita.',
        )
      } finally {
        if (activo) setLoading(false)
      }
    }

    void cargar()

    return () => {
      activo = false
    }
  }, [accessToken,citaId,idValido,administrativo,actualizacion,])

  const reprogramaciones = useMemo(
    () =>
      historial.filter(h => h.accion === 'REPROGRAMADA',).length,
    [historial],
  )

  const puedeMarcarNoAsistio = useMemo(() => {
    if (!cita) return false
    if (!['PROGRAMADA', 'CONFIRMADA'].includes(cita.estado)) return false
    const limite = new Date(cita.fechaHoraInicio).getTime() + 15 * 60 * 1000
    return Date.now() >= limite
  }, [cita])

  const fechaFutura = cita ? new Date(cita.fechaHoraInicio).getTime() > Date.now() : false
  const puedeConfirmarAsistencia = administrativo && Boolean(cita && cita.estado === 'PROGRAMADA' && fechaFutura)
  const puedeReprogramar = administrativo && Boolean(cita && ['PROGRAMADA', 'CONFIRMADA'].includes(cita.estado) && fechaFutura)
  const puedeCancelar = administrativo && Boolean(cita && ['PROGRAMADA', 'CONFIRMADA'].includes(cita.estado) && fechaFutura)
  const puedeNoAsistio = administrativo && puedeMarcarNoAsistio

  const puedeIniciarAtencion = useMemo(() => {
    if (!esOdontologo || !cita || cita.estado !== 'CONFIRMADA') return false
    const inicio = new Date(cita.fechaHoraInicio).getTime()
    const desde = inicio - 15 * 60 * 1000
    return Date.now() >= desde
  }, [esOdontologo, cita])

  const puedeFinalizarAtencion =  esOdontologo && Boolean(cita && cita.estado === 'EN_ATENCION')

  const tieneAcciones = puedeConfirmarAsistencia ||  puedeReprogramar ||
    puedeCancelar || puedeNoAsistio ||  puedeIniciarAtencion || puedeFinalizarAtencion

  const recargar = (mensaje?: string) => {
    if (mensaje) setAviso({ tipo: 'success', texto: mensaje })
    setActualizacion(n => n + 1)
  }

  const ejecutarSimple = async (
    accion: () => Promise<unknown>,
    mensaje: string,
  ) => {
    if (procesando) return

    setProcesando(true)
    setError('')

    try {
      await accion()
      recargar(mensaje)
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'No se pudo completar la acción.'
      setError(msg)
      setAviso({ tipo: 'error', texto: msg })
    } finally {
      setProcesando(false)
    }
  }

  const ejecutarConMotivo = async (
    motivo: string,
  ) => {
    if (
      !accessToken ||
      !cita ||
      !accionMotivo ||
      procesando
    ) return

    setProcesando(true)
    setError('')

    try {
      if (accionMotivo === 'cancelar') {
        await citaDetalleApi.cancelar(
          accessToken,
          cita.idCita,
          motivo,
        )

        setAviso({ tipo: 'success', texto: 'Cita cancelada correctamente.' })
      }

      if (accionMotivo === 'no-asistio') {
        await citaDetalleApi.noAsistio(
          accessToken,
          cita.idCita,
          motivo,
        )

        setAviso({ tipo: 'success', texto: 'Cita marcada como no asistida.' })
      }

      setAccionMotivo(null)
      setActualizacion(n => n + 1)
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'No se pudo completar la acción.'
      setError(msg)
      setAviso({ tipo: 'error', texto: msg })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <BackLink to={volver}>
        Volver a {esPaciente ? 'Mis citas' : 'Citas'}
      </BackLink>

      <header className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.8rem] font-bold tracking-tight text-ink">
            Detalle de la cita
          </h1>

          <p className="mt-1 text-sm text-ink-soft">
            Consulta el estado, programación y trazabilidad de la cita.
          </p>
        </div>

        {cita && !loading && (
          <Button
            variant="ghost"
            icon="printer"
            onClick={() => window.print()}
            className="print:hidden"
          >
            Imprimir
          </Button>
        )}
      </header>

      {error && !loading && !cita && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
          <Icon name="alertCircle" size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <Card className="flex items-center justify-center gap-3 p-12">
          <Icon
            name="spinner"
            size={22}
            className="animate-spin text-brand"
          />
          <p className="text-sm font-medium text-ink-soft">
            Cargando información de la cita…
          </p>
        </Card>
      )}

      {!loading && cita && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          {/* HEADER OSCURO (#04060a) */}
          <Card className="overflow-hidden border-0 p-0 shadow-xl">
            <div
              className="p-6 text-white sm:p-7"
              style={{ backgroundColor: '#01031c' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 backdrop-blur-sm">
                      Referencia: {citaReferencia(cita.idCita)}
                    </span>

                    <Badge tone={tonoEstado(cita.estado)}>
                      {etiquetaEstado(cita.estado)}
                    </Badge>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
                    {cita.servicioNombre}
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-300">
                    {cita.especialidadNombre}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium text-slate-400">
                    Fecha
                  </p>
                  <p className="mt-1 text-sm font-bold text-white sm:text-base">
                    {fechaFormato(cita.fechaHoraInicio)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium text-slate-400">
                    Hora
                  </p>
                  <p className="mt-1 text-sm font-bold text-white sm:text-base">
                    {horaFormato(cita.fechaHoraInicio)}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium text-slate-400">
                    Especialista
                  </p>
                  <p
                    className="mt-1 truncate text-sm font-bold text-white sm:text-base"
                    title={`Dr(a). ${cita.odontologoNombre}`}
                  >
                    Dr(a). {cita.odontologoNombre}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* ACCIONES (solo si hay acciones disponibles) */}
          {!esPaciente && tieneAcciones && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-ink">
                    Gestión de la cita
                  </h3>

                  <p className="mt-1 text-sm text-ink-soft">
                    Acciones operativas disponibles para el estado actual.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {puedeConfirmarAsistencia && (
                    <Button
                      icon="checkCircle"
                      onClick={() => setConfirmarAsistencia(true)}
                      disabled={procesando}
                    >
                      Confirmar asistencia
                    </Button>
                  )}

                  {puedeReprogramar && (
                    <Button
                      variant="outline"
                      icon="calendarEdit"
                      onClick={() =>
                        navigate(`/citas/${cita.idCita}/reprogramar`)
                      }
                      disabled={procesando}
                    >
                      Reprogramar
                    </Button>
                  )}

                  {puedeCancelar && (
                    <Button
                      variant="danger"
                      icon="xCircle"
                      onClick={() => setAccionMotivo('cancelar')}
                      disabled={procesando}
                    >
                      Cancelar
                    </Button>
                  )}

                  {puedeNoAsistio && (
                    <Button
                      variant="danger"
                      icon="user"
                      onClick={() => setAccionMotivo('no-asistio')}
                      disabled={procesando}
                    >
                      No asistió
                    </Button>
                  )}

                  {puedeIniciarAtencion && (
                    <Button
                      icon="checkCircle"
                      onClick={() => setConfirmarInicio(true)}
                      disabled={procesando}
                    >
                      Iniciar atención
                    </Button>
                  )}

                  {puedeFinalizarAtencion && (
                    <Button
                      icon="check"
                      onClick={() => setConfirmarFin(true)}
                      disabled={procesando}
                    >
                      Finalizar atención
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
            <div className="space-y-5">
              {/* ATENCIÓN */}
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon name="calendar" size={20} />
                  </span>

                  <h3 className="font-bold text-ink">
                    Información de la atención
                  </h3>
                </div>

                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Dato
                    titulo="Fecha"
                    valor={fechaFormato(cita.fechaHoraInicio)}
                  />

                  <Dato
                    titulo="Hora de inicio"
                    valor={horaFormato(cita.fechaHoraInicio)}
                  />

                  <Dato
                    titulo="Hora de finalización"
                    valor={horaFormato(cita.fechaHoraFin)}
                  />

                  <Dato
                    titulo="Duración"
                    valor={
                      cita.duracionMinutos != null
                        ? `${cita.duracionMinutos} minutos`
                        : 'No especificada'
                    }
                  />

                  <Dato
                    titulo="Especialista"
                    valor={`Dr(a). ${cita.odontologoNombre}`}
                  />

                  <Dato
                    titulo="Especialidad"
                    valor={cita.especialidadNombre}
                  />
                </dl>
              </Card>

              {/* SERVICIO */}
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon name="tooth" size={20} />
                  </span>

                  <h3 className="font-bold text-ink">
                    Servicio solicitado
                  </h3>
                </div>

                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Dato
                    titulo="Servicio"
                    valor={cita.servicioNombre}
                  />

                  <Dato
                    titulo="Precio referencial"
                    valor={
                      cita.precioReferencial != null
                        ? `S/ ${Number(cita.precioReferencial).toFixed(2)}`
                        : 'No definido'
                    }
                  />
                </dl>

                {cita.servicioDescripcion && (
                  <p className="mt-5 rounded-xl bg-alt p-4 text-sm leading-relaxed text-ink-soft">
                    {cita.servicioDescripcion}
                  </p>
                )}
              </Card>

              {/* HISTORIAL */}
              {administrativo && (
                <Card className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-ink">
                        Historial de la cita
                      </h3>

                      <p className="mt-1 text-sm text-ink-soft">
                        Cambios administrativos y de estado registrados.
                      </p>
                    </div>

                    <Badge tone={reprogramaciones > 0 ? 'amber' : 'gray'}>
                      {reprogramaciones} reprogramación
                      {reprogramaciones === 1 ? '' : 'es'}
                    </Badge>
                  </div>

                  {historial.length === 0 ? (
                    <div className="mt-5 rounded-xl bg-alt p-5 text-center text-sm font-medium text-ink-soft">
                      Esta cita todavía no tiene cambios registrados.
                    </div>
                  ) : (
                    <div className="mt-6 space-y-0">
                      {historial.map((h, index) => (
                        <div
                          key={h.id}
                          className="relative flex gap-4 pb-6 last:pb-0"
                        >
                          {index < historial.length - 1 && (
                            <span className="absolute left-[17px] top-9 h-[calc(100%-1rem)] w-px bg-line" />
                          )}

                          <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand shadow-xs">
                            <Icon name="calendarEdit" size={17} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-ink sm:text-base">
                                {etiquetaAccion(h.accion)}
                              </h4>

                              <span className="text-xs font-medium text-ink-soft">
                                {fechaHoraFormato(h.fechaCreacion)}
                              </span>
                            </div>

                            {h.motivo && (
                              <p className="mt-2 text-sm text-ink-soft">
                                <span className="font-medium text-ink">
                                  Motivo:
                                </span>{' '}
                                {h.motivo}
                              </p>
                            )}

                            <p className="mt-1.5 text-sm text-ink-soft">
                              <span className="font-medium text-ink">
                                Usuario:
                              </span>{' '}
                              <span className="font-semibold text-ink">
                                {h.realizadoPor || 'Sistema'}
                              </span>
                            </p>

                            {(h.estadoAnterior || h.estadoNuevo) && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                                <span className="font-medium text-ink">Estado:</span>
                                {h.accion !== 'CREADA' ? (
                                  <>
                                    <span>{etiquetaEstado(h.estadoAnterior) || '-'}</span>
                                    <span className="text-ink-soft">→</span>
                                  </>
                                ) : null}
                                <span className="font-semibold text-ink">{etiquetaEstado(h.estadoNuevo) || '—'}</span>
                              </div>
                            )}

                            {h.accion === 'CREADA' && h.fechaHoraNueva && (
                              <div className="mt-3 rounded-xl border border-line bg-alt/50 p-3">
                                <span className="text-xs font-medium text-ink-soft">
                                  Horario programado
                                </span>

                                <p className="mt-0.5 text-sm font-semibold text-ink">
                                  {fechaHoraFormato(h.fechaHoraNueva)}
                                </p>
                              </div>
                            )}

                            {h.accion === 'REPROGRAMADA' && h.fechaHoraAnterior && h.fechaHoraNueva && (
                              <div className="mt-3 mb-1 grid gap-2.5 rounded-xl border border-line bg-alt/50 p-3 sm:grid-cols-2">
                                <div>
                                  <span className="text-xs font-medium text-ink-soft">
                                    Horario anterior
                                  </span>
                                  <p className="mt-0.5 text-sm font-semibold text-ink">
                                    {fechaHoraFormato(h.fechaHoraAnterior)}
                                  </p>
                                </div>

                                <div>
                                  <span className="text-xs font-medium text-ink-soft">
                                    Nuevo horario
                                  </span>
                                  <p className="mt-0.5 text-sm font-semibold text-ink">
                                    {fechaHoraFormato(h.fechaHoraNueva)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>

            <div className="space-y-5">
              {/* PACIENTE */}
              {!esPaciente && (
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                      <Icon name="user" size={20} />
                    </span>

                    <h3 className="font-bold text-ink">
                      Información del paciente
                    </h3>
                  </div>

                  <dl className="mt-5 grid gap-4">
                    <Dato
                      titulo="Paciente"
                      valor={cita.pacienteNombre}
                    />

                    <Dato
                      titulo="Documento"
                      valor={`${cita.pacienteTipoDocumento} · ${cita.pacienteNumeroDocumento}`}
                    />

                    <Dato
                      titulo="Teléfono"
                      valor={cita.pacienteTelefono || 'No registrado'}
                    />

                    <Dato
                      titulo="Correo"
                      valor={cita.pacienteCorreo || 'No registrado'}
                    />
                  </dl>
                </Card>
              )}

              {/* SEDE */}
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon name="mapPin" size={20} />
                  </span>

                  <h3 className="font-bold text-ink">
                    Lugar de atención
                  </h3>
                </div>

                <div className="mt-5">
                  <p className="font-semibold text-ink">
                    {cita.sedeNombre}
                  </p>

                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {cita.sedeDireccion}
                  </p>
                </div>
              </Card>

              {/* CONTROL ADMINISTRATIVO */}
              {!esPaciente && (
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                      <Icon name="lock" size={20} />
                    </span>

                    <div>
                      <h3 className="font-bold text-ink">
                        Control administrativo
                      </h3>
                      <p className="text-xs text-ink-soft">
                        Trazabilidad y auditoría
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Creado por */}
                    <div className="rounded-xl border border-line bg-surface p-3.5">
                      <p className="text-xs font-medium text-ink-soft">
                        Creado por
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-ink">
                        {cita.creadoPor || 'Sistema'}
                      </p>
                    </div>

                    {/* Confirmación */}
                    <div className="rounded-xl border border-line bg-surface p-3.5">
                      <p className="text-xs font-medium text-ink-soft">
                        Confirmación
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {cita.confirmadaEn ? (
                          <>
                            <Badge tone="green">Confirmada</Badge>
                            <span className="text-xs font-medium text-ink-soft">
                              {fechaHoraFormato(cita.confirmadaEn)}
                            </span>
                          </>
                        ) : (
                          <Badge tone="amber">Pendiente</Badge>
                        )}
                      </div>
                    </div>

                    {/* Fecha de registro */}
                    <div className="rounded-xl border border-line bg-surface p-3.5">
                      <p className="text-xs font-medium text-ink-soft">
                        Fecha de registro
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-ink">
                        {cita.fechaCreacion
                          ? fechaHoraFormato(cita.fechaCreacion)
                          : 'No disponible'}
                      </p>
                    </div>

                    {/* Última actualización */}
                    <div className="rounded-xl border border-line bg-surface p-3.5">
                      <p className="text-xs font-medium text-ink-soft">
                        Última actualización
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-ink">
                        {cita.fechaActualizacion
                          ? fechaHoraFormato(cita.fechaActualizacion)
                          : 'No disponible'}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon name="file" size={20} />
                  </span>

                  <h3 className="font-bold text-ink">
                    Pago y comprobante
                  </h3>
                </div>

                <div className="mt-5 rounded-xl bg-alt p-4">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    La gestión de pago y comprobante todavía pertenece al siguiente módulo.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      )}

      <ConfirmDialog
        open={confirmarAsistencia}
        title="¿Confirmar asistencia?"
        description="La cita cambiará de PROGRAMADA a CONFIRMADA."
        confirmLabel={procesando ? 'Confirmando…' : 'Confirmar'}
        cancelLabel="Volver"
        onCancel={() => {
          if (!procesando) setConfirmarAsistencia(false)
        }}
        onConfirm={() => {
          if (!accessToken || !cita) return

          void ejecutarSimple(
            () =>
              citaDetalleApi.confirmarAsistencia(
                accessToken,
                cita.idCita,
              ),
            'Asistencia confirmada correctamente.',
          ).then(() => setConfirmarAsistencia(false))
        }}
      />

      <ConfirmDialog
        open={confirmarInicio}
        title="¿Iniciar atención?"
        description="La cita pasará a estado EN ATENCIÓN."
        confirmLabel={procesando ? 'Iniciando…' : 'Iniciar atención'}
        onCancel={() => {
          if (!procesando) setConfirmarInicio(false)
        }}
        onConfirm={() => {
          if (!accessToken || !cita) return

          void ejecutarSimple(
            () =>
              citaDetalleApi.iniciarAtencion(
                accessToken,
                cita.idCita,
              ),
            'Atención iniciada correctamente.',
          ).then(() => setConfirmarInicio(false))
        }}
      />

      <ConfirmDialog
        open={confirmarFin}
        title="¿Finalizar atención?"
        description="La cita cambiará a ATENDIDA."
        confirmLabel={procesando ? 'Finalizando…' : 'Finalizar atención'}
        onCancel={() => {
          if (!procesando) setConfirmarFin(false)
        }}
        onConfirm={() => {
          if (!accessToken || !cita) return

          void ejecutarSimple(
            () =>
              citaDetalleApi.finalizarAtencion(
                accessToken,
                cita.idCita,
              ),
            'Atención finalizada correctamente.',
          ).then(() => setConfirmarFin(false))
        }}
      />

      <AppointmentReasonDialog
        open={accionMotivo === 'cancelar'}
        title="Cancelar cita"
        description="La cita quedará en estado CANCELADA y conservará su historial."
        confirmLabel="Cancelar cita"
        required
        loading={procesando}
        onCancel={() => {
          if (!procesando) setAccionMotivo(null)
        }}
        onConfirm={motivo => void ejecutarConMotivo(motivo)}
      />

      <AppointmentReasonDialog
        open={accionMotivo === 'no-asistio'}
        title="Marcar como no asistió"
        description="Esta cita quedará cerrada como NO ASISTIO. Si el paciente desea otra atención, se deberá programar una nueva cita."
        confirmLabel="Marcar no asistió"
        loading={procesando}
        onCancel={() => {
          if (!procesando) setAccionMotivo(null)
        }}
        onConfirm={motivo => void ejecutarConMotivo(motivo)}
      />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </>
  )
}