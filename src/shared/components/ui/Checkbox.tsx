import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Texto de la etiqueta; admite contenido enriquecido (por ejemplo, un enlace). */
  label?: ReactNode
}

/** Casilla interactiva con micro-animaciones en el checkmark y diseño consistente. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, className, disabled, checked, ...props }, ref) {
    return (
      <label
        className={cn(
          'inline-flex select-none items-start gap-2.5 text-sm text-ink transition-opacity',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
      >
        <motion.span
          whileTap={disabled ? undefined : { scale: 0.88 }}
          className="relative mt-0.5 grid size-5 flex-none place-items-center"
        >
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className={cn(
              'peer size-5 cursor-pointer appearance-none rounded-md border border-line bg-surface transition-all duration-150',
              'hover:border-brand/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-1',
              'checked:border-brand checked:bg-brand',
              disabled && 'cursor-not-allowed',
            )}
            {...props}
          />

          {/* CHECKMARK ANIMADO */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="pointer-events-none absolute size-3.5 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </motion.span>

        {label && <span className="min-w-0 flex-1 leading-snug">{label}</span>}
      </label>
    )
  },
)
