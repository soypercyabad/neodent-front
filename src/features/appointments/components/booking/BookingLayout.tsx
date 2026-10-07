import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Stepper } from '@/shared/components/ui'
import type { Step } from '@/shared/components/ui/Stepper'
import { BOOKING_STEPS } from '../../model/catalog'

interface BookingLayoutProps {
  step: number
  children: ReactNode
  footer: ReactNode
  steps?: readonly Step[]
  title?: string
  exitTo?: string
  onExit?: () => void | Promise<void>
}

export function BookingLayout({
  step,
  children,
  footer,
  steps = BOOKING_STEPS,
  title = 'Programar una cita',
  exitTo = '/mis-citas',
  onExit,
}: BookingLayoutProps) {
  
  const navigate = useNavigate()

  return (
    <div className="-m-4 flex h-[calc(100%+2rem)] flex-col md:-m-7 md:h-[calc(100%+3.5rem)]">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 md:px-7 md:pt-7 md:pb-12">
        <header className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-[1.9rem]">{title}</h1>

          <Button variant="ghost" icon="logout"
            onClick={() => {
              if (onExit) {
                void Promise.resolve(onExit()).then(() => navigate(exitTo))
                return
              }

              navigate(exitTo)
            }}
            className="shrink-0"> Salir
          </Button>
        </header>

        <Stepper steps={steps} current={step} />
        {children}
      </div>

      <footer className="flex flex-none items-center justify-end gap-3 border-t border-line bg-surface px-4 py-3 sm:px-7 sm:py-4">
        {footer}
      </footer>
    </div>
  )
}