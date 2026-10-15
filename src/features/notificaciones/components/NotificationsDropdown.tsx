import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from '@/features/auth'
import { Icon } from '@/shared/components/ui/Icon'
import { Tooltip } from '@/shared/components/ui/Tooltip'
import { notificacionesApi, type NotificacionItem } from '../api/notificacionesApi'

function tiempoRelativo(fechaIso: string): string {
  try {
    const fecha = new Date(fechaIso)
    const ahora = new Date()
    const diffSeg = Math.floor((ahora.getTime() - fecha.getTime()) / 1000)

    if (diffSeg < 60) return 'Hace un momento'
    const diffMin = Math.floor(diffSeg / 60)
    if (diffMin < 60) return `Hace ${diffMin} min`
    const diffHoras = Math.floor(diffMin / 60)
    if (diffHoras < 24) return `Hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`
    const diffDias = Math.floor(diffHoras / 24)
    if (diffDias === 1) return 'Ayer'
    if (diffDias < 7) return `Hace ${diffDias} días`
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  } catch {
    return 'Reciente'
  }
}

export function NotificationsDropdown() {
  const { accessToken, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notificaciones, setNotificaciones] = useState<NotificacionItem[]>([])
  const [noLeidasTotal, setNoLeidasTotal] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const cargarNotificaciones = useCallback(async (mostrarLoader = false) => {
    if (!accessToken || !user) return
    if (mostrarLoader) setLoading(true)
    try {
      const data = await notificacionesApi.getMisNotificaciones(accessToken, 0, 15)
      setNotificaciones(data.notificaciones || [])
      setNoLeidasTotal(data.noLeidasTotal || 0)
    } catch {
      // Silencioso para no interrumpir navegación general
    } finally {
      if (mostrarLoader) setLoading(false)
    }
  }, [accessToken, user])

  // Cargar notificaciones al cambiar de ruta (ej. volver al Dashboard o navegar por el portal)
  useEffect(() => {
    if (!accessToken || !user) {
      setNotificaciones([])
      setNoLeidasTotal(0)
      return
    }

    cargarNotificaciones(false)
  }, [accessToken, user?.id, location.pathname, cargarNotificaciones])

  // Polling periódico cada 60s y refresco cuando el usuario vuelve a enfocar la pestaña
  useEffect(() => {
    if (!accessToken || !user) return

    const handleFocus = () => {
      cargarNotificaciones(false)
    }

    window.addEventListener('focus', handleFocus)
    const intervalId = window.setInterval(() => {
      cargarNotificaciones(false)
    }, 60000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.clearInterval(intervalId)
    }
  }, [accessToken, user, cargarNotificaciones])

  // Cerrar al hacer click afuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const toggleOpen = () => {
    setOpen(prev => {
      const nuevo = !prev
      if (nuevo) {
        cargarNotificaciones(notificaciones.length === 0)
      }
      return nuevo
    })
  }

  const handleMarcarTodas = async () => {
    if (!accessToken) return
    try {
      await notificacionesApi.marcarTodasLeidas(accessToken)
      setNoLeidasTotal(0)
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
    } catch {
      // error silenciado
    }
  }

  const handleItemClick = async (notif: NotificacionItem) => {
    if (!notif.leida && accessToken) {
      try {
        await notificacionesApi.marcarLeida(accessToken, notif.id)
        setNoLeidasTotal(prev => Math.max(0, prev - 1))
        setNotificaciones(prev =>
          prev.map(n => (n.id === notif.id ? { ...n, leida: true } : n))
        )
      } catch {
        // continuar
      }
    }
    setOpen(false)
    if (notif.enlace) {
      navigate(notif.enlace)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip content={noLeidasTotal > 0 ? `${noLeidasTotal} notificaciones nuevas` : 'Notificaciones'}>
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-label="Notificaciones"
          className="relative grid size-[42px] shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-alt text-ink-soft hover:text-ink hover:border-brand/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        >
          <Icon name="bell" size={20} />
          {noLeidasTotal > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
              {noLeidasTotal > 9 ? '9+' : noLeidasTotal}
            </span>
          )}
        </button>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-line bg-surface shadow-xl overflow-hidden"
          >
            {/* Cabecera del desplegable */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-canvas/40">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink">Notificaciones</h3>
                {noLeidasTotal > 0 && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    {noLeidasTotal} nuevas
                  </span>
                )}
              </div>

              {noLeidasTotal > 0 && (
                <button
                  type="button"
                  onClick={handleMarcarTodas}
                  className="text-xs font-semibold text-brand hover:underline cursor-pointer transition"
                >
                  Marcar todas leídas
                </button>
              )}
            </div>

            {/* Lista o contenido */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-line/60">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted gap-2">
                  <Icon name="spinner" size={20} className="animate-spin text-brand" />
                  <span className="text-xs">Cargando notificaciones…</span>
                </div>
              ) : notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-alt text-muted mb-2.5">
                    <Icon name="bell" size={22} />
                  </div>
                  <p className="text-sm font-semibold text-ink">Sin notificaciones</p>
                  <p className="text-xs text-muted mt-1 max-w-[220px]">
                    Te avisaremos cuando tengas recordatorios de citas o actualizaciones clínicas.
                  </p>
                </div>
              ) : (
                notificaciones.map(item => {
                  const esCancelacion = item.tipo === 'CANCELACION_CITA'
                  const esRecordatorio = item.tipo === 'RECORDATORIO_CITA'

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`flex items-start gap-3 p-3.5 transition cursor-pointer select-none ${
                        item.leida
                          ? 'bg-surface hover:bg-hover/60 opacity-80'
                          : 'bg-brand/5 hover:bg-brand/10'
                      }`}
                    >
                      {/* Icono temático */}
                      <div
                        className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                          esCancelacion
                            ? 'bg-danger/15 text-danger'
                            : esRecordatorio
                            ? 'bg-brand/15 text-brand'
                            : 'bg-emerald-500/15 text-emerald-600'
                        }`}
                      >
                        <Icon
                          name={esCancelacion ? 'alertCircle' : 'calendar'}
                          size={18}
                        />
                      </div>

                      {/* Texto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-xs truncate ${item.leida ? 'font-medium text-ink' : 'font-bold text-ink'}`}>
                            {item.titulo}
                          </p>
                          <span className="text-[10px] text-muted shrink-0">
                            {tiempoRelativo(item.fechaCreacion)}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
                          {item.mensaje}
                        </p>
                      </div>

                      {/* Punto indicador de no leída */}
                      {!item.leida && (
                        <div className="mt-1.5 size-2 rounded-full bg-brand shrink-0" />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Pie del desplegable */}
            <div className="border-t border-line bg-canvas/30 px-4 py-2 text-center">
              <span className="text-[11px] text-muted">
                Centro de notificaciones - NeoDent
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
