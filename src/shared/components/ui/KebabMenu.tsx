import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Icon, type IconName } from './Icon'
import { cn } from '@/shared/lib/cn'

export interface KebabAction {
  label: string
  icon?: IconName
  onClick: () => void
  show?: boolean
  disabled?: boolean
  danger?: boolean
  dividerBefore?: boolean
}

interface KebabMenuProps {
  actions: KebabAction[]
  disabled?: boolean
  className?: string
}

const MENU_WIDTH = 220
const GAP = 8
const SAFE = 12

export function KebabMenu({
  actions,
  disabled = false,
  className,
}: KebabMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const visibleActions = actions.filter(action => action.show !== false)

  const reposition = () => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const menuHeight =
      menuRef.current?.offsetHeight ??
      Math.max(48, visibleActions.length * 44 + 12)

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    const openAbove =
      spaceBelow < menuHeight + GAP + SAFE &&
      spaceAbove > spaceBelow

    let top = openAbove
      ? rect.top - menuHeight - GAP
      : rect.bottom + GAP

    let left = rect.right - MENU_WIDTH

    left = Math.max(
      SAFE,
      Math.min(left, window.innerWidth - MENU_WIDTH - SAFE),
    )

    top = Math.max(
      SAFE,
      Math.min(top, window.innerHeight - menuHeight - SAFE),
    )

    setPosition({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, visibleActions.length])

  useEffect(() => {
    if (!open) return

    const handleOutside = (event: PointerEvent) => {
      const target = event.target as Node

      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return

      setOpen(false)
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    const handlePosition = () => reposition()

    document.addEventListener('pointerdown', handleOutside)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handlePosition)
    window.addEventListener('scroll', handlePosition, true)

    return () => {
      document.removeEventListener('pointerdown', handleOutside)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handlePosition)
      window.removeEventListener('scroll', handlePosition, true)
    }
  }, [open])

  if (visibleActions.length === 0) return null

  const menu = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: MENU_WIDTH,
          }}
          className="z-[9999] overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl"
        >
          {visibleActions.map((action, index) => (
            <div key={`${action.label}-${index}`}>
              {action.dividerBefore && index > 0 && (
                <div className="my-1 border-t border-line" />
              )}

              <button
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  if (action.disabled) return
                  setOpen(false)
                  action.onClick()
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
                  action.disabled
                    ? 'cursor-not-allowed text-muted opacity-50'
                    : action.danger
                      ? 'text-danger hover:bg-danger-soft'
                      : 'text-ink hover:bg-alt',
                )}
              >
                {action.icon && (
                  <Icon
                    name={action.icon}
                    size={17}
                    className="shrink-0"
                  />
                )}

                <span className="min-w-0 flex-1">
                  {action.label}
                </span>
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label="Abrir menú de acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={event => {
          event.stopPropagation()

          if (!disabled) {
            setOpen(current => !current)
          }
        }}
        className={cn(
          'grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted',
          'transition-colors hover:border-brand/40 hover:bg-alt hover:text-ink',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <Icon name="kebab" size={18} />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(menu, document.body)}
    </div>
  )
}