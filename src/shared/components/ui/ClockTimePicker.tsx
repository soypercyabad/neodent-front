import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from './Icon'
import { cn } from '@/shared/lib/cn'

interface ClockTimePickerProps {
  value: string // 'HH:mm' en formato 24 horas (ej. '08:00', '14:30')
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  className?: string
}

// Convertir de 'HH:mm' (24h) a { hour12: number, minute: number, period: 'AM' | 'PM' }
function parse24to12(time: string) {
  const [hStr = '08', mStr = '00'] = (time || '08:00').split(':')
  const h24 = Number.parseInt(hStr, 10) || 0
  const minute = Number.parseInt(mStr, 10) || 0

  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM'
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12

  return { hour12, minute, period }
}

// Convertir de { hour12, minute, period } a 'HH:mm' (24h)
function format12to24(hour12: number, minute: number, period: 'AM' | 'PM') {
  let h24 = hour12 % 12
  if (period === 'PM') h24 += 12
  const hh = String(h24).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return `${hh}:${mm}`
}

export function ClockTimePicker({
  value,
  onChange,
  label = 'Hora',
  disabled = false,
  className,
}: ClockTimePickerProps) {
  const [abierto, setAbierto] = useState(false)
  const [modo, setModo] = useState<'hours' | 'minutes'>('hours')

  const parsed = parse24to12(value)
  const [tempHour, setTempHour] = useState(parsed.hour12)
  const [tempMinute, setTempMinute] = useState(parsed.minute)
  const [tempPeriod, setTempPeriod] = useState(parsed.period)

  // Estados tipo string para permitir borrar y escribir libremente
  const [rawHour, setRawHour] = useState(String(parsed.hour12).padStart(2, '0'))
  const [rawMinute, setRawMinute] = useState(String(parsed.minute).padStart(2, '0'))
  const [triggerStr, setTriggerStr] = useState(
    `${String(parsed.hour12).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')} ${parsed.period}`,
  )

  const clockRef = useRef<HTMLDivElement>(null)
  const minuteInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar al cambiar value externamente
  useEffect(() => {
    const p = parse24to12(value)
    setTriggerStr(
      `${String(p.hour12).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} ${p.period}`,
    )
  }, [value])

  // Sincronizar estado temporal al abrir modal
  useEffect(() => {
    if (abierto) {
      const p = parse24to12(value)
      setTempHour(p.hour12)
      setRawHour(String(p.hour12).padStart(2, '0'))
      setTempMinute(p.minute)
      setRawMinute(String(p.minute).padStart(2, '0'))
      setTempPeriod(p.period)
      setModo('hours')
    }
  }, [abierto, value])

  const aceptar = () => {
    let h = Number.parseInt(rawHour, 10)
    if (isNaN(h) || h < 1) h = 12
    if (h > 12) h = 12

    let m = Number.parseInt(rawMinute, 10)
    if (isNaN(m) || m < 0) m = 0
    if (m > 59) m = 59

    const nuevo24 = format12to24(h, m, tempPeriod)
    onChange(nuevo24)
    setTriggerStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${tempPeriod}`)
    setAbierto(false)
  }

  const cancelar = () => {
    setAbierto(false)
  }

  // Parsear texto escrito directamente en el input disparador
  const handleTriggerBlur = () => {
    const trimmed = triggerStr.trim().toUpperCase()
    if (!trimmed) {
      // Si el usuario lo dejó vacío, restaurar
      const p = parse24to12(value)
      setTriggerStr(
        `${String(p.hour12).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} ${p.period}`,
      )
      return
    }

    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
    if (match12) {
      let h = Number.parseInt(match12[1], 10)
      let m = Number.parseInt(match12[2], 10)
      let p: 'AM' | 'PM' = (match12[3] as 'AM' | 'PM') || (h >= 12 ? 'PM' : 'AM')
      if (h > 12 && !match12[3]) {
        p = h >= 12 ? 'PM' : 'AM'
        h = h % 12 === 0 ? 12 : h % 12
      } else {
        h = Math.min(12, Math.max(1, h))
      }
      m = Math.min(59, Math.max(0, m))
      const time24 = format12to24(h, m, p)
      onChange(time24)
      setTriggerStr(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`)
      return
    }

    const match24 = trimmed.match(/^(\d{1,2}):?(\d{2})$/)
    if (match24) {
      let h = Number.parseInt(match24[1], 10)
      let m = Number.parseInt(match24[2], 10)
      h = Math.min(23, Math.max(0, h))
      m = Math.min(59, Math.max(0, m))
      const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 === 0 ? 12 : h % 12
      const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      onChange(time24)
      setTriggerStr(`${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`)
      return
    }

    // Restaurar si el formato es inválido
    const p = parse24to12(value)
    setTriggerStr(
      `${String(p.hour12).padStart(2, '0')}:${String(p.minute).padStart(2, '0')} ${p.period}`,
    )
  }

  // Dimensiones del reloj
  const DIAL_SIZE = 240
  const CENTER = DIAL_SIZE / 2
  const RADIUS = 88

  // Calcular posición o interacción al hacer clic en el dial
  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clockRef.current) return
    const rect = clockRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - CENTER
    const y = e.clientY - rect.top - CENTER

    // Ángulo en grados respecto a las 12:00
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90
    if (deg < 0) deg += 360

    if (modo === 'hours') {
      let h = Math.round(deg / 30)
      if (h === 0) h = 12
      setTempHour(h)
      setRawHour(String(h).padStart(2, '0'))
      // Al elegir hora, pasar automáticamente a minutos para fluidez
      setModo('minutes')
    } else {
      let m = Math.round(deg / 6)
      if (m === 60) m = 0
      setTempMinute(m)
      setRawMinute(String(m).padStart(2, '0'))
    }
  }

  // Aguja del reloj
  const handAngle =
    modo === 'hours'
      ? (tempHour % 12) * 30
      : tempMinute * 6

  return (
    <div className={cn('relative', className)}>
      {/* INPUT DISPARADOR EDITABLE DIRECTAMENTE + BOTÓN DE RELOJ */}
      <div
        className={cn(
          'flex h-11 w-full items-center rounded-xl border border-line bg-surface transition-colors',
          'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
          disabled && 'cursor-not-allowed opacity-50',
          abierto && 'border-brand ring-2 ring-brand/20',
        )}
      >
        <input
          type="text"
          disabled={disabled}
          value={triggerStr}
          onChange={e => setTriggerStr(e.target.value)}
          onBlur={handleTriggerBlur}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleTriggerBlur()
            }
          }}
          placeholder="08:00 AM"
          aria-label={label}
          className="h-full w-full bg-transparent px-3.5 text-sm font-semibold tabular-nums text-ink outline-none"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAbierto(true)}
          className="grid h-full w-10 shrink-0 place-items-center text-muted transition hover:text-brand focus:outline-none"
          title="Abrir selector con reloj"
        >
          <Icon name="clock" size={17} />
        </button>
      </div>

      {/* DIÁLOGO MODAL TIPO RELOJ */}
      <AnimatePresence>
        {abierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* FONDO OSCURECIDO */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelar}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* CONTENEDOR DEL RELOJ */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-[320px] rounded-3xl border border-line bg-surface p-6 shadow-2xl"
            >
              <p className="text-xs font-bold tracking-wider uppercase text-muted">
                Seleccionar hora
              </p>

              {/* PANTALLA DIGITAL (HORA : MINUTOS + AM/PM) */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {/* HORA */}
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="Hora"
                    value={rawHour}
                    onFocus={e => {
                      setModo('hours')
                      e.currentTarget.select()
                    }}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                      setRawHour(val)
                      if (val !== '') {
                        const num = Number.parseInt(val, 10)
                        if (num >= 1 && num <= 12) {
                          setTempHour(num)
                        }
                      }
                    }}
                    onBlur={() => {
                      let num = Number.parseInt(rawHour, 10)
                      if (isNaN(num) || num < 1) num = 12
                      if (num > 12) num = 12
                      setTempHour(num)
                      setRawHour(String(num).padStart(2, '0'))
                    }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        const next = (tempHour % 12) + 1
                        setTempHour(next)
                        setRawHour(String(next).padStart(2, '0'))
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        const prev = tempHour === 1 ? 12 : tempHour - 1
                        setTempHour(prev)
                        setRawHour(String(prev).padStart(2, '0'))
                      } else if (e.key === 'Enter') {
                        setModo('minutes')
                        minuteInputRef.current?.focus()
                        minuteInputRef.current?.select()
                      }
                    }}
                    className={cn(
                      'w-18 rounded-2xl py-2 text-center text-3xl font-extrabold tabular-nums transition focus:outline-none',
                      modo === 'hours'
                        ? 'bg-brand-soft text-brand ring-2 ring-brand/30'
                        : 'bg-alt text-ink hover:bg-alt/80',
                    )}
                  />

                  <span className="text-2xl font-bold text-muted">:</span>

                  {/* MINUTOS */}
                  <input
                    ref={minuteInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="Minutos"
                    value={rawMinute}
                    onFocus={e => {
                      setModo('minutes')
                      e.currentTarget.select()
                    }}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                      setRawMinute(val)
                      if (val !== '') {
                        const num = Number.parseInt(val, 10)
                        if (num >= 0 && num <= 59) {
                          setTempMinute(num)
                        }
                      }
                    }}
                    onBlur={() => {
                      let num = Number.parseInt(rawMinute, 10)
                      if (isNaN(num) || num < 0) num = 0
                      if (num > 59) num = 59
                      setTempMinute(num)
                      setRawMinute(String(num).padStart(2, '0'))
                    }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        const next = (tempMinute + 5) % 60
                        setTempMinute(next)
                        setRawMinute(String(next).padStart(2, '0'))
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        const prev = tempMinute === 0 ? 55 : (tempMinute - 5 + 60) % 60
                        setTempMinute(prev)
                        setRawMinute(String(prev).padStart(2, '0'))
                      } else if (e.key === 'Enter') {
                        aceptar()
                      }
                    }}
                    className={cn(
                      'w-18 rounded-2xl py-2 text-center text-3xl font-extrabold tabular-nums transition focus:outline-none',
                      modo === 'minutes'
                        ? 'bg-brand-soft text-brand ring-2 ring-brand/30'
                        : 'bg-alt text-ink hover:bg-alt/80',
                    )}
                  />
                </div>

                {/* SELECTOR AM / PM */}
                <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-alt text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTempPeriod('AM')}
                    className={cn(
                      'px-3 py-2 transition',
                      tempPeriod === 'AM'
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-muted hover:text-ink',
                    )}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempPeriod('PM')}
                    className={cn(
                      'px-3 py-2 transition',
                      tempPeriod === 'PM'
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-muted hover:text-ink',
                    )}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* DIAL DEL RELOJ CIRCULAR */}
              <div className="mt-6 flex justify-center">
                <div
                  ref={clockRef}
                  onClick={handleDialClick}
                  style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
                  className="relative cursor-pointer select-none rounded-full bg-alt/70 transition hover:bg-alt"
                >
                  {/* PUNTO CENTRAL */}
                  <div className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />

                  {/* AGUJA Y SELECTOR */}
                  <div
                    style={{
                      transform: `rotate(${handAngle}deg)`,
                      transformOrigin: 'bottom center',
                      height: RADIUS,
                      left: 'calc(50% - 1px)',
                      top: 'calc(50% - 88px)',
                    }}
                    className="pointer-events-none absolute w-[2px] bg-brand transition-transform duration-150"
                  >
                    {/* BOLA SELECTORA EN LA PUNTA */}
                    <div className="absolute -top-4 -left-4 size-8.5 rounded-full bg-brand shadow-md" />
                  </div>

                  {/* NÚMEROS DEL DIAL */}
                  {modo === 'hours'
                    ? // HORAS 1..12
                      Array.from({ length: 12 }, (_, i) => {
                        const h = i + 1
                        const rad = ((h * 30 - 90) * Math.PI) / 180
                        const x = CENTER + RADIUS * Math.cos(rad)
                        const y = CENTER + RADIUS * Math.sin(rad)
                        const activo = tempHour === h

                        return (
                          <div
                            key={h}
                            style={{
                              left: `${x}px`,
                              top: `${y}px`,
                            }}
                            className={cn(
                              'pointer-events-none absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-sm font-semibold tabular-nums',
                              activo ? 'font-bold text-white' : 'text-ink',
                            )}
                          >
                            {h}
                          </div>
                        )
                      })
                    : // MINUTOS EN INTERVALOS DE 5 (00, 05, 10, ... 55)
                      Array.from({ length: 12 }, (_, i) => {
                        const m = i * 5
                        const rad = ((m * 6 - 90) * Math.PI) / 180
                        const x = CENTER + RADIUS * Math.cos(rad)
                        const y = CENTER + RADIUS * Math.sin(rad)
                        const activo = tempMinute === m

                        return (
                          <div
                            key={m}
                            style={{
                              left: `${x}px`,
                              top: `${y}px`,
                            }}
                            className={cn(
                              'pointer-events-none absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-xs font-semibold tabular-nums',
                              activo ? 'font-bold text-white' : 'text-ink',
                            )}
                          >
                            {String(m).padStart(2, '0')}
                          </div>
                        )
                      })}
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={cancelar}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition hover:bg-alt hover:text-ink"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={aceptar}
                  className="rounded-xl bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
