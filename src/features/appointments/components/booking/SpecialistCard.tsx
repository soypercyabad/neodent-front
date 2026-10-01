import { Avatar } from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { isoToDMY } from '@/shared/lib/format'
import type { User } from '@/domain/identity'

interface SpecialistCardProps {
  doctor: User
  /** Primera fecha con cupo, en ISO; `null` si todavía no tiene agenda. */
  proximaCita: string | null
  selected: boolean
  onSelect: () => void
}

/** Opción de especialista: foto, nombre, especialidad y su próxima cita libre. */
export function SpecialistCard({ doctor, proximaCita, selected, onSelect }: SpecialistCardProps) {
  const sinAgenda = proximaCita === null

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={sinAgenda}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-4 rounded-card border px-4 py-4 text-left transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        sinAgenda ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        selected ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:bg-hover',
      )}
    >
      <Avatar
        nombre={doctor.nombre}
        apellido={doctor.apellido}
        //seed={avatarSeed(doctor.id)}
        size={56}
      />

      <span className="min-w-0">
        <span className="block font-bold text-ink">
          Dr. {doctor.nombre} {doctor.apellido}
        </span>
        <span className="block text-[0.85rem] text-muted">{doctor.esp}</span>
        <span
          className={cn(
            'mt-1.5 inline-block rounded-full px-3 py-1 text-[0.8rem]',
            sinAgenda ? 'bg-neutral-badge-soft text-neutral-badge' : 'bg-brand-soft text-brand',
          )}
        >
          {sinAgenda ? 'Sin horario disponible' : `Cita disponible ${isoToDMY(proximaCita)}`}
        </span>
      </span>
    </button>
  )
}
