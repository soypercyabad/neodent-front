import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, Icon, PageHead } from '@/shared/components/ui'
import type { IconName } from '@/shared/components/ui/Icon'
import { useAuth } from '@/features/auth'
import { DEMO_APPOINTMENTS, DEMO_ATTENDED, DEMO_METRICS, DEMO_PATIENTS, DEMO_SERVICES, } from '../model/demoData'
import { PatientDashboard } from './PatientDashboard'

type Metric = {
  title: string
  value: string
  detail: string
  icon: IconName
  accent: string
}

type ChartType = 'citas' | 'pacientes'

const cardAnimation = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
}

const ROLE_METRICS: Record<string, Metric[]> = {
  Administrador: [
    {
      title: 'Pacientes totales',
      value: DEMO_METRICS.Administrador['Pacientes totales'],
      detail: 'Pacientes registrados',
      icon: 'pacientes',
      accent: 'blue',
    },
    {
      title: 'Pacientes nuevos',
      value: DEMO_METRICS.Administrador['Pacientes nuevos'],
      detail: 'Esta semana',
      icon: 'user',
      accent: 'green',
    },
    {
      title: 'Citas atendidas',
      value: DEMO_METRICS.Administrador['Citas atendidas'],
      detail: 'Esta semana',
      icon: 'checkCircle',
      accent: 'purple',
    },
    {
      title: 'Servicios realizados',
      value: DEMO_METRICS.Administrador['Servicios realizados'],
      detail: 'Esta semana',
      icon: 'tooth',
      accent: 'orange',
    },
  ],

  Recepcionista: [
    {
      title: 'Citas de hoy',
      value: DEMO_METRICS.Recepcionista['Citas de hoy'],
      detail: 'Agenda del centro',
      icon: 'calendar',
      accent: 'blue',
    },
    {
      title: 'Pacientes por atender',
      value: DEMO_METRICS.Recepcionista['Pacientes por atender'],
      detail: 'Pendientes de hoy',
      icon: 'pacientes',
      accent: 'purple',
    },
    {
      title: 'Pacientes nuevos',
      value: DEMO_METRICS.Recepcionista['Pacientes nuevos'],
      detail: 'Registrados hoy',
      icon: 'user',
      accent: 'green',
    },
    {
      title: 'Citas confirmadas',
      value: DEMO_METRICS.Recepcionista['Citas confirmadas'],
      detail: 'Agenda de hoy',
      icon: 'checkCircle',
      accent: 'orange',
    },
  ],

  Odontólogo: [
    {
      title: 'Mis citas de hoy',
      value: DEMO_METRICS.Odontólogo['Mis citas de hoy'],
      detail: 'Agenda personal',
      icon: 'calendar',
      accent: 'blue',
    },
    {
      title: 'Pacientes atendidos',
      value: DEMO_METRICS.Odontólogo['Pacientes atendidos'],
      detail: 'Durante el día',
      icon: 'checkCircle',
      accent: 'green',
    },
    {
      title: 'Próximas citas',
      value: DEMO_METRICS.Odontólogo['Próximas citas'],
      detail: 'Pendientes de atención',
      icon: 'clock',
      accent: 'purple',
    },
    {
      title: 'Tratamientos en curso',
      value: DEMO_METRICS.Odontólogo['Tratamientos en curso'],
      detail: 'Seguimiento clínico',
      icon: 'tooth',
      accent: 'orange',
    },
  ],
}

const ACCENT_STYLES: Record<string, string> = {
  blue: 'bg-[#EAF2FF] text-[#2878F0]',
  green: 'bg-[#E5F7EF] text-[#229A68]',
  purple: 'bg-[#F1EDFF] text-[#8261DE]',
  orange: 'bg-[#FFF3E5] text-[#D48A27]',
}

function MetricCard({
  metric,
  index,
}: {
  metric: Metric
  index: number
}) {
  return (
    <motion.div
      {...cardAnimation}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: 'easeOut',
      }}
    >
      <Card className="h-full p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-ink-soft">
            {metric.title}
          </p>

          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${
              ACCENT_STYLES[metric.accent]
            }`}
          >
            <Icon name={metric.icon} size={21} />
          </span>
        </div>

        <p className="mt-2 text-3xl font-bold tracking-tight text-ink">
          {metric.value}
        </p>

        <p className="mt-2 text-xs text-muted">
          {metric.detail}
        </p>
      </Card>
    </motion.div>
  )
}

function SectionTitle({
  title,
  detail,
  action,
}: {
  title: string
  detail?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-bold text-ink">{title}</h2>
        {detail && (
          <p className="mt-1 text-xs text-muted">{detail}</p>
        )}
      </div>

      {action}
    </div>
  )
}

function ActivityPanel() {
  const [chart, setChart] = useState<ChartType>('citas')

  const data = chart === 'citas'
    ? DEMO_ATTENDED
    : DEMO_PATIENTS

  return (
    <motion.div {...cardAnimation}>
      <Card className="p-5 sm:p-6">
        <SectionTitle
          title="Actividad semanal"
          detail="Evolución de la actividad durante la semana."
          action={
            <div className="flex rounded-lg bg-brand-soft p-1 text-xs">
              <button
                type="button"
                onClick={() => setChart('citas')}
                className={`rounded-md px-3 py-2 font-semibold transition-colors ${
                  chart === 'citas'
                    ? 'bg-surface text-brand shadow-sm'
                    : 'text-muted hover:text-brand'
                }`}
              >
                Citas atendidas
              </button>

              <button
                type="button"
                onClick={() => setChart('pacientes')}
                className={`rounded-md px-3 py-2 font-semibold transition-colors ${
                  chart === 'pacientes'
                    ? 'bg-surface text-brand shadow-sm'
                    : 'text-muted hover:text-brand'
                }`}
              >
                Pacientes nuevos
              </button>
            </div>
          }
        />

        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 12,
                right: 12,
                left: -22,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="neodent-chart-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#2878F0"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor="#2878F0"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="#E8EDF5"
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8491A5', fontSize: 12 }}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8491A5', fontSize: 12 }}
              />

              <Tooltip
                cursor={{
                  stroke: '#2878F0',
                  strokeDasharray: '4 4',
                }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E8EDF5',
                  boxShadow: '0 8px 25px rgba(20, 40, 80, 0.08)',
                }}
              />

              <Area
                type="monotone"
                dataKey="total"
                name={
                  chart === 'citas'
                    ? 'Citas atendidas'
                    : 'Pacientes nuevos'
                }
                stroke="#2878F0"
                strokeWidth={3}
                fill="url(#neodent-chart-fill)"
                animationDuration={700}
                activeDot={{
                  r: 6,
                  strokeWidth: 3,
                  stroke: '#FFFFFF',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  )
}

function ServicesPanel() {
  return (
    <motion.div {...cardAnimation}>
      <Card className="p-5">
        <SectionTitle
          title="Servicios más solicitados"
          detail="Distribución de servicios realizados."
        />

        <div className="mx-auto h-[160px] w-full max-w-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={DEMO_SERVICES}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={75}
                paddingAngle={3}
                animationDuration={750}
                stroke="none"
              >
                {DEMO_SERVICES.map(service => (
                  <Cell
                    key={service.name}
                    fill={service.color}
                  />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E8EDF5',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 space-y-3">
          {DEMO_SERVICES.map(service => (
            <div
              key={service.name}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2 text-ink-soft">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: service.color }}
                />
                <span className="truncate">{service.name}</span>
              </span>

              <span className="font-bold text-ink">
                {service.total}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}

function AppointmentsTable({
  isDentist,
}: {
  isDentist: boolean
}) {
  return (
    <motion.div {...cardAnimation}>
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <SectionTitle
            title={isDentist ? 'Mis próximas citas' : 'Próximas citas'}
            detail="Agenda de atención del centro."
            action={
              <Link
                to="/citas"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Ver agenda
              </Link>
            }
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-y border-line bg-[#F8FAFD]">
              <tr className="text-xs text-muted">
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[0.78rem]">Paciente</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[0.78rem]">Servicio</th>
                {!isDentist && (
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[0.78rem]">Odontólogo</th>
                )}
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[0.78rem]">Hora</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[0.78rem]">Estado</th>
              </tr>
            </thead>

            <tbody>
              {DEMO_APPOINTMENTS.map(appointment => (
                <tr
                  key={appointment.id}
                  className="border-b border-line last:border-b-0 hover:bg-[#F8FAFD]"
                >
                  <td className="px-4 py-3.5 font-semibold text-ink">
                    {appointment.paciente}
                  </td>

                  <td className="px-4 py-3.5 text-ink-soft">
                    {appointment.servicio}
                  </td>

                  {!isDentist && (
                    <td className="px-4 py-3.5 text-ink-soft">
                      {appointment.odontologo}
                    </td>
                  )}

                  <td className="px-4 py-3.5 text-ink-soft">
                    {appointment.hora}
                  </td>

                  <td className="px-4 py-3.5">
                    <Badge
                      tone={
                        appointment.estado === 'Confirmada'
                          ? 'green'
                          : appointment.estado === 'En atención'
                            ? 'blue'
                            : 'amber'
                      }
                    >
                      {appointment.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
        <Icon name={icon} size={19} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">
          {label}
        </span>

        <span className="mt-1 block text-xs text-muted">
          {description}
        </span>
      </span>

      <Icon
        name="chevronRight"
        size={16}
        className="shrink-0 text-muted"
      />
    </Link>
  )
}

export function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  if (user.rol === 'Paciente') {
    return <PatientDashboard />
  }

  const role = user.rol
  const isAdmin = role === 'Administrador'
  const isReception = role === 'Recepcionista'
  const isDentist = role === 'Odontólogo'

  const metrics = ROLE_METRICS[role] ?? []

  return (
    <div className="space-y-6">
      <PageHead
        title={isDentist ? 'Mi dashboard' : 'Dashboard'}
        description={
            isAdmin
            ? 'Resumen general de la actividad del centro odontológico.'
            : isReception
                ? 'Agenda y actividad diaria de recepción.'
                : 'Tu agenda y el seguimiento de tus atenciones.'
        }
        actions={
            <span className="rounded-full border border-[#F1D79C] bg-[#FFF7E5] px-3 py-1.5 text-xs font-bold text-[#9A6B1C]">
            VISTA DEMO
            </span>
        }
        />

        {(isReception || isDentist) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative flex min-h-[190px] items-center overflow-hidden rounded-[24px] bg-gradient-to-r from-[#EAF3FF] via-[#F4F8FF] to-white px-6 py-8 shadow-sm sm:px-8"
        >
          <div className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full bg-[#D5E8FF]/60 blur-2xl" />

          <div className="relative z-10 max-w-[68%]">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              {isDentist ? 'Tu espacio clínico' : 'Tu espacio de recepción'}
            </p>

            <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">
              {isDentist ? '¡Listo para una nueva jornada!' : '¡Bienvenido a NeoDents!'}
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-ink-soft">
              {isDentist
                ? 'Consulta tu agenda y accede a las atenciones de tus pacientes.'
                : 'Organiza las citas del día y acompaña a cada paciente desde su llegada.'}
            </p>

            <Link
              to={isDentist ? '/citas' : '/pacientes'}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
            >
              {isDentist ? 'Ver mi agenda' : 'Gestionar pacientes'}
              <Icon name="chevronRight" size={16} />
            </Link>
          </div>

          <motion.img
            src="/illustrations/dentista.svg"
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, x: 16, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.12 }}
            className="pointer-events-none absolute -bottom-12 -right-9 w-48 select-none sm:-bottom-16 sm:right-0 sm:w-64 lg:w-72"
          />
        </motion.section>
      )}

      {/* Indicadores del rol */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
            <MetricCard
            key={metric.title}
            metric={metric}
            index={index}
            />
        ))}
      </div>

      {isAdmin && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          {/* Columna principal */}
          <div className="min-w-0 space-y-5">
            <ActivityPanel />

            <AppointmentsTable isDentist={false} />

            <div className="grid gap-3 sm:grid-cols-2">
              <QuickLink
                href="/usuarios"
                label="Administrar usuarios"
                description="Gestiona los accesos del equipo."
                icon="usuarios"
              />

              <QuickLink
                href="/pacientes"
                label="Gestionar pacientes"
                description="Consulta y registra pacientes."
                icon="pacientes"
              />
            </div>
          </div>

          {/* Panel derecho, inspirado en tu referencia */}
          <aside className="space-y-5">
            <ServicesPanel />
          </aside>
        </div>
      )}

      {isReception && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickLink
              href="/citas"
              label="Gestionar agenda"
              description="Consulta las citas del centro."
              icon="calendar"
            />

            <QuickLink
              href="/pacientes"
              label="Registrar paciente"
              description="Accede al módulo de pacientes."
              icon="pacientes"
            />
          </div>

          <AppointmentsTable isDentist={false} />
        </div>
      )}

      {isDentist && (
        <div className="space-y-5">
          <AppointmentsTable isDentist />

          <div className="grid gap-4 sm:grid-cols-2">
            <QuickLink
              href="/citas"
              label="Mi agenda"
              description="Revisa tus próximas atenciones."
              icon="calendar"
            />

            <QuickLink
              href="/pacientes"
              label="Fichas de pacientes"
              description="Accede a la información clínica autorizada."
              icon="tooth"
            />
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        Los nombres, cifras, citas y servicios de esta vista son
        ficticios. Se reemplazarán por datos autorizados del sistema
        cuando conectemos el dashboard al backend.
      </p>
    </div>
  )
}