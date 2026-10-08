import { motion } from 'motion/react'
import { Icon } from './Icon'
import { validatePassword, type PasswordValidationState } from '@/shared/lib/validation'

interface PasswordRequirementsProps {
  password: string
  /** Muestra los requisitos siempre o solo cuando el usuario ha comenzado a escribir / tiene foco */
  show?: boolean
  className?: string
}

export function PasswordRequirements({
  password,
  show = true,
  className = '',
}: PasswordRequirementsProps) {
  if (!show && !password) return null

  const state: PasswordValidationState = validatePassword(password)
  const hasInput = password.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-control border border-line bg-surface/80 p-3 shadow-xs ${className}`}
      aria-live="polite"
    >
      {/* Barra de progreso / medidor de fuerza */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-ink-soft">Seguridad de la contraseña:</span>
          {hasInput ? (
            <span
              className={
                state.strength === 'very-strong'
                  ? 'text-success'
                  : state.strength === 'strong'
                    ? 'text-brand'
                    : state.strength === 'medium'
                      ? 'text-warn'
                      : 'text-danger'
              }
            >
              {state.strengthLabel} ({state.passedCount}/{state.totalCount})
            </span>
          ) : (
            <span className="text-muted">No ingresada</span>
          )}
        </div>

        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <motion.div
            className={`h-full rounded-full ${state.strengthColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${hasInput ? state.strengthPercent : 0}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Lista de requisitos */}
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs">
        {state.rules.map(rule => (
          <li
            key={rule.id}
            className={`flex items-center gap-2 transition-colors ${
              rule.passed
                ? 'font-medium text-success'
                : 'text-ink-soft'
            }`}
          >
            <span
              className={`grid size-4 shrink-0 place-items-center rounded-full text-[10px] transition-colors ${
                rule.passed
                  ? 'bg-success text-white'
                  : 'bg-alt text-muted border border-line'
              }`}
            >
              {rule.passed ? (
                <Icon name="check" size={10} strokeWidth={2.4} />
              ) : (
                <span className="size-1 rounded-full bg-muted/60" />
              )}
            </span>
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
