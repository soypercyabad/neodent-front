import { Avatar, Badge, Card, InfoRow } from '@/shared/components/ui'
import { isoToDMY } from '@/shared/lib/format'
import { useData } from '@/legacy/demo-store/useDemoData'
import type { Appointment } from '../model/appointments.types'
import { statusTone } from '../model/appointments.utils'

/** Tarjeta de sólo lectura con los datos de la cita. */
export function AppointmentSummary({ appointment: a }: { appointment: Appointment }) {
  const { pacName, docName, docEsp, patientById } = useData()
  const patient = patientById(a.pacId)

  return (
    <Card className="p-6">
      <header className="mb-6 flex items-center gap-4">
        <Avatar
          nombre={patient?.nombre ?? '?'}
          apellido={patient?.apellido ?? ''}
          //seed={avatarSeed(a.pacId)}
        />
        <div>
          <h2 className="text-[1.05rem] font-bold">{pacName(a.pacId)}</h2>
          <div className="mt-1">
            <Badge tone={statusTone[a.estado]}>{a.estado}</Badge>
          </div>
        </div>
      </header>

      <InfoRow label="Fecha" value={isoToDMY(a.fecha)} />
      <InfoRow label="Hora" value={a.hora} />
      <InfoRow label="Odontólogo" value={docName(a.docId)} />
      <InfoRow label="Especialidad" value={docEsp(a.docId) || '—'} />
      <InfoRow label="Lugar (sede)" value={a.lugar} />
      <InfoRow
        label="Estado de la cita"
        value={<Badge tone={statusTone[a.estado]}>{a.estado}</Badge>}
      />
    </Card>
  )
}
