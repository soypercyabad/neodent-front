import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  outline: 'bg-surface text-brand border border-brand hover:bg-brand-soft',
  ghost: 'bg-surface text-ink-soft border border-line hover:bg-hover',
  danger: 'bg-danger text-white hover:brightness-95',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm font-semibold rounded-control gap-2',
  lg: 'px-5 py-2.5 text-[0.92rem] font-bold rounded-control gap-2.5',
}

const ICON_SIZES: Record<Size, number> = {
  sm: 15,
  md: 17,
  lg: 18,
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex cursor-pointer items-center justify-center transition select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size={ICON_SIZES[size]} strokeWidth={2.2} />}
      {children}
    </button>
  )
}
