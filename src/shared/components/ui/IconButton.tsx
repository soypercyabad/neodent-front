import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { Icon, type IconName } from './Icon'
import { Tooltip, type TooltipSide } from './Tooltip'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  size?: number
  iconSize?: number
  tooltip?: string
  tooltipSide?: TooltipSide
}

/**
 * Botón cuadrado con borde, sólo icono.
 * Si recibe `tooltip` o `title`, renderiza el componente dinámico `Tooltip`
 * y omite el `title` nativo del navegador para mantener una estética consistente.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon, size = 34, iconSize = 18, className, tooltip, tooltipSide, title, ...props },
    ref,
  ) {
    const tooltipText = tooltip ?? title

    const button = (
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

    if (tooltipText) {
      return (
        <Tooltip content={tooltipText} side={tooltipSide}>
          {button}
        </Tooltip>
      )
    }

    return button
  },
)
