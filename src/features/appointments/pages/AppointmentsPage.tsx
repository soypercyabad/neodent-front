import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ActionsCell,
  AnimatedDatePicker,
  AnimatedSelect,
  AppointmentsTableSkeleton,
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  PageHead,
  Pagination,
  RowActions,
  SearchInput,
  Table,
  TableFoot,
  TableState,
  Toast,
  type Column,
  type ToastAviso,
} from '@/shared/components/ui'
import { apiRequest } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth/model/useAuth'
import { citaDetalleApi, type DetalleCita } from '../api/citaDetalleApi'
import { citaReferencia } from '../model/citaReferencia'
import type { CreatedAppointment } from '../api/bookingApi'

interface PaginaCitas {
  contenido: CreatedAppointment[]
  esUltima: boolean
}

const COLUMNS: Column[] = [
  { label: 'Referencia' },
  { label: 'Paciente' },
  { label: 'Especialista' },
  { label: 'Fecha y hora' },
  { label: 'Estado', align: 'center' },
  { label: 'Acciones', align: 'center' },
]

const POR_PAGINA = 10

const fechaFormato = (fecha: string) =>
  new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(`${fecha.slice(0, 10)}T12:00:00`))

const horaFormato = (fecha: string) => {
  const [h, m] = fecha.slice(11, 16).split(':').map(Number)
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const tonoEstado = (estado: string): 'green' | 'blue' | 'red' | 'gray' => {
  if (estado === 'CONFIRMADA' || estado === 'ATENDIDA') return 'green'
  if (estado === 'PROGRAMADA' || estado === 'EN_ATENCION') return 'blue'
  if (estado === 'CANCELADA' || estado === 'NO_ASISTIO') return 'red'
  return 'gray'
}

export function AppointmentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, user } = useAuth()

  const [aviso, setAviso] = useState<ToastAviso | null>(
    (location.state as { aviso?: ToastAviso } | null)?.aviso ?? null,
  )

  useEffect(() => {
    if ((location.state as { aviso?: ToastAviso } | null)?.aviso) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const [citas, setCitas] = useState<DetalleCita[]>([])
  const [query, setQuery] = useState('')
  const [day, setDay] = useState('')
  const [estado, setEstado] = useState('')
  const [vista, setVista] = useState('')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actualizacion, setActualizacion] = useState(0)

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setError('No se encontró una sesión activa.')
      return
    }

    let activo = true

    const cargar = async () => {
      setLoading(true)
      setError('')

      try {
        let resultado: DetalleCita[] = []

        if (user?.rol === 'Odontólogo') {
          const citasPropias: CreatedAppointment[] = []
          let pagina = 0
          let ultima = false

          while (!ultima) {
            const respuesta = await apiRequest<PaginaCitas>(
              `/api/citas/mi-agenda?pagina=${pagina}&tamano=50`, { accessToken }
            )

            citasPropias.push(...respuesta.contenido)
            ultima = respuesta.esUltima || respuesta.contenido.length === 0
            pagina++
          }

          resultado = await Promise.all(
            citasPropias.map(c => citaDetalleApi.detalle(accessToken, c.idCita))
          )
        } else {
          resultado = await citaDetalleApi.agenda(accessToken)
        }

        if (activo) setCitas(resultado)
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar las citas.')
      } finally {
        if (activo) setLoading(false)
      }
    }

    void cargar()
    return () => { activo = false }
  }, [accessToken, user?.rol, actualizacion])

  const rows = useMemo(() => {
    const buscar = query.trim().toLowerCase()

    const hoy = new Date()
    const manana = new Date(hoy)
    manana.setDate(hoy.getDate() + 1)

    const fechaHoy = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Lima', })
    const fechaManana = manana.toLocaleDateString('en-CA', { timeZone: 'America/Lima', })
    const ahora = Date.now()

    return citas
      .filter(c => {
        const fecha = c.fechaHoraInicio.slice(0, 10)

        if (day && fecha !== day) return false
        if (estado && c.estado !== estado) return false
        if (vista === 'HOY' && fecha !== fechaHoy) return false
        if (vista === 'MANANA_CONFIRMAR' && (fecha !== fechaManana || c.estado !== 'PROGRAMADA')) return false
        if (vista === 'PROXIMAS' && (new Date(c.fechaHoraInicio).getTime() < ahora || ['ATENDIDA', 'CANCELADA', 'NO_ASISTIO'].includes(c.estado))) return false
        if (vista === 'HISTORIAL' && !['ATENDIDA', 'CANCELADA', 'NO_ASISTIO'].includes(c.estado)) return false
        if (!buscar) return true

        return `${c.pacienteNombre} ${c.odontologoNombre} ${c.especialidadNombre ?? ''} ${c.servicioNombre} ${citaReferencia(c.idCita)} ${c.estado}`
          .toLowerCase()
          .includes(buscar)
      })
      .sort((a, b) => {
        const aFecha = a.fechaHoraInicio
        const bFecha = b.fechaHoraInicio

        if (vista === 'HISTORIAL') return bFecha.localeCompare(aFecha)
        return aFecha.localeCompare(bFecha)
      })
  }, [citas, query, day, estado, vista])

  const totalPaginas = Math.max(1, Math.ceil(rows.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const rowsPaginadas = useMemo(() => rows.slice(inicio, inicio + POR_PAGINA), [rows, inicio])

  return (
    <>
      <PageHead
        title="Citas"
        description="Consulta las citas registradas y la programación de atención del centro."
        actions={
          <div className="flex items-center gap-2">
            {(user?.rol === 'Administrador' || user?.rol === 'Recepcionista') && (
              <Button icon="plus" onClick={() => navigate('/citas/nueva')}>
                Programar cita
              </Button>
            )}
            <Button variant="ghost" onClick={() => setActualizacion(n => n + 1)} disabled={loading} aria-label="Actualizar citas" title="Actualizar citas" className="px-3">
              <Icon name="refreshCw" size={17} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        }
      />

      <Card className="overflow-visible">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput
            placeholder="Buscar paciente, especialista o referencia..."
            aria-label="Buscar citas"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setPagina(1)
            }}
            onClear={() => {
              setQuery('')
              setPagina(1)
            }}
            className="w-full sm:min-w-[12rem] sm:flex-1"
          />

          <AnimatedDatePicker
            label="Filtrar por fecha"
            placeholder="Filtrar por fecha"
            value={day}
            onChange={val => {
              setDay(val)
              setPagina(1)
            }}
            className="w-full sm:w-52 sm:shrink-0"
          />

          <AnimatedSelect
            label="Filtrar por estado"
            value={estado}
            onChange={val => {
              setEstado(val)
              setPagina(1)
            }}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'PROGRAMADA', label: 'Programadas' },
              { value: 'CONFIRMADA', label: 'Confirmadas' },
              { value: 'EN_ATENCION', label: 'En atención' },
              { value: 'ATENDIDA', label: 'Atendidas' },
              { value: 'CANCELADA', label: 'Canceladas' },
              { value: 'NO_ASISTIO', label: 'No asistió' },
            ]}
            className="w-full sm:w-48"
          />

          <AnimatedSelect
            label="Vista rápida"
            value={vista}
            onChange={val => {
              setVista(val)
              setPagina(1)
            }}
            options={[
              { value: '', label: 'Todas las citas' },
              { value: 'HOY', label: 'Citas de hoy' },
              { value: 'MANANA_CONFIRMAR', label: 'Mañana por confirmar' },
              { value: 'PROXIMAS', label: 'Próximas citas' },
              { value: 'HISTORIAL', label: 'Historial' },
            ]}
            className="w-full sm:w-52"
          />
        </div>

        {error ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-danger">{error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => setActualizacion(n => n + 1)}>
              Intentar nuevamente
            </Button>
          </div>
        ) : (
          <>
            <Table columns={COLUMNS}>
              {loading ? (
                <AppointmentsTableSkeleton rows={POR_PAGINA} />
              ) : (
                <>
                  <TableState
                    colSpan={COLUMNS.length}
                    empty={rows.length === 0}
                    emptyLabel="No se encontraron citas con los filtros seleccionados."
                  />

                  {rowsPaginadas.map((cita, index) => (
                    <motion.tr
                      key={cita.idCita}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.1) }}
                      className="transition-colors hover:bg-alt/60"
                    >
                      {/* REFERENCIA */}
                      <td>
                        <span className="font-semibold text-brand">
                          {citaReferencia(cita.idCita)}
                        </span>
                      </td>

                      {/* PACIENTE */}
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar
                            nombre={cita.pacienteNombre}
                            seed={cita.pacienteId}
                            size={36}
                            animate="hover"
                            trackCursor={false}
                          />
                          <div className="min-w-0">
                            <p className="font-bold leading-tight text-ink">
                              {cita.pacienteNombre}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {cita.servicioNombre}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* ESPECIALISTA */}
                      <td>
                        <p className="font-semibold leading-tight text-ink">
                          {cita.odontologoNombre
                            ? cita.odontologoNombre.startsWith('Dr')
                              ? cita.odontologoNombre
                              : `Dr(a). ${cita.odontologoNombre}`
                            : 'Por asignar'}
                        </p>
                        {cita.especialidadNombre && (
                          <p className="mt-0.5 text-xs text-muted">
                            {cita.especialidadNombre}
                          </p>
                        )}
                      </td>

                      {/* FECHA Y HORA */}
                      <td>
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-semibold text-ink">
                            {fechaFormato(cita.fechaHoraInicio)}
                          </span>
                          <span className="text-muted">
                            {horaFormato(cita.fechaHoraInicio)}
                          </span>
                        </div>
                      </td>

                      {/* ESTADO */}
                      <td className="text-center">
                        <div className="flex justify-center">
                          <Badge tone={tonoEstado(cita.estado)}>
                            {cita.estado.replaceAll('_', ' ')}
                          </Badge>
                        </div>
                      </td>

                      {/* ACCIONES */}
                      <ActionsCell align="center">
                        <RowActions
                          actions={[
                            {
                              label: 'Ver detalle',
                              icon: 'eye',
                              onClick: () => navigate(`/citas/${cita.idCita}`),
                            },
                          ]}
                        />
                      </ActionsCell>
                    </motion.tr>
                  ))}
                </>
              )}
            </Table>

            {rows.length > 0 && (
              <TableFoot summary={`Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAGINA, rows.length)} de ${rows.length} citas`}>
                <Pagination page={paginaActual} totalPages={totalPaginas} onChange={setPagina} />
              </TableFoot>
            )}
          </>
        )}
      </Card>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </>
  )
}