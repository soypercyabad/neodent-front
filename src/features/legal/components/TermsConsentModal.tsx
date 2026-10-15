import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button, Checkbox, Icon } from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { legalApi, sanitizarNombreSlug, type TerminoPendienteItem } from '../api/legalApi'

export function TermsConsentModal() {
  const { accessToken, user } = useAuth()

  const [pendientes, setPendientes] = useState<TerminoPendienteItem[]>([])
  const [aceptados, setAceptados] = useState<Record<number, boolean>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPatient =
    user?.rol === 'Paciente' ||
    Boolean(user?.rolesRaw?.includes('PACIENTE')) ||
    user?.pacId != null

  useEffect(() => {
    if (!accessToken || !isPatient) return

    let activo = true

    legalApi.verificarPendiente(accessToken)
      .then(res => {
        if (!activo) return
        if (res.tienePendiente && Array.isArray(res.terminos) && res.terminos.length > 0) {
          setPendientes(res.terminos)
          setAceptados({})
        } else {
          setPendientes([])
        }
      })
      .catch(() => {
        // En caso de fallo de red, no bloquear de forma destructiva
      })

    return () => {
      activo = false
    }
  }, [accessToken, isPatient])

  const todosAceptados =
    pendientes.length > 0 && pendientes.every(doc => Boolean(aceptados[doc.id]))

  const handleConfirmarAceptacion = async () => {
    if (!accessToken || pendientes.length === 0 || !todosAceptados || guardando) return

    try {
      setGuardando(true)
      setError(null)
      await Promise.all(
        pendientes.map(doc => legalApi.aceptarTerminos(accessToken, doc.id))
      )
      // Cerrar y no volver a mostrar
      setPendientes([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar la aceptación legal.')
    } finally {
      setGuardando(false)
    }
  }

  if (!isPatient || pendientes.length === 0) {
    return null
  }

  const nombreUsuario = user?.nombre?.trim()
  const saludoUsuario = nombreUsuario ? `Querido(a) ${nombreUsuario.toUpperCase()},` : 'Estimado(a) paciente,'

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-lg overflow-hidden rounded-3xl bg-surface border border-line shadow-2xl p-7 sm:p-9 space-y-6 text-ink"
          onClick={e => e.stopPropagation()}
        >
          {/* TÍTULO PRINCIPAL CENTRADO */}
          <h2
            id="terms-modal-title"
            className="text-xl sm:text-2xl font-extrabold text-ink text-center tracking-tight leading-snug"
          >
            Términos y condiciones de atención en NeoDent
          </h2>

          {/* SALUDO Y ENCABEZADO */}
          <div className="space-y-1">
            <p className="font-bold text-ink text-sm sm:text-base">
              {saludoUsuario}
            </p>
            <p className="font-semibold text-ink-soft text-sm sm:text-base">
              Para continuar primero debes aceptar:
            </p>
          </div>

          {/* LISTA DINÁMICA DE DOCUMENTOS PENDIENTES */}
          <div className="space-y-3 pt-1">
            {pendientes.map(doc => {
              const filename = doc.nombreArchivo || sanitizarNombreSlug(doc.titulo)
              const template = doc.texto || 'Acepto los {0} de NeoDent.'
              const linkText = doc.linkTexto || doc.titulo || 'Términos y condiciones'
              const partes = template.includes('{0}')
                ? template.split('{0}')
                : ['Acepto los ', ' de NeoDent.']

              return (
                <label key={doc.id} className="flex items-start gap-3 cursor-pointer select-text">
                  <div className="pt-0.5 shrink-0">
                    <Checkbox
                      checked={Boolean(aceptados[doc.id])}
                      onChange={e =>
                        setAceptados(prev => ({ ...prev, [doc.id]: e.target.checked }))
                      }
                      disabled={guardando}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-ink leading-snug">
                    {partes[0]}
                    <a
                      href={`/terminos/${encodeURIComponent(filename)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-brand underline decoration-brand/60 hover:decoration-brand inline"
                      title={`Abrir ${filename}`}
                    >
                      {linkText}
                    </a>
                    {partes[1] || ''}
                  </span>
                </label>
              )
            })}
          </div>

          {/* PÁRRAFO DESCRIPTIVO DINÁMICO */}
          <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
            Al dar clic en el botón confirmas haber leído y aceptado{' '}
            {pendientes.map((doc, idx) => {
              const linkText = doc.linkTexto || doc.titulo || 'documento'
              const textoAgr = doc.textoAgrupado
                ? doc.textoAgrupado.replace('{0}', linkText)
                : `los ${linkText}`
              const prefijo = idx === 0 ? '' : idx === pendientes.length - 1 ? ' y ' : ', '
              return `${prefijo}${textoAgr}`
            })}
            , asumiendo la responsabilidad de descargarlos y revisarlos.
          </p>

          {/* MENSAJE DE ERROR SI OCURRE */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
              <Icon name="alertCircle" size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* BOTÓN DE ACCIÓN CENTRADO */}
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="primary"
              disabled={!todosAceptados || guardando}
              onClick={handleConfirmarAceptacion}
              className="w-full sm:w-64 py-3 rounded-xl font-bold text-sm shadow-md justify-center"
            >
              {guardando ? 'Guardando aceptación…' : 'Aceptar'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
