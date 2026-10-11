import { AnimatePresence, motion } from 'motion/react'
import { NavLink, useNavigate } from 'react-router-dom'
import { navItemsFor } from '@/app/navigation'
import { useAuth } from '@/features/auth'
import { Icon, Tooltip } from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'

interface SidebarProps {
  onNavigate?: () => void
  collapsed?: boolean
}

export function Sidebar({ onNavigate, collapsed = false }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const items = user ? navItemsFor(user.rol, user.modulos) : []

  const handleLogout = async () => {
    onNavigate?.()

    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-surface py-5 px-3 select-none">
      {/* Cabecera / Marca */}
      <div className="mb-6 flex h-12 w-full items-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.16 }}
              className="flex w-full justify-center"
            >
              <Tooltip content="NeoDents - Centro Odontológico" side="right" offset={12}>
                <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand font-bold text-sm shadow-xs select-none">
                  ND
                </div>
              </Tooltip>
            </motion.div>
          ) : (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.16 }}
              className="w-full text-center"
            >
              <small className="block text-[0.78rem] text-muted leading-tight">Centro odontológico</small>
              <h1 className="text-2xl font-bold text-brand leading-none tracking-tight">NeoDents</h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-0.5" aria-label="Navegación principal">
        {items.map(item => (
          <Tooltip
            key={item.href}
            content={item.label}
            disabled={!collapsed}
            side="right"
            offset={12}
            className="w-full"
          >
            <NavLink
              to={item.href}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex h-11 w-full items-center rounded-xl transition-colors duration-150',
                  collapsed ? 'justify-center px-0' : 'px-3 gap-3',
                  isActive
                    ? 'bg-brand-soft text-brand font-bold'
                    : 'text-muted hover:bg-hover hover:text-ink font-semibold',
                )
              }
              aria-label={collapsed ? item.label : undefined}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                <Icon name={item.icon} size={20} />
              </span>

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden whitespace-nowrap text-[0.9rem] tracking-wide"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      {/* Cerrar sesión */}
      <div className="mt-auto pt-3 border-t border-line/60">
        <Tooltip content="Cerrar sesión" disabled={!collapsed} side="right" offset={12} className="w-full">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={cn(
              'flex h-11 w-full items-center rounded-xl text-muted hover:bg-hover hover:text-ink transition-colors cursor-pointer',
              collapsed ? 'justify-center px-0' : 'px-3 gap-3 font-bold text-[0.85rem] tracking-wider',
            )}
            aria-label="Cerrar sesión"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              <Icon name="logout" size={20} />
            </span>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  CERRAR SESIÓN
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}