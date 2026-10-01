import { forwardRef, useRef, type InputHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './Icon'

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
  loading?: boolean
}

/** Campo de búsqueda con lupa, botón de limpiar animado y estado de carga opcional. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { className, value, onChange, onClear, loading = false, disabled, ...props },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null)
    const hasValue = value != null && String(value).length > 0

    const setRefs = (element: HTMLInputElement | null) => {
      inputRef.current = element
      if (typeof ref === 'function') {
        ref(element)
      } else if (ref) {
        ref.current = element
      }
    }

    const handleClear = () => {
      if (onClear) {
        onClear()
      } else if (onChange) {
        const fakeEvent = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(fakeEvent)
      }
      inputRef.current?.focus()
    }

    return (
      <div className={cn('relative min-w-56 flex-1', className)}>
        {/* LUPA */}
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />

        <input
          ref={setRefs}
          type="search"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-full rounded-control border border-line bg-surface py-2.5 pl-11 pr-10 text-sm text-ink',
            'transition-colors duration-200 placeholder:text-muted',
            'hover:border-brand/50 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Oculta la "x" nativa de Chrome / Edge / Safari para garantizar consistencia visual
            '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
          )}
          {...props}
        />

        {/* ACCIÓN DERECHA: SPINNER O BOTÓN LIMPIAR */}
        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="mr-1 flex items-center justify-center text-brand"
              >
                <Icon name="spinner" size={16} className="animate-spin" />
              </motion.span>
            ) : (
              hasValue &&
              !disabled && (
                <motion.button
                  key="clear"
                  type="button"
                  tabIndex={-1}
                  aria-label="Limpiar búsqueda"
                  onClick={handleClear}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  className="grid size-6 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-alt hover:text-ink focus:outline-none"
                >
                  <Icon name="x" size={15} strokeWidth={2.2} />
                </motion.button>
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  },
)
