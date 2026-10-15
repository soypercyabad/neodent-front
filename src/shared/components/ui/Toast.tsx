import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from './Icon'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastAviso {
  id?: string
  tipo: ToastVariant
  texto: string
  titulo?: string
  duration?: number
}

export interface ToastItem extends ToastAviso {
  id: string
}

/* =========================================================
 * STORE REACTIVO GLOBAL DE TOASTS APILABLES
 * ========================================================= */
type Listener = () => void
let activeToasts: ToastItem[] = []
const listeners = new Set<Listener>()

function notifyListeners() {
  listeners.forEach(fn => fn())
}

let toastIdCounter = 0

export const toast = {
  show(aviso: ToastAviso): string {
    const id = aviso.id || `toast-${Date.now()}-${++toastIdCounter}`
    // Agregar al final (la más antigua arriba, la más nueva abajo apilándose)
    activeToasts = [...activeToasts, { ...aviso, id }]
    notifyListeners()
    return id
  },

  success(texto: string, titulo?: string, duration?: number): string {
    return this.show({ tipo: 'success', texto, titulo, duration })
  },

  error(texto: string, titulo?: string, duration?: number): string {
    return this.show({ tipo: 'error', texto, titulo, duration })
  },

  warning(texto: string, titulo?: string, duration?: number): string {
    return this.show({ tipo: 'warning', texto, titulo, duration })
  },

  info(texto: string, titulo?: string, duration?: number): string {
    return this.show({ tipo: 'info', texto, titulo, duration })
  },

  remove(id: string): void {
    activeToasts = activeToasts.filter(t => t.id !== id)
    notifyListeners()
  },

  clear(): void {
    activeToasts = []
    notifyListeners()
  },
}

export function useToast() {
  const show = useCallback((aviso: ToastAviso) => toast.show(aviso), [])
  const remove = useCallback((id: string) => toast.remove(id), [])
  return { toast, showToast: show, removeToast: remove }
}

/* =========================================================
 * COMPONENTE TARJETA DE TOAST INDIVIDUAL CON TEMPORIZADOR
 * ========================================================= */
interface ToastCardProps {
  item: ToastItem
  onDismiss: () => void
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  const [pausado, setPausado] = useState(false)
  const duration = item.duration ?? (item.tipo === 'error' ? 7000 : 4500)
  const dismissedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const remainingRef = useRef(duration)
  const lastStartRef = useRef(Date.now())

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    onDismissRef.current()
  }, [])

  const startFallback = useCallback((ms: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    lastStartRef.current = Date.now()
    timerRef.current = window.setTimeout(() => {
      handleDismiss()
    }, ms)
  }, [handleDismiss])

  useEffect(() => {
    startFallback(duration + 100)
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [duration, startFallback])

  const handleMouseEnter = () => {
    setPausado(true)
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const elapsed = Date.now() - lastStartRef.current
    remainingRef.current = Math.max(300, remainingRef.current - elapsed)
  }

  const handleMouseLeave = () => {
    setPausado(false)
    startFallback(remainingRef.current + 100)
  }

  const iconName =
    item.tipo === 'success'
      ? 'checkCircle'
      : item.tipo === 'warning'
      ? 'warning'
      : item.tipo === 'info'
      ? 'info'
      : 'alertCircle'

  const defaultTitulo =
    item.tipo === 'success'
      ? 'Operación exitosa'
      : item.tipo === 'warning'
      ? 'Advertencia'
      : item.tipo === 'info'
      ? 'Información'
      : 'No se pudo completar la operación'

  const colorStyles =
    item.tipo === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : item.tipo === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : item.tipo === 'info'
      ? 'border-sky-200 bg-sky-50 text-sky-800'
      : 'border-red-200 bg-red-50 text-red-800'

  const progressBarColor =
    item.tipo === 'success'
      ? 'bg-emerald-500'
      : item.tipo === 'warning'
      ? 'bg-amber-500'
      : item.tipo === 'info'
      ? 'bg-sky-500'
      : 'bg-red-400'

  return (
    <motion.div
      layout
      role={item.tipo === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: 20, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 20, y: 10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative overflow-hidden flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-xl ${colorStyles}`}
    >
      <Icon name={iconName} size={21} className="mt-0.5 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {item.titulo ?? defaultTitulo}
        </p>
        <p className="mt-1 break-words text-sm leading-relaxed">
          {item.texto}
        </p>
      </div>

      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 transition hover:bg-black/5"
      >
        <Icon name="x" size={16} />
      </button>

      {/* Barra de progreso del temporizador */}
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl bg-black/5">
        <div
          className={`h-full origin-left ${progressBarColor}`}
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
            animationPlayState: pausado ? 'paused' : 'running',
          }}
          onAnimationEnd={handleDismiss}
        />
      </div>
    </motion.div>
  )
}

/* =========================================================
 * CONTENEDOR GLOBAL DE TOASTS APILABLES
 * ========================================================= */
export function ToastContainer() {
  const items = useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => activeToasts,
    () => []
  )

  if (items.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <ToastCard
            key={item.id}
            item={item}
            onDismiss={() => toast.remove(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

/* =========================================================
 * COMPONENTE TOAST (COMPATIBILIDAD 100% RETROACTIVA)
 * Cuando una página llama a <Toast aviso={aviso} onClose={...} />,
 * automáticamente se integra al sistema apilable global.
 * ========================================================= */
export interface ToastProps {
  aviso: ToastAviso | null
  onClose?: () => void
  autoDismiss?: boolean
  duration?: number
}

export function Toast({ aviso, onClose, duration }: ToastProps) {
  const lastAvisoRef = useRef<ToastAviso | null>(null)

  useEffect(() => {
    if (aviso && aviso !== lastAvisoRef.current) {
      lastAvisoRef.current = aviso
      toast.show({
        tipo: aviso.tipo,
        texto: aviso.texto,
        titulo: aviso.titulo,
        duration: duration,
      })
      if (onClose) {
        onClose()
      }
    }
  }, [aviso, duration, onClose])

  return null
}
