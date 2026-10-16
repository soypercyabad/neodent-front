import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { navItemsFor, type NavGroupItem } from '@/app/navigation'
import { useAuth } from '@/features/auth'
import { Icon, Tooltip } from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'

interface SidebarProps {
  onNavigate?: () => void
  collapsed?: boolean
}

/**
 * Menú flotante (Flyout Popover) que se muestra cuando la barra lateral
 * está colapsada a iconos y el usuario pasa el mouse o hace clic en un grupo padre.
 */
function CollapsedGroupFlyout({
  group,
  isGroupActive,
  onNavigate,
}: {
  group: NavGroupItem
  isGroupActive: boolean
  onNavigate?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const location = useLocation()

  const updateCoords = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const flyoutHeight = flyoutRef.current?.offsetHeight || (group.items.length * 40 + 64)
    let y = rect.top
    if (y + flyoutHeight > window.innerHeight - 16) {
      y = Math.max(16, window.innerHeight - flyoutHeight - 16)
    }
    setCoords({
      x: rect.right + 10,
      y,
    })
  }

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    updateCoords()
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 180)
  }

  const handleClick = () => {
    updateCoords()
    setIsOpen(prev => !prev)
  }

  useEffect(() => {
    if (!isOpen) return

    const handleScrollOrResize = () => updateCoords()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        flyoutRef.current &&
        !flyoutRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        className={cn(
          'flex h-11 w-full items-center justify-center rounded-xl transition-colors duration-150 cursor-pointer relative',
          isGroupActive || isOpen
            ? 'bg-brand-soft text-brand font-bold shadow-xs'
            : 'text-muted hover:bg-hover hover:text-ink font-semibold'
        )}
        aria-label={group.label}
        aria-expanded={isOpen}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          <Icon name={group.icon} size={20} />
        </span>
        {/* Pequeño punto indicador sutil de que tiene submenú */}
        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-brand/70" />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={flyoutRef}
              initial={{ opacity: 0, x: -6, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: `${coords.x}px`,
                top: `${coords.y}px`,
                zIndex: 9999,
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="min-w-[220px] max-w-[280px] rounded-2xl border border-line/80 bg-surface/95 backdrop-blur-md p-2 shadow-2xl shadow-ink/10 select-none"
            >
              {/* Cabecera del flyout */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 mb-1 border-b border-line/60">
                <div className="flex items-center gap-2 font-bold text-ink text-[0.88rem]">
                  <Icon name={group.icon} size={16} className="text-brand shrink-0" />
                  <span className="truncate">{group.label}</span>
                </div>
                <span className="text-[0.7rem] font-bold text-muted bg-surface-soft px-1.5 py-0.5 rounded-md border border-line/50">
                  {group.items.length}
                </span>
              </div>

              {/* Lista de submenús */}
              <div className="flex flex-col gap-0.5 max-h-[calc(100vh-140px)] overflow-y-auto">
                {group.items.map(subItem => {
                  const isActive =
                    location.pathname === subItem.href ||
                    location.pathname.startsWith(subItem.href + '/')

                  return (
                    <NavLink
                      key={subItem.href}
                      to={subItem.href}
                      onClick={() => {
                        setIsOpen(false)
                        onNavigate?.()
                      }}
                      className={cn(
                        'flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 transition-colors duration-150 text-[0.84rem]',
                        isActive
                          ? 'bg-brand-soft text-brand font-bold shadow-xs'
                          : 'text-muted hover:bg-hover hover:text-ink font-medium'
                      )}
                    >
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        <Icon name={subItem.icon} size={16} />
                      </span>
                      <span className="truncate">{subItem.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

export function Sidebar({ onNavigate, collapsed = false }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const items = user ? navItemsFor(user.rol, user.modulos) : []
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupId: string, currentOpen: boolean) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !currentOpen,
    }))
  }

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
        {items.map(entry => {
          if (entry.type === 'item') {
            return (
              <Tooltip
                key={entry.href}
                content={entry.label}
                disabled={!collapsed}
                side="right"
                offset={12}
                className="w-full"
              >
                <NavLink
                  to={entry.href}
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
                  aria-label={collapsed ? entry.label : undefined}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <Icon name={entry.icon} size={20} />
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
                        {entry.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </Tooltip>
            )
          }

          // Renderizado de Grupo (Acordeón desplegable)
          const group = entry as NavGroupItem
          const isGroupActive = group.items.some(
            child => location.pathname === child.href || location.pathname.startsWith(child.href + '/')
          )
          const isOpen = openGroups[group.id] ?? isGroupActive

          if (collapsed) {
            return (
              <CollapsedGroupFlyout
                key={group.id}
                group={group}
                isGroupActive={isGroupActive}
                onNavigate={onNavigate}
              />
            )
          }

          return (
            <div key={group.id} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleGroup(group.id, isOpen)}
                className={cn(
                  'flex h-11 w-full items-center justify-between rounded-xl px-3 transition-colors duration-150 cursor-pointer select-none',
                  isGroupActive
                    ? 'text-brand font-bold bg-brand/5'
                    : 'text-muted hover:bg-hover hover:text-ink font-semibold'
                )}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <Icon name={group.icon} size={20} />
                  </span>
                  <span className="overflow-hidden whitespace-nowrap text-[0.9rem] tracking-wide">
                    {group.label}
                  </span>
                </div>

                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex size-4 shrink-0 items-center justify-center text-muted"
                >
                  <Icon name="chevronDown" size={16} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden flex flex-col gap-1 ml-4 pl-3 my-0.5 border-l-2 border-line/60"
                  >
                    {group.items.map(subItem => (
                      <NavLink
                        key={subItem.href}
                        to={subItem.href}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 transition-colors duration-150',
                            isActive
                              ? 'bg-brand-soft text-brand font-bold shadow-xs'
                              : 'text-muted hover:bg-hover hover:text-ink font-medium text-[0.84rem]',
                          )
                        }
                      >
                        <span className="flex size-4 shrink-0 items-center justify-center">
                          <Icon name={subItem.icon} size={16} />
                        </span>
                        <span className="truncate text-[0.84rem] tracking-wide">
                          {subItem.label}
                        </span>
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
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