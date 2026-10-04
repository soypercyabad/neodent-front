import { Fragment } from 'react'
import {
  ActionsCell,
  Badge,
  RowActions,
  SeparatorRow,
  Table,
  TableState,
  useTableSort,
  type Column,
} from '@/shared/components/ui'
import type { Id } from '@/shared/lib/id'
import { isoToDMY, longDate, money } from '@/shared/lib/format'
import { canActOn, type Appointment } from '../model/appointments.types'
import { paymentTone, statusTone } from '../model/appointments.utils'

const COLUMNS: Column[] = [
  { key: 'fecha', label: 'Fecha', sortable: true },
  { key: 'hora', label: 'Hora', sortable: true },
  { key: 'pacId', label: 'Paciente', sortable: true },
  { key: 'docId', label: 'Odontólogo', sortable: true },
  { key: 'lugar', label: 'Lugar', sortable: true },
  { key: 'estado', label: 'Estado', align: 'center', sortable: true },
  { key: 'pago', label: 'Pago', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

interface AppointmentsTableProps {
  appointments: Appointment[]
  pacName: (id: Id) => string
  docName: (id: Id) => string
  onDetail: (a: Appointment) => void
  onPatient: (a: Appointment) => void
  onReschedule: (a: Appointment) => void
  onCancel: (a: Appointment) => void
}

/** Tabla de citas agrupada por día: una fila separadora por cada fecha con cabeceras ordenables. */
export function AppointmentsTable({
  appointments,
  pacName,
  docName,
  onDetail,
  onPatient,
  onReschedule,
  onCancel,
}: AppointmentsTableProps) {
  const { sortColumn, sortDirection, handleSort, sortedItems } = useTableSort(appointments, {
    initialColumn: 'fecha',
    initialDirection: 'asc',
    customComparators: {
      pacId: (a, b) => pacName(a.pacId).localeCompare(pacName(b.pacId), 'es'),
      docId: (a, b) => docName(a.docId).localeCompare(docName(b.docId), 'es'),
    },
  })

  return (
    <Table
      columns={COLUMNS}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={handleSort}
    >
      <TableState
        colSpan={COLUMNS.length}
        empty={sortedItems.length === 0}
        emptyLabel="No hay citas que coincidan con los filtros."
      />
      {sortedItems.map((a, i) => {
        const newDay = i === 0 || a.fecha !== sortedItems[i - 1].fecha
        const actionable = canActOn(a)
        return (
          <Fragment key={a.id}>
            {newDay && <SeparatorRow colSpan={COLUMNS.length}>{longDate(a.fecha)}</SeparatorRow>}
            <tr className={a.estado === 'Cancelada' ? 'opacity-55' : undefined}>
              <td>{isoToDMY(a.fecha)}</td>
              <td>{a.hora}</td>
              <td className="font-bold">{pacName(a.pacId)}</td>
              <td>{docName(a.docId)}</td>
              <td>{a.lugar}</td>
              <td className="text-center">
                <div className="flex justify-center">
                  <Badge tone={statusTone[a.estado]}>{a.estado}</Badge>
                </div>
              </td>
              <td className="text-center">
                <div className="flex flex-col items-center justify-center">
                  <Badge tone={paymentTone[a.pago]}>{a.pago}</Badge>
                  {a.precio != null && (
                    <div className="mt-1 text-[0.8rem] text-muted">{money(a.precio)}</div>
                  )}
                </div>
              </td>
              <ActionsCell align="center">
                <RowActions
                  actions={[
                    { label: 'Ver detalle de la cita', icon: 'eye', onClick: () => onDetail(a) },
                    { label: 'Ver ficha del paciente', icon: 'file', onClick: () => onPatient(a) },
                    { label: 'Reprogramar cita', icon: 'calendarEdit', onClick: () => onReschedule(a), show: actionable },
                    { label: 'Cancelar cita', icon: 'xCircle', onClick: () => onCancel(a), danger: true, dividerBefore: true, show: actionable },
                  ]}
                />
              </ActionsCell>
            </tr>
          </Fragment>
        )
      })}
    </Table>
  )
}
