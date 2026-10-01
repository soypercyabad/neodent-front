import { NavLink, useNavigate } from 'react-router-dom'
import { navItemsFor } from '@/app/navigation'
import { useAuth } from '@/features/auth'
import { Icon } from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'

interface SidebarProps {
  onNavigate?: () => void
}

const itemBase =
  'flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[0.9rem] font-bold tracking-wide transition'

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const items = user ? navItemsFor(user.rol) : []

  const handleLogout = async () => {
    onNavigate?.()

    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <aside className="flex h-full w-full flex-col gap-1 overflow-y-auto bg-surface px-3.5 py-6">
      <div className="mb-7 text-center">
        <small className="text-[0.78rem] text-muted">Centro odontológico</small>
        <h1 className="mt-0.5 text-2xl font-bold text-brand">NeoDents</h1>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Navegación principal">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                itemBase,
                isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-hover hover:text-ink',
              )
            }
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className={cn(
          itemBase,
          'mt-auto cursor-pointer text-muted hover:bg-hover hover:text-ink',
        )}
      >
        <Icon name="logout" size={20} />
        CERRAR SESIÓN
      </button>
    </aside>
  )
}