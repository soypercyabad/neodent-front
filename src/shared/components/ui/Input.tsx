import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon, type IconName } from './Icon'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: IconName
  trailing?: ReactNode
}

export function Input({ icon, trailing, className, ...props }: InputProps) {
  return (
    <div className="relative w-full min-w-0 max-w-full">
      {icon && (
        <Icon
          name={icon}
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted"
        />
      )}

      <input
        className={cn(
          'block w-full min-w-0 max-w-full rounded-control border border-line bg-surface px-3.5 py-2.5',
          'text-sm text-ink transition-colors duration-200',
          'placeholder:text-muted focus:border-brand focus:outline-none aria-invalid:border-danger',
          'disabled:cursor-not-allowed disabled:border-line/70 disabled:bg-alt/80',
          'disabled:text-muted disabled:opacity-100 disabled:shadow-inner',
          'disabled:placeholder:text-muted/60',
          icon && 'pl-9.5',
          trailing != null && 'pr-9.5',
          className,
        )}
        {...props}
      />

      {trailing != null && (
        <div className="pointer-events-none absolute right-3 top-1/2 z-10 flex shrink-0 -translate-y-1/2 items-center">
          <div className="pointer-events-auto">
            {trailing}
          </div>
        </div>
      )}
    </div>
  )
}