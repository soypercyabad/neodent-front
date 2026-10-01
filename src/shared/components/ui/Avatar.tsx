import { Blobatar } from '@blobatar/react'
import { useGaze } from '@blobatar/react/gaze'

interface AvatarProps {
  nombre: string
  apellido?: string
  /** Semilla opcional o ID numérico; si no se provee, se usa el nombre completo */
  seed?: number | string
  size?: number
  animate?: 'hover' | 'always'
  /** Si debe seguir el cursor del ratón con la mirada (por defecto true) */
  trackCursor?: boolean
  className?: string
}

/** Avatar con diseño de Blobatar, animación interactiva y seguimiento de mirada al cursor */
export function Avatar({
  nombre,
  apellido = '',
  seed,
  size = 44,
  animate = 'always',
  trackCursor = true,
  className = '',
}: AvatarProps) {
  const seedString = seed ? `user-${seed}` : `${nombre} ${apellido}`.trim() || 'User'
  const { ref } = useGaze({ travel: 3, lookAt: trackCursor ? 'pointer' : undefined })

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-grid flex-none place-items-center overflow-hidden rounded-full bg-alt shadow-sm ${className}`}
    >
      <Blobatar ref={ref} name={seedString} size={size} animate={animate} />
    </div>
  )
}


