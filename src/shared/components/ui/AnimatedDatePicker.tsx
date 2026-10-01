import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'
import { Icon } from './Icon'

export interface AnimatedDatePickerProps {
  value: string // Formato YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
  min?: string
  max?: string
  align?: 'left' | 'right'
  defaultViewDate?: string
  todayDate?: string
  trailing?: ReactNode
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const DIAS_SEMANA = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA']

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDateDisplay(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${pad(d)}/${pad(m)}/${y}`
}

function getLocalTodayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function AnimatedDatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  label = 'Seleccionar fecha',
  className,
  disabled = false,
  min,
  max,
  align = 'right',
  defaultViewDate,
  todayDate,
  trailing,
}: AnimatedDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [showMonthMenu, setShowMonthMenu] = useState(false)
  const [showYearMenu, setShowYearMenu] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  // Determinar fecha de hoy en tiempo real (según reloj local del usuario)
  const hoyStr = todayDate || getLocalTodayIso()
  const [hoyY, hoyM, hoyD] = hoyStr.split('-').map(Number)
  const hoyIso = `${hoyY}-${pad(hoyM)}-${pad(hoyD)}`

  // Fecha base para inicializar la vista (valor actual > fecha por defecto > hoy)
  const fechaBase = value || defaultViewDate || hoyStr
  const [baseY, baseM] = fechaBase.split('-').map(Number)

  const [viewYear, setViewYear] = useState(baseY || hoyY)
  const [viewMonth, setViewMonth] = useState(
    baseM != null ? baseM - 1 : hoyM - 1,
  )

  // Cada vez que se abre o cambia el valor, sincronizar la vista del mes
  useEffect(() => {
    if (open) {
      const fechaAbrir = value || defaultViewDate || hoyStr
      const [y, m] = fechaAbrir.split('-').map(Number)
      if (y && m) {
        setViewYear(y)
        setViewMonth(m - 1)
      }
    } else {
      setShowMonthMenu(false)
      setShowYearMenu(false)
    }
  }, [open, value, defaultViewDate, hoyStr])

  // Años disponibles para selección rápida en el calendario
  const maxYear = max ? parseInt(max.split('-')[0], 10) : hoyY + 5
  const minYear = min ? parseInt(min.split('-')[0], 10) : 1920
  const aniosSet = new Set<number>()
  for (let y = maxYear; y >= minYear; y--) {
    aniosSet.add(y)
  }
  aniosSet.add(viewYear)
  const anios = Array.from(aniosSet).sort((a, b) => b - a)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setShowMonthMenu(false)
        setShowYearMenu(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMonthMenu || showYearMenu) {
          setShowMonthMenu(false)
          setShowYearMenu(false)
        } else {
          setOpen(false)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  // Generar cuadrícula de días
  const primerDiaSemana = new Date(viewYear, viewMonth, 1).getDay()
  const diasEnMes = new Date(viewYear, viewMonth + 1, 0).getDate()
  const diasEnMesAnterior = new Date(viewYear, viewMonth, 0).getDate()

  const dias = []

  // Días del mes anterior
  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    dias.push({
      dia: diasEnMesAnterior - i,
      mesOffset: -1,
      fechaIso: '',
    })
  }

  // Días del mes actual
  for (let i = 1; i <= diasEnMes; i++) {
    const fechaIso = `${viewYear}-${pad(viewMonth + 1)}-${pad(i)}`
    dias.push({
      dia: i,
      mesOffset: 0,
      fechaIso,
    })
  }

  // Días del siguiente mes para completar 35 o 42 celdas
  const totalCeldas = dias.length > 35 ? 42 : 35
  const faltantes = totalCeldas - dias.length
  for (let i = 1; i <= faltantes; i++) {
    dias.push({
      dia: i,
      mesOffset: 1,
      fechaIso: '',
    })
  }

  const handleSelectDay = (fechaIso: string) => {
    if (!fechaIso) return
    onChange(fechaIso)
    setOpen(false)
  }

  const handleHoy = () => {
    onChange(hoyIso)
    setViewYear(hoyY)
    setViewMonth(hoyM - 1)
    setOpen(false)
  }

  const handleLimpiar = () => {
    onChange('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      {/* BOTÓN DISPARADOR */}
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => {
          if (!disabled) setOpen(actual => !actual)
        }}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-control border bg-surface px-3 py-2.5 text-left text-sm transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : open
              ? 'border-brand shadow-sm'
              : 'border-line hover:border-brand/50',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon name="calendar" size={17} className="shrink-0 text-muted" />

          <span
            className={cn(
              'truncate font-medium',
              value ? 'text-ink' : 'text-muted',
            )}
          >
            {value ? formatDateDisplay(value) : placeholder}
          </span>
        </div>

        {/* ACCIONES DEL BOTÓN: LIMPIAR O CHEVRON + TRAILING */}
        <div className="flex items-center gap-1.5">
          {trailing}
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpiar fecha"
              onClick={e => {
                e.stopPropagation()
                handleLimpiar()
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  handleLimpiar()
                }
              }}
              className="grid size-5 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-alt hover:text-ink"
            >
              <Icon name="x" size={13} strokeWidth={2.2} />
            </span>
          )}

          <motion.span
            aria-hidden="true"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex shrink-0 items-center justify-center text-ink-soft"
          >
            <Icon name="chevronDown" size={16} />
          </motion.span>
        </div>
      </button>

      {/* POPOVER DEL CALENDARIO: alineado a la derecha para no recortarse */}
      <AnimatePresence>
        {open && (
          <motion.div
            id={popoverId}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.17, ease: 'easeOut' }}
            className={cn(
              'absolute top-full z-50 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line bg-surface p-4 shadow-xl',
              align === 'left' ? 'left-0' : 'left-0 sm:left-auto sm:right-0',
            )}
          >
            {/* CABECERA: MES / AÑO Y NAVEGACIÓN */}
            <div className="relative mb-3 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                {/* SELECTOR DE MES PERSONALIZADO */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMonthMenu(v => !v)
                      setShowYearMenu(false)
                    }}
                    className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-bold text-ink transition-colors hover:border-brand/40 hover:bg-alt/50"
                  >
                    <span>{MESES[viewMonth]}</span>
                    <Icon name="chevronDown" size={13} className="text-muted" />
                  </button>

                  <AnimatePresence>
                    {showMonthMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-0 top-full z-30 mt-1 max-h-48 w-32 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-xl"
                      >
                        {MESES.map((m, idx) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setViewMonth(idx)
                              setShowMonthMenu(false)
                            }}
                            className={cn(
                              'w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors',
                              viewMonth === idx
                                ? 'bg-brand text-white font-bold'
                                : 'text-ink hover:bg-alt hover:text-brand',
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* SELECTOR DE AÑO PERSONALIZADO */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowYearMenu(v => !v)
                      setShowMonthMenu(false)
                    }}
                    className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-bold text-ink transition-colors hover:border-brand/40 hover:bg-alt/50"
                  >
                    <span>{viewYear}</span>
                    <Icon name="chevronDown" size={13} className="text-muted" />
                  </button>

                  <AnimatePresence>
                    {showYearMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-0 top-full z-30 mt-1 max-h-48 w-24 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-xl"
                      >
                        {anios.map(y => (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              setViewYear(y)
                              setShowYearMenu(false)
                            }}
                            className={cn(
                              'w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors',
                              viewYear === y
                                ? 'bg-brand text-white font-bold'
                                : 'text-ink hover:bg-alt hover:text-brand',
                            )}
                          >
                            {y}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={prevMonth}
                  className="grid size-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-alt hover:text-ink focus:outline-none"
                >
                  <Icon name="chevronLeft" size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Siguiente mes"
                  onClick={nextMonth}
                  className="grid size-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-alt hover:text-ink focus:outline-none"
                >
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </div>

            {/* DÍAS DE LA SEMANA */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {DIAS_SEMANA.map(d => (
                <span
                  key={d}
                  className="py-1 text-[0.7rem] font-bold text-muted"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* CUADRÍCULA DE DÍAS */}
            <div className="mt-1 grid grid-cols-7 gap-1">
              {dias.map((item, idx) => {
                const esMesActual = item.mesOffset === 0
                const esSeleccionado = item.fechaIso === value
                const esHoy = item.fechaIso === hoyIso

                const deshabilitado =
                  !esMesActual ||
                  (Boolean(min) && item.fechaIso < min!) ||
                  (Boolean(max) && item.fechaIso > max!)

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={deshabilitado}
                    onClick={() => handleSelectDay(item.fechaIso)}
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-lg text-xs transition-colors duration-150',
                      !esMesActual && 'cursor-default text-muted/30',
                      esMesActual && !esSeleccionado && 'text-ink hover:bg-alt',
                      esSeleccionado &&
                        'bg-brand font-bold text-white shadow-xs',
                      esHoy &&
                        !esSeleccionado &&
                        'font-bold text-brand ring-2 ring-brand/50',
                      deshabilitado && 'pointer-events-none opacity-20',
                    )}
                  >
                    {item.dia}
                  </button>
                )
              })}
            </div>

            {/* PIE CON ACCIONES RÁPIDAS */}
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs">
              <button
                type="button"
                onClick={handleLimpiar}
                className="font-medium text-muted hover:text-danger hover:underline focus:outline-none"
              >
                Borrar
              </button>

              <button
                type="button"
                onClick={handleHoy}
                className="font-semibold text-brand hover:underline focus:outline-none"
              >
                Hoy
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
