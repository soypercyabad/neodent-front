import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Icon } from '@/shared/components/ui'

interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  required?: boolean
  loading?: boolean
  onConfirm: (motivo: string) => void
  onCancel: () => void
}

export function AppointmentReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  required = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setMotivo('')
      setError('')
    }
  }, [open])

  const confirmar = () => {
    if (required && !motivo.trim()) {
      setError('Ingresa el motivo.')
      return
    }

    onConfirm(motivo.trim())
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4 backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => {
            if (e.target === e.currentTarget && !loading) onCancel()
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-warn-soft text-warn">
                <Icon name="warning" size={21} />
              </span>

              <div>
                <h2 id={titleId} className="text-lg font-bold text-ink">
                  {title}
                </h2>

                {description && (
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-ink">
                Motivo {required && <span className="text-danger">*</span>}
              </label>

              <textarea
                value={motivo}
                maxLength={255}
                disabled={loading}
                onChange={e => {
                  setMotivo(e.target.value)
                  setError('')
                }}
                placeholder="Describe brevemente el motivo…"
                className="min-h-28 w-full resize-y rounded-control border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
              />

              <div className="mt-1 flex justify-between gap-3">
                {error
                  ? <p className="text-xs text-danger">{error}</p>
                  : <span />}

                <span className="text-xs text-muted">
                  {motivo.length}/255
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                Volver
              </Button>

              <Button variant="danger" onClick={confirmar} disabled={loading}>
                {loading ? 'Procesando…' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}