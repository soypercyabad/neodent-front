import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon, type IconName } from './Icon'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  size?: number
  iconSize?: number
}

/** Botón cuadrado con borde, sólo icono. Requiere `aria-label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon, size = 34, iconSize = 18, className, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        style={{ width: size, height: size }}
        className={cn(
          'grid cursor-pointer place-items-center rounded-lg border border-line bg-surface text-muted transition',
          'hover:bg-alt hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          className,
        )}
        {...props}
      >
        <Icon name={icon} size={iconSize} />
      </button>
    )
  },
)
