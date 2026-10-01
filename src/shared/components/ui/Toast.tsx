import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from './Icon'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastAviso {
  tipo: ToastVariant
  texto: string
  titulo?: string
}

export interface ToastProps {
  aviso: ToastAviso | null
  onClose: () => void
  autoDismiss?: boolean
  duration?: number
}

export function Toast({
  aviso,
  onClose,
  autoDismiss = true,
  duration,
}: ToastProps) {
  useEffect(() => {
    if (!aviso || !autoDismiss) return

    const tiempo =
      duration ?? (aviso.tipo === 'error' ? 7000 : 4500)

    const timer = window.setTimeout(() => {
      onClose()
    }, tiempo)

    return () => window.clearTimeout(timer)
  }, [aviso, autoDismiss, duration, onClose])

  const iconName =
    aviso?.tipo === 'success'
      ? 'checkCircle'
      : aviso?.tipo === 'warning'
        ? 'warning'
        : aviso?.tipo === 'info'
          ? 'info'
          : 'alertCircle'

  const defaultTitulo =
    aviso?.tipo === 'success'
      ? 'Operación exitosa'
      : aviso?.tipo === 'warning'
        ? 'Advertencia'
        : aviso?.tipo === 'info'
          ? 'Información'
          : 'No se pudo completar la operación'

  const colorStyles =
    aviso?.tipo === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : aviso?.tipo === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : aviso?.tipo === 'info'
          ? 'border-sky-200 bg-sky-50 text-sky-800'
          : 'border-red-200 bg-red-50 text-red-800'

  return (
    <AnimatePresence>
      {aviso && (
        <motion.div
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, x: 20, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 20, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`fixed bottom-5 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border p-4 shadow-xl sm:bottom-6 sm:right-6 ${colorStyles}`}
        >
          <Icon name={iconName} size={21} className="mt-0.5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {aviso.titulo ?? defaultTitulo}
            </p>
            <p className="mt-1 break-words text-sm leading-relaxed">
              {aviso.texto}
            </p>
          </div>

          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 transition hover:bg-black/5"
          >
            <Icon name="x" size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
