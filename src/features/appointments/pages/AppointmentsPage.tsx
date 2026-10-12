import { useEffect, useState } from 'react'
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
  Tooltip,
  type Column,
  type ToastAviso,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import { citaDetalleApi, type CitaResumen } from '../api/citaDetalleApi'
import { citaReferencia } from '../model/citaReferencia'
import { bookingApi } from '../api/bookingApi'
import { formatPhone } from '@/shared/lib/format'

const COLUMNS: Column[] = [
  { key: 'idCita', label: 'Referencia', sortable: true },
  { key: 'pacienteNombre', label: 'Paciente y Contacto', sortable: true },
  { key: 'odontologoNombre', label: 'Especialista', sortable: true },
  { key: 'sedeNombre', label: 'Sede' },
  { key: 'fechaHoraInicio', label: 'Fecha y hora', sortable: true },
  { key: 'estado', label: 'Estado', align: 'center', sortable: true },
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

  const [citas, setCitas] = useState<CitaResumen[]>([])
  const [totalElementos, setTotalElementos] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [query, setQuery] = useState('')
  const [day, setDay] = useState('')
  const [estado, setEstado] = useState('')
  const [vista, setVista] = useState('')
  const [filtroSede, setFiltroSede] = useState<string>('')
  const [sedes, setSedes] = useState<Array<{ id: number; nombre: string }>>([])
  const [pagina, setPagina] = useState(1)
  const [sortColumn, setSortColumn] = useState<string>('fechaHoraInicio')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actualizacion, setActualizacion] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    let activo = true

    bookingApi.sedes(accessToken)
      .then(res => {
        if (activo) {
          setSedes(res.map(s => ({ id: s.id, nombre: s.nombre })))
        }
      })
      .catch(() => { })

    return () => {
      activo = false
    }
  }, [accessToken])

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
    setPagina(1)
  }

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
        const respuesta = await citaDetalleApi.agenda(accessToken, {
          page: Math.max(0, pagina - 1),
          size: POR_PAGINA,
          fecha: day || undefined,
          estado: estado || undefined,
          vista: vista || undefined,
          buscar: query.trim() || undefined,
          sedeId: filtroSede ? Number(filtroSede) : undefined,
          sortBy: sortColumn,
          direction: sortDirection,
        })

        if (activo) {
          setCitas(respuesta.contenido || [])
          setTotalElementos(respuesta.totalElementos || 0)
          setTotalPaginas(Math.max(1, respuesta.totalPaginas || 1))
        }
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar las citas.')
      } finally {
        if (activo) setLoading(false)
      }
    }

    void cargar()
    return () => { activo = false }
  }, [accessToken, pagina, query, day, estado, vista, filtroSede, sortColumn, sortDirection, actualizacion])

  const inicio = (pagina - 1) * POR_PAGINA

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
            <Button variant="ghost" onClick={() => setActualizacion(n => n + 1)} disabled={loading} aria-label="Actualizar citas" tooltip="Actualizar citas" className="px-3">
              <Icon name="refreshCw" size={17} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        }
      />

      <Card className="w-full min-w-0 max-w-full overflow-visible">
        <div className="flex flex-col gap-3 border-b border-line p-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="w-full min-w-0 2xl:max-w-md 2xl:flex-1">
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
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <AnimatedDatePicker
              label="Filtrar por fecha"
              placeholder="Filtrar por fecha"
              value={day}
              onChange={val => {
                setDay(val)
                setPagina(1)
              }}
              className="w-full sm:w-auto sm:min-w-[10.5rem] flex-1 sm:flex-initial"
            />

            <AnimatedSelect
              label="Filtrar por sede"
              value={filtroSede}
              onChange={val => {
                setFiltroSede(val)
                setPagina(1)
              }}
              options={[
                { value: '', label: 'Todas las sedes' },
                ...sedes.map(s => ({ value: String(s.id), label: s.nombre })),
              ]}
              className="w-full sm:w-auto sm:min-w-[10.5rem] flex-1 sm:flex-initial"
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
              className="w-full sm:w-auto sm:min-w-[10.5rem] flex-1 sm:flex-initial"
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
              className="w-full sm:w-auto sm:min-w-[11.5rem] flex-1 sm:flex-initial"
            />
          </div>
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
            <Table
              columns={COLUMNS}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {loading ? (
                <AppointmentsTableSkeleton rows={POR_PAGINA} />
              ) : (
                <>
                  <TableState
                    colSpan={COLUMNS.length}
                    empty={citas.length === 0}
                    emptyLabel="No se encontraron citas con los filtros seleccionados."
                  />

                  {citas.map((cita, index) => (
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

                      {/* PACIENTE Y CONTACTO */}
                      <td>
                        <div className="flex items-start gap-3">
                          <Avatar
                            nombre={cita.pacienteNombre}
                            seed={cita.pacienteId}
                            size={36}
                            animate="hover"
                            trackCursor={false}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold leading-tight text-ink">
                              {cita.pacienteNombre}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {cita.servicioNombre}
                            </p>
                            {cita.pacienteTelefono ? (
                              <div className="mt-1 flex items-center gap-1.5 text-xs">
                                <Tooltip content={`Llamar al ${formatPhone(cita.pacienteTelefono)}`} offset={8}>
                                  <a
                                    href={`tel:${cita.pacienteTelefono}`}
                                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted transition-colors hover:bg-alt hover:text-ink"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <Icon name="phone" size={12} className="shrink-0 text-muted" />
                                    <span className="text-[11px] font-medium">{formatPhone(cita.pacienteTelefono)}</span>
                                  </a>
                                </Tooltip>

                                <Tooltip content="Enviar WhatsApp" offset={8}>
                                  <a
                                    href={`https://wa.me/${cita.pacienteTelefono.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-400"
                                    onClick={e => e.stopPropagation()}
                                    aria-label="Enviar WhatsApp"
                                  >
                                    <Icon name="whatsapp" size={17} />
                                  </a>
                                </Tooltip>
                              </div>
                            ) : (
                              <span className="mt-0.5 block text-[11px] text-muted/60">Sin teléfono</span>
                            )}
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

                      {/* SEDE */}
                      <td>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
                          <Icon name="mapPin" size={13} className="shrink-0 text-muted" />
                          <span>{cita.sedeNombre || 'No asignada'}</span>
                        </div>
                      </td>

                      {/* FECHA Y HORA */}
                      <td>
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-semibold text-ink">
                            {fechaFormato(cita.fechaHoraInicio)}
                          </span>
                          <span className="text-muted">
                            {horaFormato(cita.fechaHoraInicio)}
                            {cita.duracionMinutos ? ` (${cita.duracionMinutos} min)` : ''}
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

            {totalElementos > 0 && (
              <TableFoot summary={`Mostrando ${inicio + 1}-${Math.min(inicio + POR_PAGINA, totalElementos)} de ${totalElementos} citas`}>
                <Pagination page={pagina} totalPages={totalPaginas} onChange={setPagina} />
              </TableFoot>
            )}
          </>
        )}
      </Card>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </>
  )
}