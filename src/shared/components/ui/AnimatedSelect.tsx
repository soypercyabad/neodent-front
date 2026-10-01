import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from './Icon'
import { cn } from '@/shared/lib/cn'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type AnimatedSelectProps = {
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AnimatedSelect({
  value,
  options,
  onChange,
  label,
  placeholder,
  className,
  disabled = false,
}: AnimatedSelectProps) {
  const [abierto, setAbierto] = useState(false)
  const [abrirArriba, setAbrirArriba] = useState(false)
  const [alturaMaxima, setAlturaMaxima] = useState(240)

  const contenedorRef = useRef<HTMLDivElement>(null)
  const botonRef = useRef<HTMLButtonElement>(null)
  const opcionesRef = useRef<Array<HTMLButtonElement | null>>([])
  const listaId = useId()

  const seleccionada = options.find(opcion => opcion.value === value)
  const etiquetaAria = label ?? placeholder ?? 'Seleccionar'

  const calcularPosicion = () => {
    if (!contenedorRef.current) return

    const rect = contenedorRef.current.getBoundingClientRect()
    const margen = 16
    const abajo = window.innerHeight - rect.bottom - margen
    const arriba = rect.top - margen
    const haciaArriba = abajo < 240 && arriba > abajo

    setAbrirArriba(haciaArriba)
    setAlturaMaxima(Math.max(120, Math.min(240, (haciaArriba ? arriba : abajo) - 8)))
  }

  const cerrar = () => setAbierto(false)

  const abrir = (indice?: number) => {
    if (disabled || options.length === 0) return

    calcularPosicion()

    const seleccionado = options.findIndex(opcion => opcion.value === value)
    const destino = indice ?? Math.max(0, seleccionado)

    setAbierto(true)

    window.requestAnimationFrame(() => {
      opcionesRef.current[destino]?.focus()
    })
  }

  const seleccionar = (nuevoValor: string) => {
    onChange(nuevoValor)
    cerrar()
    botonRef.current?.focus()
  }

  useEffect(() => {
    if (!abierto) return

    const cerrarDesdeFuera = (evento: PointerEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) cerrar()
    }

    const reposicionar = () => calcularPosicion()

    document.addEventListener('pointerdown', cerrarDesdeFuera)
    window.addEventListener('resize', reposicionar)
    window.addEventListener('scroll', reposicionar, true)

    return () => {
      document.removeEventListener('pointerdown', cerrarDesdeFuera)
      window.removeEventListener('resize', reposicionar)
      window.removeEventListener('scroll', reposicionar, true)
    }
  }, [abierto])

  useEffect(() => {
    if (disabled) setAbierto(false)
  }, [disabled])

  const manejarTeclado = (
    evento: React.KeyboardEvent<HTMLButtonElement>,
    indice: number,
  ) => {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      cerrar()
      botonRef.current?.focus()
      return
    }

    if (evento.key === 'Tab') {
      cerrar()
      return
    }

    let siguiente = indice

    if (evento.key === 'ArrowDown') siguiente = (indice + 1) % options.length
    else if (evento.key === 'ArrowUp') siguiente = (indice - 1 + options.length) % options.length
    else if (evento.key === 'Home') siguiente = 0
    else if (evento.key === 'End') siguiente = options.length - 1
    else return

    evento.preventDefault()
    opcionesRef.current[siguiente]?.focus()
  }

  return (
    <div
      ref={contenedorRef}
      className={cn('relative w-full min-w-0 max-w-full', className)}
    >
      <button
        ref={botonRef}
        type="button"
        disabled={disabled}
        aria-label={etiquetaAria}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? listaId : undefined}
        onClick={() => abierto ? cerrar() : abrir()}
        onKeyDown={evento => {
          if (evento.key === 'ArrowDown') {
            evento.preventDefault()
            abrir()
          }

          if (evento.key === 'ArrowUp') {
            evento.preventDefault()
            abrir(options.length - 1)
          }
        }}
        className={cn(
          'flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden',
          'rounded-control border bg-surface px-4 py-2.5',
          'text-left text-sm text-ink transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          abierto ? 'border-brand shadow-sm' : 'border-line hover:border-brand/50',
        )}
      >
        <span
          className={cn(
            'block min-w-0 flex-1 truncate text-left',
            !seleccionada && 'text-muted',
          )}
          title={seleccionada?.label}
        >
          {seleccionada?.label ?? placeholder ?? label ?? 'Seleccionar'}
        </span>

        <motion.span
          aria-hidden="true"
          animate={{ rotate: abierto ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex shrink-0 items-center justify-center text-ink-soft"
        >
          <Icon name="chevronDown" size={18} />
        </motion.span>
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            id={listaId}
            role="listbox"
            aria-label={etiquetaAria}
            initial={{ opacity: 0, y: abrirArriba ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: abrirArriba ? 5 : -5, scale: 0.98 }}
            transition={{ duration: 0.17, ease: 'easeOut' }}
            style={{ maxHeight: alturaMaxima }}
            className={cn(
              'absolute left-0 right-0 z-50 w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto',
              'rounded-xl border border-line bg-surface p-1.5 shadow-xl',
              abrirArriba ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {options.map((opcion, indice) => {
              const activa = opcion.value === value
              const bloqueada = Boolean(opcion.disabled)

              return (
                <button
                  key={opcion.value}
                  ref={elemento => {
                    opcionesRef.current[indice] = elemento
                  }}
                  type="button"
                  role="option"
                  disabled={bloqueada}
                  aria-selected={activa}
                  aria-disabled={bloqueada}
                  onClick={() => {
                    if (!bloqueada) seleccionar(opcion.value)
                  }}
                  onKeyDown={evento => manejarTeclado(evento, indice)}
                  className={cn(
                    'flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5',
                    'text-left text-sm transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:bg-brand-soft',
                    bloqueada
                      ? 'cursor-not-allowed text-muted opacity-40'
                      : activa
                        ? 'bg-brand-soft font-semibold text-brand'
                        : 'text-ink hover:bg-alt',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate" title={opcion.label}>
                    {opcion.label}
                  </span>

                  {activa && (
                    <Icon name="check" size={16} className="shrink-0 text-brand" />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}