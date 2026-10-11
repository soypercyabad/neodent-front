import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/shared/lib/cn'

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: string
  children: ReactNode
  disabled?: boolean
  className?: string
  offset?: number
  sideOffset?: number
  side?: TooltipSide
}

export function Tooltip({
  content,
  children,
  disabled = false,
  className,
  offset,
  sideOffset,
  side = 'top',
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{
    x: number
    y: number
    arrowOffset?: number
    placedSide: TooltipSide
  }>({
    x: 0,
    y: 0,
    placedSide: side,
  })

  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const gap = sideOffset ?? offset ?? 8

    // Dimensiones del tooltip (medidas o aproximadas para el primer render)
    const tooltipWidth = tooltipRef.current?.offsetWidth || 150
    const tooltipHeight = tooltipRef.current?.offsetHeight || 30

    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const margin = 10

    let targetSide: TooltipSide = side

    // Detección de colisiones y auto-flip inteligente
    if (targetSide === 'top' && rect.top - tooltipHeight - gap < margin) {
      targetSide = 'bottom'
    } else if (targetSide === 'bottom' && rect.bottom + tooltipHeight + gap > viewportH - margin) {
      targetSide = 'top'
    } else if (targetSide === 'left' && rect.left - tooltipWidth - gap < margin) {
      targetSide = 'right'
    } else if (targetSide === 'right' && rect.right + tooltipWidth + gap > viewportW - margin) {
      targetSide = 'left'
    }

    let x = 0
    let y = 0
    let arrowOffset: number | undefined

    if (targetSide === 'top') {
      y = rect.top - gap
      const triggerCenterX = rect.left + rect.width / 2
      const halfW = tooltipWidth / 2
      x = Math.max(halfW + margin, Math.min(triggerCenterX, viewportW - halfW - margin))
      const tooltipLeft = x - halfW
      arrowOffset = Math.max(12, Math.min(triggerCenterX - tooltipLeft, tooltipWidth - 12))
    } else if (targetSide === 'bottom') {
      y = rect.bottom + gap
      const triggerCenterX = rect.left + rect.width / 2
      const halfW = tooltipWidth / 2
      x = Math.max(halfW + margin, Math.min(triggerCenterX, viewportW - halfW - margin))
      const tooltipLeft = x - halfW
      arrowOffset = Math.max(12, Math.min(triggerCenterX - tooltipLeft, tooltipWidth - 12))
    } else if (targetSide === 'right') {
      x = rect.right + gap
      const triggerCenterY = rect.top + rect.height / 2
      const halfH = tooltipHeight / 2
      y = Math.max(halfH + margin, Math.min(triggerCenterY, viewportH - halfH - margin))
      const tooltipTop = y - halfH
      arrowOffset = Math.max(10, Math.min(triggerCenterY - tooltipTop, tooltipHeight - 10))
    } else if (targetSide === 'left') {
      x = rect.left - gap
      const triggerCenterY = rect.top + rect.height / 2
      const halfH = tooltipHeight / 2
      y = Math.max(halfH + margin, Math.min(triggerCenterY, viewportH - halfH - margin))
      const tooltipTop = y - halfH
      arrowOffset = Math.max(10, Math.min(triggerCenterY - tooltipTop, tooltipHeight - 10))
    }

    setPosition({ x, y, arrowOffset, placedSide: targetSide })
  }

  const show = () => {
    if (disabled || !content) return
    updatePosition()
    timeoutRef.current = setTimeout(() => {
      updatePosition()
      setOpen(true)
    }, 60)
  }

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setOpen(false)
  }

  // Recalcular posición si el tooltip ya está abierto y se mide con exactitud
  useLayoutEffect(() => {
    if (open) {
      updatePosition()
    }
  }, [open, content])

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

  // Estilos de transformación y flecha según el lado resultante
  const getTransform = (side: TooltipSide) => {
    switch (side) {
      case 'top':
        return 'translate(-50%, -100%)'
      case 'bottom':
        return 'translate(-50%, 0)'
      case 'right':
        return 'translate(0, -50%)'
      case 'left':
        return 'translate(-100%, -50%)'
    }
  }

  const getArrowClasses = (side: TooltipSide) => {
    switch (side) {
      case 'top':
        return 'top-full border-t-slate-900/95 border-x-transparent border-b-transparent'
      case 'bottom':
        return 'bottom-full border-b-slate-900/95 border-x-transparent border-t-transparent'
      case 'right':
        return 'right-full border-r-slate-900/95 border-y-transparent border-l-transparent'
      case 'left':
        return 'left-full border-l-slate-900/95 border-y-transparent border-r-transparent'
    }
  }

  const getMotionOffsets = (side: TooltipSide) => {
    switch (side) {
      case 'top':
        return { initial: { opacity: 0, y: 4, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 2, scale: 0.96 } }
      case 'bottom':
        return { initial: { opacity: 0, y: -4, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -2, scale: 0.96 } }
      case 'right':
        return { initial: { opacity: 0, x: -4, scale: 0.96 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: -2, scale: 0.96 } }
      case 'left':
        return { initial: { opacity: 0, x: 4, scale: 0.96 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: 2, scale: 0.96 } }
    }
  }

  const motionProps = getMotionOffsets(position.placedSide)
  const isVertical = position.placedSide === 'top' || position.placedSide === 'bottom'
  const arrowStyle: CSSProperties = isVertical
    ? { left: position.arrowOffset !== undefined ? `${position.arrowOffset}px` : '50%', transform: 'translateX(-50%)' }
    : { top: position.arrowOffset !== undefined ? `${position.arrowOffset}px` : '50%', transform: 'translateY(-50%)' }

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
                  top: position.y,
                  left: position.x,
                  transform: getTransform(position.placedSide),
                  zIndex: 99999,
                  pointerEvents: 'none',
                }}
              >
                <motion.div
                  ref={tooltipRef}
                  id={tooltipId}
                  role="tooltip"
                  initial={motionProps.initial}
                  animate={motionProps.animate}
                  exit={motionProps.exit}
                  transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                  className="relative max-w-xs break-words rounded-md border border-slate-700/60 bg-slate-900/95 px-2.5 py-1 text-center text-xs font-medium leading-relaxed text-slate-100 shadow-xl backdrop-blur-xs"
                >
                  {content}
                  <div
                    style={arrowStyle}
                    className={cn(
                      'absolute border-4',
                      getArrowClasses(position.placedSide),
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
