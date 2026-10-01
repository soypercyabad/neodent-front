import { useMemo } from 'react'
import { AnimatedSelect } from './AnimatedSelect'

interface AnimatedTimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  minHour?: number
  maxHour?: number
  minuteStep?: number
}

export function AnimatedTimePicker({
  value,
  onChange,
  label = 'Hora',
  disabled = false,
  minHour = 6,
  maxHour = 22,
  minuteStep = 10,
}: AnimatedTimePickerProps) {
  const options = useMemo(() => {
    const result: { value: string; label: string }[] = []

    for (let hour = minHour; hour <= maxHour; hour++) {
      for (let minute = 0; minute < 60; minute += minuteStep) {
        if (hour === maxHour && minute > 0) break

        const h = String(hour).padStart(2, '0')
        const m = String(minute).padStart(2, '0')
        const value = `${h}:${m}`

        result.push({
          value,
          label: value,
        })
      }
    }

    return result
  }, [minHour, maxHour, minuteStep])

  return (
    <AnimatedSelect
      value={value}
      options={options}
      onChange={onChange}
      label={label}
      placeholder="Seleccionar hora"
      disabled={disabled}
    />
  )
}