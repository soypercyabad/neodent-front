import { Avatar, Badge, Card, InfoRow } from '@/shared/components/ui'
import { isoToDMY } from '@/shared/lib/format'
import type { Appointment } from '../model/appointments.types'
import { statusTone } from '../model/appointments.utils'

export interface AppointmentSummaryProps {
  appointment: Appointment
  patientName?: string
  doctorName?: string
  doctorSpecialty?: string
}

/** Tarjeta de sólo lectura con los datos de la cita desacoplada de almacenes legacy. */
export function AppointmentSummary({
  appointment: a,
  patientName,
  doctorName,
  doctorSpecialty,
}: AppointmentSummaryProps) {
  const nombrePaciente = patientName ?? `Paciente #${a.pacId}`
  const nombreDoctor = doctorName ?? `Odontólogo #${a.docId}`
  const especialidad = doctorSpecialty ?? '-'

  return (
    <Card className="p-6">
      <header className="mb-6 flex items-center gap-4">
        <Avatar
          nombre={patientName ?? 'P'}
          apellido=""
        />
        <div>
          <h2 className="text-[1.05rem] font-bold">{nombrePaciente}</h2>
          <div className="mt-1">
            <Badge tone={statusTone[a.estado]}>{a.estado}</Badge>
          </div>
        </div>
      </header>

      <InfoRow label="Fecha" value={isoToDMY(a.fecha)} />
      <InfoRow label="Hora" value={a.hora} />
      <InfoRow label="Odontólogo" value={nombreDoctor} />
      <InfoRow label="Especialidad" value={especialidad} />
      <InfoRow label="Lugar (sede)" value={a.lugar} />
      <InfoRow
        label="Estado de la cita"
        value={<Badge tone={statusTone[a.estado]}>{a.estado}</Badge>}
      />
    </Card>
  )
}

