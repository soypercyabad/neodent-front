import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon, type IconName } from './Icon'

export type AlertVariant = 'error' | 'success' | 'warning' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  icon?: IconName | boolean
  onClose?: () => void
  shake?: boolean
  className?: string
}

const VARIANT_CONFIG: Record<
  AlertVariant,
  {
    container: string
    iconBg: string
    iconColor: string
    titleColor: string
    textColor: string
    closeHover: string
    defaultIcon: IconName
  }
> = {
  error: {
    container:
      'bg-red-50/80 border-red-200/80 text-red-950 shadow-[0_2px_8px_-2px_rgba(229,72,77,0.12)]',
    iconBg: 'bg-red-100/90 text-red-600',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    textColor: 'text-red-800/90',
    closeHover: 'text-red-400 hover:text-red-700 hover:bg-red-100/70',
    defaultIcon: 'alertCircle',
  },
  success: {
    container:
      'bg-emerald-50/80 border-emerald-200/80 text-emerald-950 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.12)]',
    iconBg: 'bg-emerald-100/90 text-emerald-600',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
    textColor: 'text-emerald-800/90',
    closeHover: 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100/70',
    defaultIcon: 'checkCircle',
  },
  warning: {
    container:
      'bg-amber-50/80 border-amber-200/80 text-amber-950 shadow-[0_2px_8px_-2px_rgba(245,158,11,0.12)]',
    iconBg: 'bg-amber-100/90 text-amber-600',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    textColor: 'text-amber-800/90',
    closeHover: 'text-amber-400 hover:text-amber-700 hover:bg-amber-100/70',
    defaultIcon: 'warning',
  },
  info: {
    container:
      'bg-blue-50/80 border-blue-200/80 text-blue-950 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.12)]',
    iconBg: 'bg-blue-100/90 text-blue-600',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    textColor: 'text-blue-800/90',
    closeHover: 'text-blue-400 hover:text-blue-700 hover:bg-blue-100/70',
    defaultIcon: 'info',
  },
}

export function Alert({
  variant = 'error',
  title,
  children,
  icon = true,
  onClose,
  shake = false,
  className,
}: AlertProps) {
  const config = VARIANT_CONFIG[variant]

  const iconName: IconName | null =
    typeof icon === 'string'
      ? icon
      : icon
        ? config.defaultIcon
        : null

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 rounded-xl border p-3.5 text-[0.88rem] transition-all',
        config.container,
        shake && 'animate-alert-shake',
        className,
      )}
    >
      {iconName && (
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-2xs',
            config.iconBg,
          )}
        >
          <Icon name={iconName} size={16} strokeWidth={2.2} />
        </span>
      )}

      <div className="min-w-0 flex-1 pt-0.5 leading-snug">
        {title && (
          <h5 className={cn('mb-0.5 font-semibold', config.titleColor)}>
            {title}
          </h5>
        )}
        <div className={cn('break-words font-medium', config.textColor)}>
          {children}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className={cn(
            '-mr-1 -mt-1 ml-auto flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors',
            config.closeHover,
          )}
        >
          <Icon name="x" size={14} strokeWidth={2.4} />
        </button>
      )}
    </div>
  )
}
