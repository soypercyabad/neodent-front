import { cn } from '@/shared/lib/cn'

export interface Step {
  /** Rótulo corto, por ejemplo "PASO 1". */
  label: string
  /** Nombre del paso, por ejemplo "Datos generales". */
  title: string
}

interface StepperProps {
  steps: readonly Step[]
  /** Índice del paso en curso, empezando en 0. */
  current: number
}

/**
 * Progreso de un formulario por pasos: una barra por paso y su rótulo debajo.
 * El paso en curso se marca en azul y los ya completados en verde.
 */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex gap-2 sm:gap-4 md:gap-5">
      {steps.map((step, i) => {
        const active = i === current
        const done = i < current
        return (
          <li key={step.label} className="min-w-0 flex-1" title={`${step.label}: ${step.title}`}>
            <div
              className={cn(
                'h-1 rounded-full transition-colors',
                done ? 'bg-success' : active ? 'bg-brand' : 'bg-line',
              )}
              aria-hidden="true"
            />
            <div className="pt-2 sm:pt-3" aria-current={active ? 'step' : undefined}>
              <div
                className={cn(
                  'truncate text-[0.68rem] font-bold uppercase tracking-wider sm:text-[0.82rem]',
                  active ? 'text-brand' : done ? 'text-success' : 'text-ink-soft',
                )}
              >
                {step.label}
              </div>
              <div
                className={cn(
                  'truncate text-[0.75rem] sm:text-[0.9rem]',
                  active ? 'font-semibold text-brand' : 'text-muted',
                )}
              >
                {step.title}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
