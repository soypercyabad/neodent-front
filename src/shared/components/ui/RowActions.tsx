import type { IconName } from './Icon'
import { Icon } from './Icon'
import { KebabMenu, type KebabAction } from './KebabMenu'
import { Tooltip } from './Tooltip'
import { cn } from '@/shared/lib/cn'

export interface RowActionItem {
  label: string
  icon: IconName
  onClick: () => void
  show?: boolean
  disabled?: boolean
  danger?: boolean
  variant?: 'default' | 'danger' | 'success'
  dividerBefore?: boolean
}

interface RowActionsProps {
  actions: RowActionItem[]
  maxDirectIcons?: number
  className?: string
}

/**
 * Acciones por fila de tabla:
 * - Si hay 1 sola acción: muestra el botón directo con su icono y Tooltip.
 * - Si hay 2 o más acciones (>= 2): muestra el menú de 3 puntos (kebab) con icono + nombre.
 */
export function RowActions({
  actions,
  maxDirectIcons = 1,
  className,
}: RowActionsProps) {
  const visible = actions.filter(a => a.show !== false)

  if (visible.length === 0) return null

  if (visible.length > maxDirectIcons) {
    const kebabActions: KebabAction[] = visible.map(a => ({
      label: a.label,
      icon: a.icon,
      onClick: a.onClick,
      disabled: a.disabled,
      danger: a.danger || a.variant === 'danger',
      dividerBefore: a.dividerBefore,
    }))

    return <KebabMenu actions={kebabActions} className={className} />
  }

  return (
    <div className={cn('flex items-center justify-center gap-1.5', className)}>
      {visible.map((action, i) => {
        const isDanger = action.danger || action.variant === 'danger'
        const isSuccess = action.variant === 'success'

        return (
          <Tooltip key={`${action.label}-${i}`} content={action.label}>
            <button
              type="button"
              disabled={action.disabled}
              onClick={e => {
                e.stopPropagation()
                action.onClick()
              }}
              aria-label={action.label}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
                action.disabled
                  ? 'cursor-not-allowed text-muted opacity-40'
                  : isDanger
                    ? 'hover:border-danger/40 hover:bg-danger/10 hover:text-danger'
                    : isSuccess
                      ? 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                      : 'hover:border-brand/40 hover:bg-alt hover:text-brand',
              )}
            >
              <Icon name={action.icon} size={15} />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
