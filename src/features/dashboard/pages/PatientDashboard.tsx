import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Badge, Button, Card, Icon } from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { dashboardApi, type PatientDashboardCita, type PatientDashboardData } from '../api/dashboardApi'

const appear = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
}

const tonoEstado = (estado: string): 'green' | 'blue' | 'red' | 'gray' => {
  if (estado === 'CONFIRMADA' || estado === 'ATENDIDA') return 'green'
  if (estado === 'PROGRAMADA' || estado === 'EN_ATENCION') return 'blue'
  if (estado === 'CANCELADA' || estado === 'NO_ASISTIO') return 'red'
  return 'gray'
}

function ActionCard({
  href,
  title,
  description,
  icon,
  featured = false,
}: {
  href: string
  title: string
  description: string
  icon: 'calendar' | 'clock' | 'user'
  featured?: boolean
}) {
  return (
    <Link
      to={href}
      className={`group flex min-h-28 items-center gap-4 rounded-2xl border p-4
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        ${
          featured
            ? 'border-brand/30 bg-brand-soft/40 hover:border-brand'
            : 'border-line bg-surface hover:border-brand/40'
        }`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-xl
          ${featured ? 'bg-brand text-white shadow-sm' : 'bg-brand-soft text-brand'}`}
      >
        <Icon name={icon} size={22} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {description}
        </span>
      </span>

      <Icon
        name="chevronRight"
        size={18}
        className="shrink-0 text-muted transition-transform group-hover:translate-x-1"
      />
    </Link>
  )
}

function NextAppointment({ cita }: { cita: PatientDashboardCita | null }) {
  if (!cita) {
    return (
      <motion.section {...appear}>
        <div className="relative overflow-hidden rounded-[24px] border border-line bg-gradient-to-r from-brand-soft/40 via-surface to-surface p-6 shadow-xs sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                <Icon name="calendar" size={13} />
                SIN CITAS PENDIENTES
              </span>
              <h2 className="mt-3 text-xl font-bold text-ink sm:text-2xl">
                ¿Listo para tu próximo control dental?
              </h2>
              <p className="mt-2 text-sm text-ink-soft">
                Mantener tu salud bucal al día es clave para una sonrisa sana y radiante.
                Selecciona una especialidad y agenda tu consulta en minutos.
              </p>
            </div>

            <Link
              to="/mis-citas/nueva"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand/90"
            >
              <Icon name="plus" size={16} />
              Agendar una cita
            </Link>
          </div>
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section {...appear}>
      <div className="relative overflow-hidden rounded-[24px] bg-[#0053db] p-6 text-white shadow-[0_12px_30px_rgba(36,111,233,0.16)] sm:p-8">
        <div className="pointer-events-none absolute -right-14 -top-20 size-64 rounded-full border-[35px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 right-32 size-48 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
              <Icon name="calendar" size={14} />
              TU PRÓXIMA CITA
            </span>

            <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold tracking-wide">
              {cita.estado.replaceAll('_', ' ')}
            </span>
          </div>

          <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            {cita.servicio}
          </h2>

          <p className="mt-1 text-sm text-white/80">
            {cita.sede} {cita.especialidad ? `· ${cita.especialidad}` : ''}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/70">Fecha</p>
              <p className="mt-1 text-sm font-bold capitalize">{cita.fecha}</p>
            </div>

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/70">Hora</p>
              <p className="mt-1 text-sm font-bold">{cita.hora}</p>
            </div>

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/70">Odontólogo</p>
              <p className="mt-1 text-sm font-bold truncate" title={cita.odontologo}>
                {cita.odontologo}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/mis-citas"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0053db] transition hover:bg-[#EDF4FF]"
            >
              Ver mis citas
              <Icon name="chevronRight" size={16} />
            </Link>

            <Link
              to="/mis-citas/nueva"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Agendar otra cita
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function AppointmentList({ citas }: { citas: PatientDashboardCita[] }) {
  return (
    <motion.section {...appear} transition={{ ...appear.transition, delay: 0.1 }}>
      <Card className="overflow-hidden p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Mis próximas atenciones</h2>
            <p className="mt-0.5 text-xs text-muted">
              Tus reservas confirmadas y pendientes
            </p>
          </div>

          <Link
            to="/mis-citas"
            className="shrink-0 text-xs font-semibold text-brand hover:underline"
          >
            Ver todas
          </Link>
        </div>

        {citas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-alt text-muted">
              <Icon name="calendar" size={20} />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">No tienes otras citas programadas</p>
            <p className="mt-1 text-xs text-muted">
              Cualquier nueva reserva que realices aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {citas.slice(0, 4).map(cita => {
              const dia = cita.fechaHoraInicio ? cita.fechaHoraInicio.slice(8, 10) : '--'
              const mesNum = cita.fechaHoraInicio ? Number(cita.fechaHoraInicio.slice(5, 7)) : 0
              const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
              const mes = meses[mesNum - 1] || '---'

              return (
                <div
                  key={cita.id}
                  className="flex flex-wrap items-center gap-3.5 rounded-xl border border-line p-3 transition-colors hover:bg-alt/40"
                >
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <span className="text-base font-bold leading-none">{dia}</span>
                    <span className="mt-0.5 text-[0.65rem] font-bold">{mes}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-ink text-sm leading-tight">{cita.servicio}</h3>
                    <p className="mt-0.5 text-xs text-muted truncate">{cita.odontologo}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                      <Icon name="clock" size={12} className="text-muted" />
                      <span>{cita.hora}</span>
                      <span className="text-muted">·</span>
                      <span className="truncate">{cita.sede}</span>
                    </p>
                  </div>

                  <Badge tone={tonoEstado(cita.estado)}>
                    {cita.estado.replaceAll('_', ' ')}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </motion.section>
  )
}

function ReminderPanel() {
  return (
    <motion.section {...appear} transition={{ ...appear.transition, delay: 0.15 }}>
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800">
            <Icon name="clock" size={18} />
          </span>

          <div>
            <h2 className="text-base font-bold text-ink">Antes de tu cita</h2>
            <p className="mt-0.5 text-xs text-muted">Recomendaciones para tu visita</p>
          </div>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-ink-soft">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800 font-bold">
              ✓
            </span>
            <p>Llega 10 minutos antes de la hora programada a la sede correspondiente.</p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800 font-bold">
              ✓
            </span>
            <p>Trae tu documento de identidad (DNI o pasaporte) para registrar tu ingreso.</p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-800 font-bold">
              ✓
            </span>
            <p>Si necesitas reprogramar o cancelar, hazlo desde «Mis citas» con anticipación.</p>
          </div>
        </div>
      </Card>
    </motion.section>
  )
}

export function PatientDashboard() {
  const { accessToken, user } = useAuth()
  const [data, setData] = useState<PatientDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    let activo = true

    const cargar = async () => {
      setLoading(true)
      setError(null)
      try {
        const resultado = await dashboardApi.getPatientData(accessToken)
        if (activo) setData(resultado)
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'Error al cargar información')
      } finally {
        if (activo) setLoading(false)
      }
    }

    void cargar()
    return () => { activo = false }
  }, [accessToken])

  const nombreUsuario = user?.nombre
    ? `${user.nombre} ${user.apellido || ''}`.trim()
    : 'Estimado paciente'

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <motion.header
        {...appear}
        className="relative isolate min-h-[190px] overflow-hidden rounded-[24px] border border-line bg-gradient-to-r from-brand-soft/60 via-alt to-surface px-5 py-6 shadow-2xs sm:min-h-[220px] sm:px-8 sm:py-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-8 -right-12 size-48 rounded-full bg-brand-soft/70 sm:-right-14 sm:-top-16 sm:bottom-auto sm:size-[350px]"
        />

        <div className="relative z-10">
          <span className="inline-flex rounded-full bg-surface px-3 py-1 text-[11px] font-bold tracking-wide text-brand shadow-2xs">
            MI ESPACIO EN NEODENTS
          </span>

          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
            ¡Hola, {nombreUsuario}!
          </h1>

          <p className="mt-1.5 max-w-[65%] text-xs leading-5 text-ink-soft sm:max-w-md sm:text-sm sm:leading-6">
            Tu sonrisa en las mejores manos. Revisa tus próximas atenciones y gestiona tus reservas de manera sencilla.
          </p>
        </div>

        <motion.img
          src="/illustrations/muelita.svg"
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.12 }}
          className="pointer-events-none absolute bottom-0 right-[-15px] z-0 w-[150px] select-none sm:bottom-[-35px] sm:right-2 sm:w-[260px] lg:bottom-[-45px] lg:right-6 lg:w-[310px]"
        />
      </motion.header>

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-line bg-surface">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Icon name="spinner" size={18} className="animate-spin text-brand" />
            <span>Cargando tus citas y atenciones…</span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          {/* Próxima cita destacada */}
          <NextAppointment cita={data?.proximaCita ?? null} />

          {/* Accesos rápidos */}
          <section>
            <h2 className="mb-3 text-base font-bold text-ink">¿Qué deseas hacer hoy?</h2>

            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              <ActionCard
                href="/mis-citas/nueva"
                title="Agendar una cita"
                description="Busca una fecha y un horario disponibles."
                icon="calendar"
                featured
              />

              <ActionCard
                href="/mis-citas"
                title="Consultar mis citas"
                description="Revisa tus atenciones programadas y tu historial."
                icon="clock"
              />

              <ActionCard
                href="/perfil"
                title="Mi perfil"
                description="Consulta y administra tus datos personales."
                icon="user"
              />
            </div>
          </section>

          {/* Contenido inferior */}
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <AppointmentList citas={data?.citasProximas ?? []} />
            <ReminderPanel />
          </div>
        </>
      )}
    </div>
  )
}