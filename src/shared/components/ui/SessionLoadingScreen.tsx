import { motion } from 'motion/react'

interface SessionLoadingScreenProps {
  message?: string
  submessage?: string
}

export function SessionLoadingScreen({
  message = 'Cargando sesión…',
  submessage = 'Accediendo a tu espacio clínico en NeoDents',
}: SessionLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-canvas p-4 text-ink select-none"
    >
      {/* Luces de fondo ambientales */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-sky-400/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center max-w-sm"
      >
        {/* Isotipo animado de NeoDents con resplandor */}
        <div className="relative mb-6">
          {/* Anillo de pulso exterior */}
          <div className="absolute -inset-2 rounded-3xl bg-brand/20 blur-md animate-pulse" />
          
          {/* Anillo giratorio de gradiente fino */}
          <div className="absolute -inset-1.5 rounded-2xl border-2 border-transparent border-t-brand border-r-sky-400 animate-spin" />

          {/* Caja del logo */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex size-18 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand to-sky-500 text-white shadow-xl shadow-brand/25"
          >
            {/* Ícono estilizado dental / clínica */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-9 drop-shadow-sm"
            >
              {/* Diente estilizado */}
              <path d="M12 2C8.5 2 6 4 6 7c0 2.5 1 5 1.5 8 .5 3 2 5.5 3.5 5.5s1.5-2.5 1-4.5c-.3-1.2.2-2 1-2s1.3.8 1 2c-.5 2 0 4.5 1 4.5s3-2.5 3.5-5.5c.5-3 1.5-5.5 1.5-8 0-3-2.5-5-6-5Z" />
            </svg>
          </motion.div>
        </div>

        {/* Marca y títulos */}
        <div className="space-y-1 mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink font-heading">
            Neo<span className="text-brand">Dents</span>
          </h1>
          <p className="text-[11px] font-semibold tracking-wider uppercase text-muted">
            Centro Odontológico
          </p>
        </div>

        {/* Barra de progreso indeterminada elegante */}
        <div className="relative h-1 w-44 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/60 mb-3.5">
          <motion.div
            className="absolute h-full rounded-full bg-gradient-to-r from-brand via-sky-400 to-brand"
            animate={{
              left: ['-45%', '100%'],
              width: ['45%', '55%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* Texto de estado con animación suave */}
        <p className="text-xs font-semibold text-ink-soft animate-pulse">
          {message}
        </p>
        {submessage && (
          <p className="mt-1 text-[11px] text-muted max-w-[260px]">
            {submessage}
          </p>
        )}
      </motion.div>
    </div>
  )
}
