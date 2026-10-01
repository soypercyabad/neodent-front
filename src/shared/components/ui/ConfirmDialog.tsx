import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from './Button'
import { Icon } from './Icon'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  /** Texto del botón que confirma la acción. */
  confirmLabel?: string
  /** Texto del botón que vuelve atrás sin hacer nada. */
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Diálogo modal de confirmación con animación fluida, backdrop blur y foco accesible.
 * Se cierra con Escape o al hacer clic fuera.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Regresar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-xs"
          onClick={e => {
            if (e.target === e.currentTarget) onCancel()
          }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-[28rem] rounded-2xl border border-line bg-surface px-6 py-8 text-center shadow-2xl sm:px-8"
          >
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
              <Icon name="question" size={24} strokeWidth={2.4} />
            </span>

            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>

            {description && (
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {description}
              </p>
            )}

            <div className="mt-6 flex gap-3 max-sm:flex-col-reverse">
              <Button
                ref={cancelRef}
                variant="outline"
                onClick={onCancel}
                className="flex-1 justify-center"
              >
                {cancelLabel}
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 justify-center"
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
