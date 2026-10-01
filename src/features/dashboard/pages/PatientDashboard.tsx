import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Card, Icon } from '@/shared/components/ui'

const appear = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
}

const citasDemo = [
  {
    id: 1,
    dia: '25',
    mes: 'SEP',
    servicio: 'Limpieza dental',
    odontologo: 'Dra. Andrea Sotil',
    fecha: 'Viernes, 25 de septiembre',
    hora: '09:30 a. m.',
    estado: 'Confirmada',
  },
  {
    id: 2,
    dia: '02',
    mes: 'OCT',
    servicio: 'Evaluación odontológica',
    odontologo: 'Dra. Leyni Luzon',
    fecha: 'Viernes, 2 de octubre',
    hora: '11:00 a. m.',
    estado: 'Programada',
  },
]

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
            ? 'border-[#C8DDFF] bg-[#EDF4FF] hover:border-brand'
            : 'border-line bg-surface hover:border-[#C8DDFF]'
        }`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-xl
          ${featured ? 'bg-brand text-white' : 'bg-brand-soft text-brand'}`}
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

function NextAppointment() {
  const cita = citasDemo[0]

  return (
    <motion.section {...appear}>
      <div className="relative overflow-hidden rounded-[24px] bg-[#0053db] p-6 text-white shadow-[0_12px_30px_rgba(36,111,233,0.16)] sm:p-8">
        {/* Decoración visual */}
        <div className="pointer-events-none absolute -right-14 -top-20 size-64 rounded-full border-[35px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 right-32 size-48 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
              <Icon name="calendar" size={14} />
              TU PRÓXIMA CITA
            </span>

            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
              {cita.estado}
            </span>
          </div>

          <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
            {cita.servicio}
          </h2>

          <p className="mt-2 text-sm text-white/80">
            Tu próxima atención en NeoDents
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/70">Fecha</p>
              <p className="mt-1 text-sm font-bold">{cita.fecha}</p>
            </div>

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/70">Hora</p>
              <p className="mt-1 text-sm font-bold">{cita.hora}</p>
            </div>

            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/70">Odontólogo</p>
              <p className="mt-1 text-sm font-bold">{cita.odontologo}</p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/mis-citas"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#246FE9] transition hover:bg-[#EDF4FF]"
            >
              Ver mis citas
              <Icon name="chevronRight" size={16} />
            </Link>

            <Link
              to="/mis-citas/nueva"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Agendar otra cita
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function AppointmentList() {
  return (
    <motion.section {...appear} transition={{ ...appear.transition, delay: 0.1 }}>
      <Card className="overflow-hidden p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Mis próximas citas</h2>
            <p className="mt-1 text-xs text-muted">
              Tus atenciones programadas
            </p>
          </div>

          <Link
            to="/mis-citas"
            className="shrink-0 text-sm font-semibold text-brand hover:underline"
          >
            Ver todas
          </Link>
        </div>

        <div className="space-y-3">
          {citasDemo.map(cita => (
            <div
              key={cita.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-line p-3.5 transition-colors hover:bg-[#F8FAFF]"
            >
              <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-soft text-brand">
                <span className="text-xl font-bold leading-none">
                  {cita.dia}
                </span>
                <span className="mt-1 text-[0.7rem] font-bold">
                  {cita.mes}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-ink">{cita.servicio}</h3>

                <p className="mt-1 text-xs text-muted">
                  {cita.odontologo}
                </p>

                <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                  <Icon name="clock" size={13} />
                  {cita.hora}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  cita.estado === 'Confirmada'
                    ? 'bg-[#E5F7EF] text-[#168456]'
                    : 'bg-[#FFF3E5] text-[#AB741F]'
                }`}
              >
                {cita.estado}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </motion.section>
  )
}

function ReminderPanel() {
  return (
    <motion.section {...appear} transition={{ ...appear.transition, delay: 0.15 }}>
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#FFF3E5] text-[#C1842B]">
            <Icon name="clock" size={21} />
          </span>

          <div>
            <h2 className="font-bold text-ink">Antes de tu cita</h2>
            <p className="mt-1 text-xs text-muted">
              Recomendaciones generales
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#E5F7EF] text-[#168456]">
              <Icon name="check" size={13} />
            </span>
            <p className="text-sm leading-6 text-ink-soft">
              Revisa la fecha, hora y ubicación de tu atención.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#E5F7EF] text-[#168456]">
              <Icon name="check" size={13} />
            </span>
            <p className="text-sm leading-6 text-ink-soft">
              Llega con unos minutos de anticipación.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#E5F7EF] text-[#168456]">
              <Icon name="check" size={13} />
            </span>
            <p className="text-sm leading-6 text-ink-soft">
              Si necesitas cambiar tu cita, consulta las opciones disponibles en «Mis citas».
            </p>
          </div>
        </div>
      </Card>
    </motion.section>
  )
}

export function PatientDashboard() {
  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <motion.header
        {...appear}
        className="relative isolate min-h-[205px] overflow-hidden rounded-[24px] border border-[#C9DFFF] bg-gradient-to-r from-[#EAF3FF] via-[#F3F8FF] to-[#EAF4FF] px-5 py-6 shadow-[0_8px_28px_rgba(40,120,240,0.06)] sm:min-h-[235px] sm:px-9 sm:py-9"
      >
        {/* Fondo decorativo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-8 -right-12 size-48 rounded-full bg-[#B9E5FF]/75 sm:-right-14 sm:-top-16 sm:bottom-auto sm:size-[350px] lg:-right-8 lg:-top-20 lg:size-[410px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-16 top-5 hidden size-40 rounded-full bg-white/35 blur-2xl sm:block"
        />

        {/* Texto */}
        <div className="relative z-10">
          <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-[10px] font-bold tracking-wide text-brand shadow-sm sm:text-[11px]">
            MI ESPACIO EN NEODENTS
          </span>

          <h1 className="mt-4 text-[22px] font-bold leading-tight tracking-tight text-ink sm:text-3xl">
            ¡Bienvenido a tu espacio!
          </h1>

          <p className="mt-2 max-w-[58%] text-xs leading-5 text-ink-soft sm:max-w-md sm:text-sm sm:leading-6">
            Tu sonrisa empieza aquí. Consulta tus próximas atenciones y
            gestiona tus citas de manera sencilla.
          </p>

          <span className="mt-4 inline-flex rounded-full border border-[#F1D79C] bg-[#FFF7E5] px-3 py-1 text-[10px] font-bold text-[#9A6B1C] sm:text-[11px]">
            VISTA DEMO
          </span>
        </div>

        {/* Muelita: a la derecha en móvil y escritorio */}
        <motion.img
          src="/illustrations/muelita.svg"
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.55,
            ease: 'easeOut',
            delay: 0.12,
          }}
          className="pointer-events-none absolute bottom-0 right-[-18px] z-0 w-[170px] select-none drop-shadow-[0_12px_15px_rgba(22,90,160,0.16)] sm:bottom-[-46px] sm:right-1 sm:w-[290px] lg:bottom-[-58px] lg:right-8 lg:w-[345px]"
        />
      </motion.header>

      {/* Próxima cita destacada */}
      <NextAppointment />

      {/* Accesos rápidos */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-ink">¿Qué deseas hacer?</h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            description="Revisa tus próximas atenciones y tus reservas."
            icon="clock"
          />

          <ActionCard
            href="/perfil"
            title="Mi perfil"
            description="Consulta y administra la información de tu cuenta."
            icon="user"
          />
        </div>
      </section>

      {/* Contenido inferior */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AppointmentList />
        <ReminderPanel />
      </div>

      <p className="text-xs text-muted">
        Vista de demostración: los nombres, fechas y citas mostrados son
        ficticios. Se sustituirán por la información real de tu cuenta.
      </p>
    </div>
  )
}