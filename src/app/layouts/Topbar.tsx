import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '@/features/auth'
import { Avatar, IconButton, Tooltip } from '@/shared/components/ui'
import { NotificationsDropdown } from '@/features/notificaciones/components/NotificationsDropdown'

interface TopbarProps {
  onMenuClick: () => void
  desktopCollapsed?: boolean
  onToggleDesktop?: () => void
  hasModulos?: boolean
}

function obtenerNombreCorto(nombre: string, apellido: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0] ?? ''
  const primerApellido = apellido.trim().split(/\s+/)[0] ?? ''

  return [primerNombre, primerApellido].filter(Boolean).join(' ')
}

export function Topbar({
  onMenuClick,
  desktopCollapsed = false,
  onToggleDesktop,
  hasModulos = true,
}: TopbarProps) {
  const { user: me } = useAuth()

  const nombreCorto = me ? obtenerNombreCorto(me.nombre, me.apellido) : ''

  return (
    <header className="flex h-topbar flex-none items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6 print:hidden">
      {/* Botón hamburguesa y logotipo */}
      <div className="flex items-center gap-3">
        {/* Móvil: abre drawer lateral */}
        <div className="md:hidden">
          <IconButton
            icon="menu"
            size={42}
            iconSize={22}
            aria-label="Abrir menú de navegación"
            onClick={onMenuClick}
          />
        </div>

        {/* Escritorio: alternar colapso compacto */}
        {hasModulos && (
          <div className="hidden md:block">
            <IconButton
              icon="menu"
              size={42}
              iconSize={22}
              aria-label={desktopCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
              title={desktopCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
              onClick={onToggleDesktop}
            />
          </div>
        )}

        {/* Móvil: logotipo siempre visible */}
        <div className="md:hidden">
          <Link to="/" className="text-lg font-bold text-brand">
            NeoDents
          </Link>
        </div>

        {/* Escritorio: logotipo con animación suave al colapsar */}
        <div className="hidden md:block">
          <AnimatePresence initial={false}>
            {desktopCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Link to="/" className="text-lg font-bold text-brand">
                  NeoDents
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Notificaciones y perfil */}
      <div className="flex min-w-0 items-center gap-3 md:gap-4">
        <NotificationsDropdown />

        {me && (
          <Tooltip content="Ver mi perfil">
            <Link
              to="/perfil"
              className="flex min-w-0 items-center gap-2.5 rounded-full p-1 transition hover:bg-hover"
            >
              <Avatar nombre={me.nombre} apellido={me.apellido} size={36} />

              <div className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span className="truncate text-sm font-semibold text-ink">{nombreCorto}</span>
                <span className="truncate text-xs text-muted">{me.rol}</span>
              </div>
            </Link>
          </Tooltip>
        )}
      </div>
    </header>
  )
}