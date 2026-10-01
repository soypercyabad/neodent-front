import type { ReactNode } from 'react'
import { Badge, Icon, KebabMenu } from '@/shared/components/ui'
import { longDateNoYear, time12h } from '@/shared/lib/format'
import { canActOn, type Appointment } from '../model/appointments.types'
import { statusTone } from '../model/appointments.utils'

/** Columna de la tarjeta: rótulo gris encima del dato. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.82rem] text-muted">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

interface MyAppointmentCardProps {
  appointment: Appointment
  /** Nombre del odontólogo que atiende. */
  doctor: string
  /** Especialidad del odontólogo. */
  especialidad: string
  onReschedule: () => void
  onCancel: () => void
}

export function MyAppointmentCard({
  appointment: a,
  doctor,
  especialidad,
  onReschedule,
  onCancel,
}: MyAppointmentCardProps) {
  const actionable = canActOn(a)

  return (
    <article className="flex items-center gap-4 rounded-card border border-line border-l-4 border-l-brand bg-surface px-6 py-5 shadow-card max-md:flex-wrap">
      <div className="grid flex-1 grid-cols-[1.2fr_1.2fr_1fr_auto] items-center gap-5 max-md:grid-cols-2">
        <Cell label="Especialista">
          <div className="font-bold text-ink">Dr. {doctor}</div>
          {especialidad && <div className="text-[0.82rem] text-muted">{especialidad}</div>}
        </Cell>

        <Cell label="Fecha">
          <span className="inline-flex items-center gap-2 text-ink">
            <Icon name="clock" size={17} className="text-ink-soft" />
            {longDateNoYear(a.fecha)}
            <span className="text-muted">•</span>
            {time12h(a.hora)}
          </span>
        </Cell>

        <Cell label="Lugar">
          <span className="text-ink">{a.lugar}</span>
        </Cell>

        <div className="justify-self-end">
          <Badge tone={statusTone[a.estado]}>
            <span className="mr-1.5 text-[1.1em] leading-none">•</span>
            {a.estado}
          </Badge>
        </div>
      </div>

      <KebabMenu
        actions={[
          { label: 'Reprogramar', icon: 'calendarEdit', onClick: onReschedule, show: actionable },
          { label: 'Cancelar cita', icon: 'xCircle', onClick: onCancel, danger: true, show: actionable },
        ]}
      />
    </article>
  )
}
