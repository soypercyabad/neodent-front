import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './Icon'

export interface ChipOption {
  value: string
  label: string
}

interface MultiSelectChipsProps {
  options: readonly ChipOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelectChips({
  options, value, onChange,
  placeholder = 'Selecciona una o varias opciones',
  disabled = false, className,
}: MultiSelectChipsProps) {
  const [open, setOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const [maxHeight, setMaxHeight] = useState(240)
  const container = useRef<HTMLDivElement>(null)

  const calcularPosicion = () => {
    if (!container.current) return

    const rect = container.current.getBoundingClientRect()
    const margen = 16
    const espacioAbajo = window.innerHeight - rect.bottom - margen
    const espacioArriba = rect.top - margen
    const abrirArriba = espacioAbajo < 240 && espacioArriba > espacioAbajo

    setOpenAbove(abrirArriba)
    setMaxHeight(Math.max(120, Math.min(240, (abrirArriba ? espacioArriba : espacioAbajo) - 8)))
  }

  useEffect(() => {
    if (!open) return

    calcularPosicion()

    const close = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }

    const reposition = () => calcularPosicion()

    document.addEventListener('pointerdown', close)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)

    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  const toggle = (option: string) => {
    onChange(value.includes(option)
      ? value.filter(item => item !== option)
      : [...value, option])
  }

  return (
    <div ref={container} className={cn('relative min-w-0', className)}>
      <div
        onClick={() => {
          if (!disabled) {
            if (!open) calcularPosicion()
            setOpen(current => !current)
          }
        }}
        className={cn(
          'flex min-h-12 cursor-pointer flex-wrap items-center gap-2 rounded-control border bg-surface px-3 py-2 transition-colors duration-200',
          disabled ? 'cursor-not-allowed opacity-50'
            : open ? 'border-brand shadow-sm'
              : 'border-line hover:border-brand/50',
        )}
      >
        <AnimatePresence>
          {value.map(item => (
            <motion.span
              layout key={item}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand shadow-xs"
            >
              <span>{options.find(option => option.value === item)?.label ?? item}</span>
              <button
                type="button" disabled={disabled}
                aria-label={`Quitar ${item}`}
                onClick={e => {
                  e.stopPropagation()
                  toggle(item)
                }}
                className="grid size-4 place-items-center rounded-md p-0 text-brand/70 transition-colors hover:bg-brand/10 hover:text-brand"
              >
                <Icon name="x" size={13} strokeWidth={2.4} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        <span className="min-w-24 flex-1 select-none py-1 text-sm text-muted">
          {value.length ? 'Agregar más…' : placeholder}
        </span>

        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex shrink-0 items-center justify-center text-ink-soft"
        >
          <Icon name="chevronDown" size={18} />
        </motion.span>
      </div>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: openAbove ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openAbove ? 5 : -5, scale: 0.98 }}
            transition={{ duration: 0.17, ease: 'easeOut' }}
            style={{ maxHeight }}
            className={cn(
              'absolute left-0 right-0 z-50 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl',
              openAbove ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {options.map(option => {
              const selected = value.includes(option.value)

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    toggle(option.value)
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:bg-brand-soft',
                    selected
                      ? 'bg-brand-soft font-semibold text-brand'
                      : 'text-ink hover:bg-alt',
                  )}
                >
                  <span>{option.label}</span>
                  {selected && <Icon name="check" size={16} className="shrink-0 text-brand" />}
                </button>
              )
            })}

            {!options.length && (
              <p className="px-3 py-3 text-center text-sm text-muted">
                No hay opciones disponibles.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}