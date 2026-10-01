import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { Avatar, Icon, IconButton } from '@/shared/components/ui'

interface TopbarProps {
  onMenuClick: () => void
}

function obtenerNombreCorto(
  nombre: string,
  apellido: string,
): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] ?? ''
  const primerApellido = apellido.trim().split(/\s+/)[0] ?? ''

  return [primerNombre, primerApellido].filter(Boolean).join(' ')
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user: me } = useAuth()

  const nombreCorto = me
    ? obtenerNombreCorto(me.nombre, me.apellido)
    : ''

  return (
    <header className="flex h-topbar flex-none items-center justify-between gap-3 border-b border-line bg-surface px-4 md:justify-end md:px-6 print:hidden">
      {/* Navegación móvil */}
      <div className="flex items-center gap-3 md:hidden">
        <IconButton
          icon="menu"
          size={42}
          iconSize={22}
          aria-label="Abrir menú de navegación"
          onClick={onMenuClick}
        />

        <Link to="/" className="text-lg font-bold text-brand">NeoDents</Link>
      </div>

      {/* Notificaciones y perfil */}
      <div className="flex min-w-0 items-center gap-3 md:gap-4">
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative grid size-[42px] shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-alt text-ink-soft hover:text-ink"
        >
          <Icon name="bell" size={20} />

          <span className="absolute top-2 right-2.5 size-[7px] rounded-full bg-danger" />
        </button>

        {me && (
          <Link
            to="/perfil"
            className="flex min-w-0 items-center gap-2.5 rounded-full p-1 transition hover:bg-hover"
            title="Ver mi perfil"
          >
            <Avatar
              nombre={me.nombre}
              apellido={me.apellido}
              //seed={avatarSeed(me.id)}
              size={45}
              animate="always"
            />

            <div className="hidden min-w-0 max-w-44 pr-2 md:block">
              <div className="truncate text-[0.9rem] leading-tight font-bold text-ink">
                {nombreCorto}
              </div>

              <div className="truncate text-[0.78rem] text-muted">
                {me.rol}
              </div>
            </div>
          </Link>
        )}
      </div>
    </header>
  )
}