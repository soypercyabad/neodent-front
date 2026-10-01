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
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-ink-soft"
        />
      )}

      <input
        className={cn(
          'block w-full min-w-0 max-w-full rounded-control border border-line bg-surface px-4 py-3',
          'text-[0.95rem] text-ink transition-colors duration-200',
          'placeholder:text-muted focus:border-brand focus:outline-none aria-invalid:border-danger',
          'disabled:cursor-not-allowed disabled:border-line/70 disabled:bg-alt/80',
          'disabled:text-muted disabled:opacity-100 disabled:shadow-inner',
          'disabled:placeholder:text-muted/60',
          icon && 'pl-12',
          trailing != null && 'pr-12',
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