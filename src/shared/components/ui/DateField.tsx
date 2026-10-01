import { AnimatedDatePicker } from './AnimatedDatePicker'

export interface DateFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  min?: string
  max?: string
  align?: 'left' | 'right'
  todayDate?: string
  defaultViewDate?: string
}

/** Selector de fecha animado y estilizado con popover interactivo. */
export function DateField({
  value,
  onChange,
  label = 'Filtrar por fecha',
  placeholder = 'dd/mm/aaaa',
  className,
  disabled,
  min,
  max,
  align = 'right',
  todayDate,
  defaultViewDate,
}: DateFieldProps) {
  return (
    <AnimatedDatePicker
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      min={min}
      max={max}
      align={align}
      todayDate={todayDate}
      defaultViewDate={defaultViewDate}
    />
  )
}
