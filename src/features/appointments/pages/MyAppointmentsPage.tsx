import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Icon, PageHead, Tabs, Toast, type TabItem, type ToastAviso } from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import { bookingApi, type BookingBranch, type BookingService, type BookingSpecialist, type CreatedAppointment } from '../api/bookingApi'
import { citaReferencia } from '../model/citaReferencia'

type TabValue = 'proximas' | 'historial'

const TABS: readonly TabItem<TabValue>[] = [
  { value: 'proximas', label: 'Próximas citas' },
  { value: 'historial', label: 'Historial' },
]

const nombreDoctor = (d: BookingSpecialist) =>
  `${d.nombres} ${d.apellidoPaterno} ${d.apellidoMaterno ?? ''}`.trim()

const fechaCita = (fecha: string) =>
  new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${fecha.slice(0, 10)}T12:00:00`))

const hora12 = (fecha: string) => {
  const [h, m] = fecha.slice(11, 16).split(':').map(Number)
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const esProxima = (cita: CreatedAppointment) =>
  ['PROGRAMADA', 'CONFIRMADA'].includes(cita.estado) &&
  new Date(cita.fechaHoraFin).getTime() >= Date.now()

const tonoEstado = (estado: string): 'green' | 'blue' | 'red' | 'gray' => {
  if (estado === 'CONFIRMADA') return 'green'
  if (estado === 'PROGRAMADA') return 'blue'
  if (estado === 'CANCELADA' || estado === 'NO_ASISTIO') return 'red'
  return 'gray'
}

export function MyAppointmentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken } = useAuth()

  const [aviso, setAviso] = useState<ToastAviso | null>(
    (location.state as { aviso?: ToastAviso } | null)?.aviso ?? null,
  )

  useEffect(() => {
    if ((location.state as { aviso?: ToastAviso } | null)?.aviso) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const [tab, setTab] = useState<TabValue>('proximas')
  const [citas, setCitas] = useState<CreatedAppointment[]>([])
  const [servicios, setServicios] = useState<BookingService[]>([])
  const [sedes, setSedes] = useState<BookingBranch[]>([])
  const [doctores, setDoctores] = useState<BookingSpecialist[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actualizacion, setActualizacion] = useState(0)

  // CONSULTAR CITAS REALES DEL PACIENTE.
  useEffect(() => {
    if (!accessToken) {
      setError('No se encontró una sesión activa.')
      setLoading(false)
      return
    }

    let activo = true

    const cargar = async () => {
      setLoading(true)
      setError('')

      try {
        const todas: CreatedAppointment[] = []
        let pagina = 0
        let ultima = false

        while (!ultima) {
          const resultado = await bookingApi.misCitas(accessToken, pagina)
          todas.push(...resultado.contenido)
          ultima = resultado.esUltima || resultado.contenido.length === 0
          pagina++
        }

        if (!activo) return
        setCitas(todas)

        // Consultar nombres de servicios y sedes.
        const [resultadoServicios, resultadoSedes] = await Promise.allSettled([
          bookingApi.servicios(accessToken),
          bookingApi.sedes(accessToken),
        ])

        if (!activo) return

        const listaServicios = resultadoServicios.status === 'fulfilled' ? resultadoServicios.value : []
        const listaSedes = resultadoSedes.status === 'fulfilled' ? resultadoSedes.value : []

        setServicios(listaServicios)
        setSedes(listaSedes)

        // Consultar los especialistas asociados a los servicios registrados.
        const especialidades = [...new Set(
          listaServicios
            .filter(s => todas.some(c => c.servicioId === s.id))
            .map(s => s.especialidadId)
        )]

        const resultados = await Promise.allSettled(
          especialidades.map(id => bookingApi.especialistas(accessToken, id))
        )

        if (!activo) return

        setDoctores(resultados.flatMap(r => r.status === 'fulfilled' ? r.value : []))

      } catch (e) {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar tus citas.')
        }
      } finally {
        if (activo) setLoading(false)
      }
    }

    void cargar()
    return () => { activo = false }
  }, [accessToken, actualizacion])

  // FILTRAR Y ORDENAR LAS CITAS.
  const filtradas = citas
    .filter(c => tab === 'proximas' ? esProxima(c) : !esProxima(c))
    .sort((a, b) => tab === 'proximas'
      ? a.fechaHoraInicio.localeCompare(b.fechaHoraInicio)
      : b.fechaHoraInicio.localeCompare(a.fechaHoraInicio)
    )

  return (
    <>
      <PageHead
        title="Mis citas"
        description="Consulta tus próximas citas y el historial de tus atenciones."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setActualizacion(n => n + 1)} disabled={loading}>
              <Icon name="calendar" size={17} className="mr-2" />
              Actualizar
            </Button>

            <Button icon="plus" onClick={() => navigate('/mis-citas/nueva')}>
              Agendar cita
            </Button>
          </div>
        }
      />

      {/* FILTROS */}
      <Tabs<TabValue> items={TABS} value={tab} onChange={(value: TabValue) => setTab(value)} label="Filtrar mis citas" />

      {/* CARGANDO */}
      {loading && (
        <Card className="mt-5 flex items-center justify-center gap-3 px-6 py-12 text-muted">
          <Icon name="spinner" size={22} className="animate-spin text-brand" />
          <p className="text-sm">Cargando tus citas…</p>
        </Card>
      )}

      {/* ERROR */}
      {!loading && error && (
        <Card className="mt-5 p-6">
          <p role="alert" className="text-sm text-danger">{error}</p>
          <Button variant="ghost" onClick={() => setActualizacion(n => n + 1)}>
            Intentar nuevamente
          </Button>
        </Card>
      )}

      {/* LISTADO DE CITAS */}
      {!loading && !error && (
        <div className="mt-5 flex flex-col gap-4">

          {filtradas.map((cita, index) => {
            const servicio = servicios.find(s => s.id === cita.servicioId)
            const sede = sedes.find(s => s.id === cita.sedeId)
            const doctor = doctores.find(d => d.odontologoEspecialidadId === cita.odontologoEspecialidadId)

            return (
              <motion.article
                key={cita.idCita}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
                className="rounded-card border border-line border-l-4 border-l-brand bg-surface p-5 shadow-card"
              >
                {/* CABECERA */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <p className="text-xs font-medium text-muted">Referencia: {citaReferencia(cita.idCita)}</p>

                    <h3 className="mt-1 text-base font-bold text-ink">
                      {servicio?.nombre ?? 'Consulta odontológica'}
                    </h3>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={tonoEstado(cita.estado)}>
                      {cita.estado.replaceAll('_', ' ')}
                    </Badge>

                    <button
                      type="button"
                      aria-label={`Ver detalle de la cita ${citaReferencia(cita.idCita)}`}
                      title="Ver detalle"
                      onClick={() => navigate(`/mis-citas/${cita.idCita}`)}
                      className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <Icon name="eye" size={17} />
                      <span className="hidden sm:inline">Ver detalle</span>
                    </button>
                  </div>
                </div>

                {/* INFORMACIÓN */}
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                  <div className="flex items-start gap-3">
                    <Icon name="user" size={20} className="mt-0.5 shrink-0 text-brand" />
                    <div>
                      <p className="text-xs text-muted">Especialista</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {doctor ? `Dr(a). ${nombreDoctor(doctor)}` : 'Especialista asignado'}
                      </p>
                      {doctor && <p className="mt-1 text-xs text-muted">{doctor.especialidad}</p>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Icon name="calendar" size={20} className="mt-0.5 shrink-0 text-brand" />
                    <div>
                      <p className="text-xs text-muted">Fecha y hora</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-ink">
                        {fechaCita(cita.fechaHoraInicio)}
                      </p>
                      <p className="mt-1 text-sm text-ink">{hora12(cita.fechaHoraInicio)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Icon name="citas" size={20} className="mt-0.5 shrink-0 text-brand" />
                    <div>
                      <p className="text-xs text-muted">Lugar de atención</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {sede?.nombre ?? `Sede N.º ${cita.sedeId}`}
                      </p>
                      {sede?.direccion && <p className="mt-1 text-xs text-muted">{sede.direccion}</p>}
                    </div>
                  </div>

                </div>
              </motion.article>
            )
          })}

          {/* SIN CITAS */}
          {filtradas.length === 0 && (
            <Card className="grid place-items-center gap-3 px-6 py-14 text-center">
              <Icon name="calendar" size={34} className="text-muted" />

              <h3 className="font-bold text-ink">
                {tab === 'proximas' ? 'No tienes próximas citas' : 'Todavía no tienes citas en tu historial'}
              </h3>

              <p className="max-w-sm text-sm text-muted">
                {tab === 'proximas'
                  ? 'Cuando programes una nueva cita, podrás consultar aquí su fecha, horario y especialista.'
                  : 'Aquí podrás consultar tus citas anteriores y las atenciones realizadas.'}
              </p>

              {tab === 'proximas' && (
                <Button icon="plus" onClick={() => navigate('/mis-citas/nueva')}>
                  Agendar mi primera cita
                </Button>
              )}
            </Card>
          )}

        </div>
      )}

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </>
  )
}