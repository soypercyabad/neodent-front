import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ActionsCell,
  Avatar,
  Badge,
  Card,
  Icon,
  PageHead,
  RowActions,
} from '@/shared/components/ui'
import type { IconName } from '@/shared/components/ui/Icon'
import { useAuth } from '@/features/auth'
import { PatientDashboard } from './PatientDashboard'
import {
  dashboardApi,
  type AdminDashboardData,
  type DentistDashboardData,
  type ReceptionDashboardData,
} from '../api/dashboardApi'
import type { DetalleCita } from '@/features/appointments/api/citaDetalleApi'
import { citaReferencia } from '@/features/appointments/model/citaReferencia'

type PeriodoFiltro = '7D' | '30D' | 'AÑO' | 'TODO'

const cardAnimation = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
}

const ACCENT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/80' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/80' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/80' },
}

const CHART_PALETTE = [
  '#2563EB', // Azul primario
  '#10B981', // Esmeralda
  '#8B5CF6', // Violeta
  '#F59E0B', // Ámbar
  '#06B6D4', // Cian
  '#EC4899', // Rosa
  '#6366F1', // Índigo
  '#14B8A6', // Teal
]

const tonoEstado = (estado: string): 'green' | 'blue' | 'red' | 'gray' => {
  if (estado === 'CONFIRMADA' || estado === 'ATENDIDA') return 'green'
  if (estado === 'PROGRAMADA' || estado === 'EN_ATENCION') return 'blue'
  if (estado === 'CANCELADA' || estado === 'NO_ASISTIO') return 'red'
  return 'gray'
}

function MetricCard({
  title,
  value,
  detail,
  icon,
  accent = 'blue',
  index,
}: {
  title: string
  value: string | number
  detail?: string
  icon: IconName
  accent?: 'blue' | 'green' | 'purple' | 'amber'
  index: number
}) {
  const style = ACCENT_STYLES[accent] ?? ACCENT_STYLES.blue

  return (
    <motion.div
      {...cardAnimation}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
    >
      <Card className="h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {title}
          </p>

          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl border ${style.bg} ${style.text} ${style.border}`}
          >
            <Icon name={icon} size={20} />
          </span>
        </div>

        <p className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {value}
        </p>

        {detail && (
          <p className="mt-1 text-xs text-ink-soft">
            {detail}
          </p>
        )}
      </Card>
    </motion.div>
  )
}

function QuickLink({
  href,
  label,
  description,
  icon,
}: {
  href: string
  label: string
  description: string
  icon: IconName
}) {
  return (
    <Link
      to={href}
      className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-alt/30 hover:shadow-2xs"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-alt text-brand transition-colors group-hover:bg-brand group-hover:text-white">
          <Icon name={icon} size={20} />
        </span>

        <div className="min-w-0">
          <p className="font-bold text-ink text-sm group-hover:text-brand transition-colors">
            {label}
          </p>
          <p className="text-xs text-muted truncate">{description}</p>
        </div>
      </div>

      <Icon
        name="chevronRight"
        size={16}
        className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand"
      />
    </Link>
  )
}

/**
 * Tabla de citas en vivo (usada en Admin, Recepción y Odontólogo)
 */
function RealAppointmentsTable({
  citas,
  titulo = 'Citas recientes',
  descripcion = 'Atenciones programadas y registradas en el sistema.',
  verTodoHref = '/citas',
  filtroEstado,
  mostrarOdontologo = true,
}: {
  citas: DetalleCita[]
  titulo?: string
  descripcion?: string
  verTodoHref?: string
  filtroEstado?: string
  mostrarOdontologo?: boolean
}) {
  const navigate = useNavigate()

  const [sortColumn, setSortColumn] = useState<string>('fechaHoraInicio')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(colKey)
      setSortDirection('asc')
    }
  }

  const citasFiltradas = useMemo(() => {
    let res = citas
    if (filtroEstado) {
      res = res.filter(c => c.estado === filtroEstado)
    }
    const dir = sortDirection === 'asc' ? 1 : -1
    const ordenadas = [...res].sort((a, b) => {
      if (sortColumn === 'idCita') return (a.idCita - b.idCita) * dir
      if (sortColumn === 'pacienteNombre') return a.pacienteNombre.localeCompare(b.pacienteNombre, 'es') * dir
      if (sortColumn === 'servicioNombre') return a.servicioNombre.localeCompare(b.servicioNombre, 'es') * dir
      if (sortColumn === 'odontologoNombre') return (a.odontologoNombre || '').localeCompare(b.odontologoNombre || '', 'es') * dir
      if (sortColumn === 'fechaHoraInicio') return a.fechaHoraInicio.localeCompare(b.fechaHoraInicio) * dir
      if (sortColumn === 'estado') return a.estado.localeCompare(b.estado, 'es') * dir
      return 0
    })
    return ordenadas.slice(0, 8)
  }, [citas, filtroEstado, sortColumn, sortDirection])

  const formatoHora = (iso: string) => {
    try {
      const [h, m] = iso.slice(11, 16).split(':').map(Number)
      return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
    } catch {
      return iso.slice(11, 16)
    }
  }

  const formatoFecha = (iso: string) => {
    try {
      const [, m, d] = iso.slice(0, 10).split('-')
      return `${d}/${m}`
    } catch {
      return iso.slice(0, 10)
    }
  }

  const renderSortableHeader = (colKey: string, label: string, align: 'left' | 'center' = 'left') => {
    const isSorted = sortColumn === colKey
    return (
      <th
        onClick={() => handleSort(colKey)}
        className={cn(
          'px-4 py-3.5 cursor-pointer select-none transition-colors hover:bg-alt/80 group',
          align === 'center' ? 'text-center' : 'text-left',
          isSorted ? 'text-brand font-extrabold bg-brand-soft/20' : 'text-muted',
        )}
        title={`Ordenar por ${label}`}
      >
        <div className={cn('inline-flex items-center gap-1.5', align === 'center' && 'justify-center w-full')}>
          <span>{label}</span>
          <span className={cn('inline-flex items-center transition-colors', isSorted ? 'text-brand' : 'text-muted/40 group-hover:text-muted')}>
            {isSorted ? (
              sortDirection === 'asc' ? <Icon name="chevronUp" size={13} strokeWidth={2.5} /> : <Icon name="chevronDown" size={13} strokeWidth={2.5} />
            ) : (
              <Icon name="chevronsUpDown" size={12} strokeWidth={1.8} />
            )}
          </span>
        </div>
      </th>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6 border-b border-line/60">
        <div>
          <h2 className="text-base font-bold text-ink">{titulo}</h2>
          <p className="mt-0.5 text-xs text-muted">{descripcion}</p>
        </div>

        <Link
          to={verTodoHref}
          className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
        >
          <span>Ver todas las citas</span>
          <Icon name="chevronRight" size={13} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="border-b border-line bg-[#F8FAFD] text-[0.78rem] font-bold uppercase tracking-wider text-muted">
            <tr>
              {renderSortableHeader('idCita', 'Ref.')}
              {renderSortableHeader('pacienteNombre', 'Paciente')}
              {renderSortableHeader('servicioNombre', 'Servicio')}
              {mostrarOdontologo && renderSortableHeader('odontologoNombre', 'Odontólogo')}
              {renderSortableHeader('fechaHoraInicio', 'Horario')}
              {renderSortableHeader('estado', 'Estado', 'center')}
              <th className="px-4 py-3.5 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line/70">
            {citasFiltradas.length === 0 ? (
              <tr>
                <td
                  colSpan={mostrarOdontologo ? 7 : 6}
                  className="px-4 py-10 text-center text-muted"
                >
                  <p className="text-sm">No hay citas registradas para este criterio.</p>
                </td>
              </tr>
            ) : (
              citasFiltradas.map(cita => (
                <tr key={cita.idCita} className="transition-colors hover:bg-alt/40">
                  <td className="px-4 py-3.5 font-semibold text-brand whitespace-nowrap">
                    {citaReferencia(cita.idCita)}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar
                        nombre={cita.pacienteNombre}
                        seed={cita.pacienteId}
                        size={36}
                        animate="hover"
                        trackCursor={false}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-ink leading-tight">
                          {cita.pacienteNombre}
                        </p>
                        {cita.pacienteNumeroDocumento && (
                          <p className="mt-0.5 text-xs text-muted">
                            {cita.pacienteTipoDocumento || 'DNI'} {cita.pacienteNumeroDocumento}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <p className="font-medium text-ink leading-tight">{cita.servicioNombre}</p>
                    <p className="mt-0.5 text-xs text-muted">{cita.sedeNombre}</p>
                  </td>

                  {mostrarOdontologo && (
                    <td className="px-4 py-3.5 text-ink-soft">
                      {cita.odontologoNombre
                        ? cita.odontologoNombre.startsWith('Dr')
                          ? cita.odontologoNombre
                          : `Dr(a). ${cita.odontologoNombre}`
                        : 'Por asignar'}
                    </td>
                  )}

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-ink">{formatoFecha(cita.fechaHoraInicio)}</span>
                      <span className="text-muted">{formatoHora(cita.fechaHoraInicio)}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <Badge tone={tonoEstado(cita.estado)}>
                      {cita.estado.replaceAll('_', ' ')}
                    </Badge>
                  </td>

                  <ActionsCell align="center">
                    <RowActions
                      actions={[
                        {
                          label: 'Ver detalle de la cita',
                          icon: 'eye',
                          onClick: () => navigate(`/citas/${cita.idCita}`),
                        },
                      ]}
                    />
                  </ActionsCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const { accessToken, user } = useAuth()
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('30D')

  // Estados de datos reales
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null)
  const [dentistData, setDentistData] = useState<DentistDashboardData | null>(null)
  const [receptionData, setReceptionData] = useState<ReceptionDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const role = user?.rol || 'Administrador'
  const isAdmin = role === 'Administrador'
  const isReception = role === 'Recepcionista'
  const isDentist = role === 'Odontólogo'

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    let activo = true

    const cargarDatos = async () => {
      setLoading(true)
      setError(null)
      try {
        if (isAdmin) {
          const res = await dashboardApi.getAdminData(accessToken)
          if (activo) setAdminData(res)
        } else if (isDentist) {
          const res = await dashboardApi.getDentistData(accessToken, user?.id ? Number(user.id) : undefined)
          if (activo) setDentistData(res)
        } else if (isReception) {
          const res = await dashboardApi.getReceptionData(accessToken)
          if (activo) setReceptionData(res)
        }
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'Error al cargar datos del dashboard')
      } finally {
        if (activo) setLoading(false)
      }
    }

    void cargarDatos()
    return () => { activo = false }
  }, [accessToken, isAdmin, isDentist, isReception, user?.id])

  // Si es Paciente, renderizar su Dashboard especializado
  if (user?.rol === 'Paciente') {
    return <PatientDashboard />
  }

  // --- FILTRADO TEMPORAL PARA ADMINISTRADOR ---
  const citasFiltradasAdmin = useMemo(() => {
    if (!adminData) return []
    const ahora = Date.now()
    const dias = periodo === '7D' ? 7 : periodo === '30D' ? 30 : periodo === 'AÑO' ? 365 : 9999
    const limite = ahora - dias * 24 * 60 * 60 * 1000

    return adminData.citas.filter(c => new Date(c.fechaHoraInicio).getTime() >= limite)
  }, [adminData, periodo])

  // 1. Datos para gráfico de evolución (AreaChart)
  const evolucionData = useMemo(() => {
    const agrupado: Record<string, { total: number; atendidas: number }> = {}

    // Orden cronológico
    const ordenadas = [...citasFiltradasAdmin].sort(
      (a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime(),
    )

    for (const c of ordenadas) {
      const fecha = c.fechaHoraInicio.slice(5, 10) // MM-DD
      if (!agrupado[fecha]) {
        agrupado[fecha] = { total: 0, atendidas: 0 }
      }
      agrupado[fecha].total++
      if (c.estado === 'ATENDIDA') {
        agrupado[fecha].atendidas++
      }
    }

    const resultado = Object.entries(agrupado).map(([label, v]) => ({
      fecha: label,
      Programadas: v.total,
      Atendidas: v.atendidas,
    }))

    // Si hay muy pocos datos, asegurar al menos una estructura
    if (resultado.length === 0) {
      return [
        { fecha: 'Inicio', Programadas: 0, Atendidas: 0 },
        { fecha: 'Actual', Programadas: 0, Atendidas: 0 },
      ]
    }
    return resultado
  }, [citasFiltradasAdmin])

  // 2. Datos para servicios más demandados
  const serviciosData = useMemo(() => {
    const conteo: Record<string, number> = {}
    for (const c of citasFiltradasAdmin) {
      const nom = c.servicioNombre || 'Consulta General'
      conteo[nom] = (conteo[nom] || 0) + 1
    }

    return Object.entries(conteo)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [citasFiltradasAdmin])

  // 3. Distribución de estados (Pie / Donut)
  const estadosData = useMemo(() => {
    const conteo: Record<string, number> = {
      Confirmadas: 0,
      Atendidas: 0,
      'En atención': 0,
      Canceladas: 0,
      Pendientes: 0,
    }

    for (const c of citasFiltradasAdmin) {
      if (c.estado === 'CONFIRMADA') conteo.Confirmadas++
      else if (c.estado === 'ATENDIDA') conteo.Atendidas++
      else if (c.estado === 'EN_ATENCION') conteo['En atención']++
      else if (c.estado === 'CANCELADA' || c.estado === 'NO_ASISTIO') conteo.Canceladas++
      else conteo.Pendientes++
    }

    return [
      { name: 'Atendidas', value: conteo.Atendidas, color: '#10B981' },
      { name: 'Confirmadas', value: conteo.Confirmadas, color: '#3B82F6' },
      { name: 'En atención', value: conteo['En atención'], color: '#8B5CF6' },
      { name: 'Canceladas', value: conteo.Canceladas, color: '#EF4444' },
      { name: 'Pendientes', value: conteo.Pendientes, color: '#F59E0B' },
    ].filter(item => item.value > 0)
  }, [citasFiltradasAdmin])

  // 4. Productividad por odontólogo
  const productividadDoctores = useMemo(() => {
    const docMap: Record<string, { total: number; atendidas: number }> = {}

    for (const c of citasFiltradasAdmin) {
      const doc = c.odontologoNombre || 'Por asignar'
      if (!docMap[doc]) {
        docMap[doc] = { total: 0, atendidas: 0 }
      }
      docMap[doc].total++
      if (c.estado === 'ATENDIDA') {
        docMap[doc].atendidas++
      }
    }

    return Object.entries(docMap)
      .map(([doctor, val]) => ({
        doctor: doctor.replace(/^Dr\(a\)\.\s*/, ''),
        citas: val.total,
        atendidas: val.atendidas,
      }))
      .sort((a, b) => b.citas - a.citas)
      .slice(0, 5)
  }, [citasFiltradasAdmin])

  // Facturación filtrada
  const facturacionPeriodo = useMemo(() => {
    return citasFiltradasAdmin
      .filter(c => c.estado === 'ATENDIDA' || c.estado === 'CONFIRMADA')
      .reduce((acc, c) => acc + (c.precioReferencial || 0), 0)
  }, [citasFiltradasAdmin])

  // 5. Demanda de atenciones por Sede
  const sedesData = useMemo(() => {
    const conteo: Record<string, number> = {}
    for (const c of citasFiltradasAdmin) {
      const sede = c.sedeNombre || 'Sede Principal'
      conteo[sede] = (conteo[sede] || 0) + 1
    }

    const items = Object.entries(conteo)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    if (items.length === 0 && adminData?.sedesTotal) {
      return [{ name: 'Sede Principal', total: 0 }]
    }
    return items
  }, [citasFiltradasAdmin, adminData])

  // 6. Horarios / Turnos con mayor afluencia
  const turnosData = useMemo(() => {
    const conteo: Record<string, number> = {
      'Mañana (8 - 12h)': 0,
      'Tarde (12 - 16h)': 0,
      'Noche (16 - 20h)': 0,
    }

    for (const c of citasFiltradasAdmin) {
      try {
        const hora = parseInt(c.fechaHoraInicio.slice(11, 13), 10)
        if (isNaN(hora)) {
          conteo['Tarde (12 - 16h)']++
        } else if (hora < 12) {
          conteo['Mañana (8 - 12h)']++
        } else if (hora < 16) {
          conteo['Tarde (12 - 16h)']++
        } else {
          conteo['Noche (16 - 20h)']++
        }
      } catch {
        conteo['Tarde (12 - 16h)']++
      }
    }

    return Object.entries(conteo).map(([turno, total]) => ({ turno, total }))
  }, [citasFiltradasAdmin])

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <PageHead
        title={
          isAdmin
            ? 'Panel de Control Ejecutivo'
            : isDentist
              ? 'Mi Agenda y Atenciones'
              : 'Gestión Diaria de Recepción'
        }
        description={
          isAdmin
            ? 'Monitoreo en tiempo real de citas, pacientes, productividad e ingresos.'
            : isDentist
              ? 'Consulta tus próximas atenciones y el seguimiento de tus pacientes.'
              : 'Control de citas de hoy, llegadas de pacientes y agenda general.'
        }
        actions={
          isAdmin ? (
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-2xs">
              {(['7D', '30D', 'AÑO', 'TODO'] as PeriodoFiltro[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    periodo === p
                      ? 'bg-brand text-white shadow-2xs'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {p === '7D' ? '7 Días' : p === '30D' ? '30 Días' : p === 'AÑO' ? 'Año' : 'Todo'}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-line bg-surface">
          <div className="flex items-center gap-2.5 text-sm text-muted">
            <Icon name="spinner" size={20} className="animate-spin text-brand" />
            <span>Cargando indicadores en tiempo real…</span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            className="mt-3 text-xs font-bold text-brand hover:underline"
            onClick={() => window.location.reload()}
          >
            Reintentar carga
          </button>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/*                   VISTA ADMINISTRADOR                        */}
          {/* ============================================================ */}
          {isAdmin && adminData && (
            <>
              {/* KPIS PRINCIPALES */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Pacientes Totales"
                  value={adminData.pacientesTotal}
                  detail={`${adminData.pacientesActivos} activos · +${adminData.pacientesNuevosMes} este mes`}
                  icon="pacientes"
                  accent="blue"
                  index={0}
                />
                <MetricCard
                  title={`Citas (${periodo === 'TODO' ? 'Total' : periodo})`}
                  value={citasFiltradasAdmin.length}
                  detail={`${adminData.citasAtendidas} atendidas · ${adminData.citasConfirmadas} confirmadas`}
                  icon="calendar"
                  accent="purple"
                  index={1}
                />
                <MetricCard
                  title="Ingresos Estimados"
                  value={`S/ ${facturacionPeriodo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
                  detail="Atenciones completadas y confirmadas"
                  icon="creditCard"
                  accent="green"
                  index={2}
                />
                <MetricCard
                  title="Equipo Clínico"
                  value={adminData.personalTotal}
                  detail={`${adminData.odontologosTotal} odontólogos · ${adminData.recepcionistasTotal} recepción`}
                  icon="usuarios"
                  accent="amber"
                  index={3}
                />
              </div>

              {/* GRÁFICOS ANALÍTICOS (3 GRÁFICOS POR FILA) */}
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {/* 1. Evolución temporal de citas */}
                <motion.div {...cardAnimation}>
                  <Card className="p-5 flex h-full flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-ink">Evolución de atenciones</h2>
                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          <span className="flex items-center gap-1 text-brand">
                            <span className="size-2 rounded-full bg-brand" />
                            Prog.
                          </span>
                          <span className="flex items-center gap-1 text-emerald-600">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Atend.
                          </span>
                        </div>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        Citas programadas vs atenciones efectivas
                      </p>
                    </div>

                    <div className="mt-3 h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={evolucionData}
                          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorProgramadas" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorAtendidas" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF5" />
                          <XAxis dataKey="fecha" tick={{ fill: '#718096', fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tick={{ fill: '#718096', fontSize: 11 }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid #E8EDF5',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="Programadas"
                            stroke="#2563EB"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorProgramadas)"
                          />
                          <Area
                            type="monotone"
                            dataKey="Atendidas"
                            stroke="#10B981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorAtendidas)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </motion.div>

                {/* 2. Tratamientos más solicitados (Barras multicolores) */}
                <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0.05 }}>
                  <Card className="p-5 flex h-full flex-col justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-ink">Tratamientos más solicitados</h2>
                      <p className="mt-0.5 text-xs text-muted">
                        Demanda clínica diferenciada por servicio
                      </p>
                    </div>

                    {serviciosData.length === 0 ? (
                      <div className="flex h-52 items-center justify-center text-xs text-muted">
                        No hay servicios en este rango.
                      </div>
                    ) : (
                      <div className="mt-3 h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={serviciosData}
                            margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8EDF5" />
                            <XAxis type="number" allowDecimals={false} tick={{ fill: '#718096', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#334155', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: '1px solid #E8EDF5',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                                fontSize: 12,
                              }}
                            />
                            <Bar dataKey="total" name="Citas" radius={[0, 6, 6, 0]} maxBarSize={18}>
                              {serviciosData.map((_, index) => (
                                <Cell
                                  key={`srv-${index}`}
                                  fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>
                </motion.div>

                {/* 3. Distribución por estados (Donut Chart) */}
                <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0.1 }}>
                  <Card className="p-5 flex h-full flex-col justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-ink">Distribución de estados</h2>
                      <p className="mt-0.5 text-xs text-muted">
                        Estado operativo de la agenda
                      </p>
                    </div>

                    <div className="my-1 h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={estadosData}
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {estadosData.map(entry => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid #E8EDF5',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-line/60">
                      {estadosData.map(item => (
                        <div key={item.name} className="flex items-center gap-1 text-[11px] text-ink-soft">
                          <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-medium">{item.name}:</span>
                          <span className="font-bold text-ink">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>

                {/* 4. Productividad por Odontólogo */}
                <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0.15 }}>
                  <Card className="p-5 flex h-full flex-col justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-ink">Atenciones por Especialista</h2>
                      <p className="mt-0.5 text-xs text-muted">
                        Citas asignadas y efectivas por doctor
                      </p>
                    </div>

                    {productividadDoctores.length === 0 ? (
                      <div className="flex h-52 items-center justify-center text-xs text-muted">
                        No hay especialistas registrados en este período.
                      </div>
                    ) : (
                      <div className="mt-3 h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={productividadDoctores}
                            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF5" />
                            <XAxis dataKey="doctor" tick={{ fill: '#718096', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tick={{ fill: '#718096', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: '1px solid #E8EDF5',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                                fontSize: 12,
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                            <Bar dataKey="citas" name="Asignadas" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="atendidas" name="Atendidas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>
                </motion.div>

                {/* 5. Demanda de citas por Sede (Barras multicolores) */}
                <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0.2 }}>
                  <Card className="p-5 flex h-full flex-col justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-ink">Demanda por Sede</h2>
                      <p className="mt-0.5 text-xs text-muted">
                        Distribución de atenciones por consultorio
                      </p>
                    </div>

                    {sedesData.length === 0 ? (
                      <div className="flex h-52 items-center justify-center text-xs text-muted">
                        No hay sedes con citas en el período.
                      </div>
                    ) : (
                      <div className="mt-3 h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={sedesData}
                            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF5" />
                            <XAxis dataKey="name" tick={{ fill: '#718096', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tick={{ fill: '#718096', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: '1px solid #E8EDF5',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                                fontSize: 12,
                              }}
                            />
                            <Bar dataKey="total" name="Citas" radius={[4, 4, 0, 0]} maxBarSize={28}>
                              {sedesData.map((_, index) => (
                                <Cell
                                  key={`sede-${index}`}
                                  fill={CHART_PALETTE[(index + 2) % CHART_PALETTE.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>
                </motion.div>

                {/* 6. Afluencia por Horario / Turno (Barras multicolores) */}
                <motion.div {...cardAnimation} transition={{ ...cardAnimation.transition, delay: 0.25 }}>
                  <Card className="p-5 flex h-full flex-col justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-ink">Afluencia por Turno</h2>
                      <p className="mt-0.5 text-xs text-muted">
                        Horarios con mayor concentración de citas
                      </p>
                    </div>

                    <div className="mt-3 h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={turnosData}
                          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF5" />
                          <XAxis dataKey="turno" tick={{ fill: '#718096', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tick={{ fill: '#718096', fontSize: 11 }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid #E8EDF5',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="total" name="Citas" radius={[4, 4, 0, 0]} maxBarSize={32}>
                            {turnosData.map((_, index) => (
                              <Cell
                                key={`turno-${index}`}
                                fill={CHART_PALETTE[(index + 4) % CHART_PALETTE.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* TABLA DE CITAS EN VIVO Y ACCESOS RÁPIDOS */}
              <div className="space-y-4">
                <RealAppointmentsTable
                  citas={adminData.citas}
                  titulo="Agenda y citas recientes"
                  descripcion="Últimas citas registradas en la plataforma en tiempo real."
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <QuickLink
                    href="/usuarios"
                    label="Personal y usuarios"
                    description="Gestiona trabajadores y roles."
                    icon="usuarios"
                  />
                  <QuickLink
                    href="/pacientes"
                    label="Padrón de pacientes"
                    description="Historial e historias clínicas."
                    icon="pacientes"
                  />
                  <QuickLink
                    href="/servicios"
                    label="Catálogo de servicios"
                    description="Tratamientos y tarifas."
                    icon="tooth"
                  />
                  <QuickLink
                    href="/sedes"
                    label="Sedes del centro"
                    description="Consultorios e infraestructura."
                    icon="mapPin"
                  />
                </div>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/*                   VISTA ODONTÓLOGO                           */}
          {/* ============================================================ */}
          {isDentist && dentistData && (
            <div className="space-y-5">
              {/* Tarjeta de bienvenida */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex min-h-[170px] items-center rounded-[24px] border border-line/60 bg-gradient-to-r from-brand-soft/70 via-alt to-surface px-6 py-6 shadow-2xs mt-8 sm:mt-12"
              >
                <div className="relative z-10 max-w-xs sm:max-w-xl">
                  <span className="inline-flex rounded-full bg-surface px-3 py-1 text-xs font-bold text-brand shadow-2xs">
                    ESPACIO CLÍNICO
                  </span>
                  <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
                    ¡Bienvenido, Dr(a). {user?.nombre || 'Especialista'}!
                  </h2>
                  <p className="mt-1 text-xs text-ink-soft sm:text-sm">
                    Revisa las atenciones que tienes programadas para el día de hoy y gestiona tus pacientes.
                  </p>
                </div>
                <img
                  src="/illustrations/dentista.svg"
                  alt="Doctora Odontóloga"
                  className="pointer-events-none absolute bottom-0 -right-2 w-44 select-none sm:right-6 sm:w-64 drop-shadow-md z-20"
                />
              </motion.section>

              {/* KPIS ODONTÓLOGO */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Citas de hoy"
                  value={dentistData.citasHoy}
                  detail={dentistData.citasHoy === 0 ? 'Sin citas asignadas hoy' : 'Programadas para tu jornada'}
                  icon="calendar"
                  accent="blue"
                  index={0}
                />
                <MetricCard
                  title="Atendidas hoy"
                  value={dentistData.citasAtendidasHoy}
                  detail="Pacientes completados"
                  icon="checkCircle"
                  accent="green"
                  index={1}
                />
                <MetricCard
                  title="Próximas citas"
                  value={dentistData.citasProximas}
                  detail="En tu agenda futura"
                  icon="clock"
                  accent="purple"
                  index={2}
                />
                <MetricCard
                  title="Pacientes únicos"
                  value={dentistData.pacientesUnicos}
                  detail="Histórico de pacientes atendidos"
                  icon="user"
                  accent="amber"
                  index={3}
                />
              </div>

              {/* TABLA DE CITAS DEL DOCTOR */}
              <RealAppointmentsTable
                citas={dentistData.citas}
                titulo="Mi agenda de atenciones"
                descripcion="Tus citas programadas para hoy y los próximos días."
                mostrarOdontologo={false}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <QuickLink
                  href="/citas"
                  label="Ver agenda completa"
                  description="Consulta todos tus turnos y horarios."
                  icon="calendar"
                />
                <QuickLink
                  href="/pacientes"
                  label="Fichas de pacientes"
                  description="Consulta la información clínica autorizada."
                  icon="tooth"
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/*                   VISTA RECEPCIONISTA                        */}
          {/* ============================================================ */}
          {isReception && receptionData && (
            <div className="space-y-5">
              {/* Tarjeta de bienvenida */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex min-h-[150px] items-center overflow-hidden rounded-[24px] border border-line/60 bg-gradient-to-r from-sky-50 via-alt to-surface px-6 py-6 shadow-2xs"
              >
                <div className="relative z-10 max-w-xl">
                  <span className="inline-flex rounded-full bg-surface px-3 py-1 text-xs font-bold text-sky-700 shadow-2xs">
                    MÓDULO DE RECEPCIÓN
                  </span>
                  <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
                    ¡Buenos días, {user?.nombre || 'Recepcionista'}!
                  </h2>
                  <p className="mt-1 text-xs text-ink-soft sm:text-sm">
                    Gestiona el ingreso de pacientes, confirma asistencia y organiza la agenda diaria del centro.
                  </p>
                </div>
              </motion.section>

              {/* KPIS RECEPCIÓN */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Citas para hoy"
                  value={receptionData.citasHoy}
                  detail={
                    receptionData.citasHoy === 0
                      ? receptionData.citasProximasTotal > 0
                        ? `${receptionData.citasProximasTotal} citas próximas agendadas`
                        : 'Sin turnos en la fecha'
                      : `${receptionData.citasHoy} turnos en la jornada`
                  }
                  icon="calendar"
                  accent="blue"
                  index={0}
                />
                <MetricCard
                  title="Por atender"
                  value={
                    receptionData.citasHoy > 0
                      ? receptionData.citasPendientesHoy
                      : receptionData.citasPendientesTotal
                  }
                  detail={
                    receptionData.citasHoy > 0
                      ? 'Pendientes de atención hoy'
                      : `${receptionData.citasPendientesTotal} pendientes en agenda general`
                  }
                  icon="clock"
                  accent="amber"
                  index={1}
                />
                <MetricCard
                  title="En atención"
                  value={receptionData.citasEnAtencionHoy}
                  detail="En consultorio actualmente"
                  icon="activity"
                  accent="purple"
                  index={2}
                />
                <MetricCard
                  title="Pacientes nuevos (7d)"
                  value={receptionData.pacientesNuevosSemana}
                  detail="Registrados esta semana"
                  icon="pacientes"
                  accent="green"
                  index={3}
                />
              </div>

              {/* TABLA DE CITAS DEL DÍA O PRÓXIMAS */}
              <RealAppointmentsTable
                citas={
                  receptionData.citasDeHoy.length > 0
                    ? receptionData.citasDeHoy
                    : receptionData.citasProximas.length > 0
                      ? receptionData.citasProximas
                      : receptionData.citas
                }
                titulo={
                  receptionData.citasDeHoy.length > 0
                    ? 'Cronograma de citas de hoy'
                    : 'Próximas citas programadas'
                }
                descripcion={
                  receptionData.citasDeHoy.length > 0
                    ? 'Atenciones y reservas programadas para la jornada de hoy.'
                    : 'No hay citas para el día de hoy. Mostrando las próximas atenciones registradas en el sistema.'
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <QuickLink
                  href="/citas"
                  label="Gestión de citas"
                  description="Agenda y confirma atenciones."
                  icon="calendar"
                />
                <QuickLink
                  href="/pacientes"
                  label="Registrar paciente"
                  description="Ingreso rápido de nuevos pacientes."
                  icon="pacientes"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}