import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { IconButton } from '@/shared/components/ui'
import { useAuth } from '@/features/auth'

export function AppShell() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const hasModulos = Boolean(user?.modulos && user.modulos.length > 0)
  const isProfileRoute = location.pathname.startsWith('/perfil')
  const shouldBlock = !hasModulos && !isProfileRoute

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

      {/* Sidebar de escritorio (solo si tiene módulos asignados) */}
      {hasModulos && (
        <div className="hidden w-sidebar flex-none border-r border-line md:block print:hidden">
          <Sidebar />
        </div>
      )}

      {/* Sidebar móvil (solo si tiene módulos asignados) */}
      {hasModulos && menuOpen && (
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
        <Topbar onMenuClick={() => { if (hasModulos) setMenuOpen(true) }} />

        <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-7 print:overflow-visible print:p-0">
          {shouldBlock ? (
            <section className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-6xl items-center justify-center py-8 px-4">
              <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-14">

                {/* Mensaje */}
                <div className="order-2 text-center lg:order-1 lg:text-left">
                  <h1 className="text-2xl font-bold text-ink sm:text-3xl">
                    Aún no tienes permisos asignados
                  </h1>

                  <p className="mx-auto mt-4 max-w-md text-[0.95rem] leading-7 text-ink-soft lg:mx-0">
                    Tu cuenta ha sido creada con éxito, pero un administrador debe asignarte un rol o permisos específicos antes de que puedas explorar la plataforma.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <a
                      href="mailto:neodents.notificaciones@gmail.com?subject=Solicitud%20de%20asignaci%C3%B3n%20de%20permisos"
                      className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand shadow-2xs"
                    >
                      Contactar Soporte
                    </a>

                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-control border border-line bg-surface px-6 py-3 text-sm font-bold text-ink-soft transition hover:bg-hover hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>

                {/* Ilustración SVG */}
                <div className="order-1 flex items-center justify-center lg:order-2">
                  <img
                    src="/illustrations/403.svg"
                    alt="Aún no tienes permisos asignados"
                    aria-hidden="true"
                    className="h-auto w-full max-w-[440px] object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

              </div>
            </section>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}