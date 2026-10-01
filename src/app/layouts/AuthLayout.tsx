import { Outlet, useLocation } from 'react-router-dom'

export function AuthLayout() {
  const { pathname } = useLocation()
  const esRegistro = pathname === '/registro'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="mb-6 text-center">
        <small className="text-[0.92rem] text-ink-soft">
          Centro odontológico
        </small>

        <h1 className="mt-0.5 text-[1.9rem] font-bold text-brand">
          NeoDents
        </h1>
      </div>

      <div className={esRegistro ? 'w-full max-w-[580px]' : 'w-full max-w-[440px]'}>
        <Outlet />
      </div>

      <footer className="mt-8 text-center text-[0.88rem] text-ink-soft">
        Copyright © {new Date().getFullYear()} - NeoDents
      </footer>
    </div>
  )
}