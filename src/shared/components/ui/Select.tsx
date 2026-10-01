import { AnimatedSelect, type SelectOption } from './AnimatedSelect'

export interface SelectProps {
  options: readonly (string | SelectOption)[]
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

/**
 * Componente Select adaptador que utiliza AnimatedSelect internamente para
 * proveer animación, accesibilidad y consistencia visual en todo el sistema.
 */
export function Select({
  options,
  value = '',
  onChange,
  placeholder,
  className,
  disabled,
  'aria-label': ariaLabel,
}: SelectProps) {
  const normalizedOptions: SelectOption[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  )

  const finalOptions = placeholder
    ? [{ value: '', label: placeholder }, ...normalizedOptions]
    : normalizedOptions

  return (
    <AnimatedSelect
      value={value}
      options={finalOptions}
      onChange={val => onChange?.({ target: { value: val } })}
      label={ariaLabel ?? placeholder ?? 'Seleccionar'}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  )
}
