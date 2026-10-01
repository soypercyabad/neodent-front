import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'

export interface TooltipProps {
  content: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function Tooltip({
  content,
  children,
  disabled = false,
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; alignment: 'center' | 'right' | 'left' }>({
    top: 0,
    left: 0,
    alignment: 'center',
  })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const top = rect.top
    const centerX = rect.left + rect.width / 2

    let alignment: 'center' | 'right' | 'left' = 'center'
    if (centerX > window.innerWidth - 100) {
      alignment = 'right'
    } else if (centerX < 100) {
      alignment = 'left'
    }

    setCoords({ top, left: centerX, alignment })
  }

  const show = () => {
    if (disabled || !content) return
    updatePosition()
    timeoutRef.current = setTimeout(() => {
      updatePosition()
      setOpen(true)
    }, 80)
  }

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const handleScrollOrResize = () => updatePosition()
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const translateTransform =
    coords.alignment === 'right'
      ? 'translate(-85%, -100%)'
      : coords.alignment === 'left'
        ? 'translate(-15%, -100%)'
        : 'translate(-50%, -100%)'

  const arrowClass =
    coords.alignment === 'right'
      ? 'left-[85%] -translate-x-1/2'
      : coords.alignment === 'left'
        ? 'left-[15%] -translate-x-1/2'
        : 'left-1/2 -translate-x-1/2'

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className={cn('inline-flex', className)}
    >
      {children}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  transform: translateTransform,
                  zIndex: 99999,
                  pointerEvents: 'none',
                }}
              >
                <motion.div
                  id={tooltipId}
                  role="tooltip"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="relative mb-2 whitespace-nowrap rounded-md border border-slate-700/60 bg-slate-900/95 px-2.5 py-1 text-xs font-medium text-slate-100 shadow-xl backdrop-blur-xs"
                >
                  {content}
                  <div
                    className={cn(
                      'absolute top-full border-4 border-transparent border-t-slate-900/95',
                      arrowClass,
                    )}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}
