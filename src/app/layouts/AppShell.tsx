import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { IconButton } from '@/shared/components/ui'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Cerrar el menú al cambiar de ruta.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Cerrar con ESC y bloquear el desplazamiento del fondo.
  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">

      {/* Sidebar de escritorio */}
      <div className="hidden w-sidebar flex-none border-r border-line md:block print:hidden">
        <Sidebar />
      </div>

      {/* Sidebar móvil */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden print:hidden">

          {/* Fondo oscuro */}
          <button
            type="button"
            className="absolute inset-0 bg-ink/45"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />

          {/* Panel desplegable */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute inset-y-0 left-0 w-[min(85vw,290px)] border-r border-line bg-surface shadow-menu"
          >
            <Sidebar onNavigate={() => setMenuOpen(false)} />

            <IconButton
              icon="x"
              size={34}
              aria-label="Cerrar menú"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3"
            />
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-7 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}