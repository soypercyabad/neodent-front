interface ConfettiOptions {
  particleCount?: number
  spread?: number
  origin?: { x?: number; y?: number }
  colors?: string[]
}

/**
 * Dispara una ráfaga de confeti festivo usando HTML5 Canvas liviano y sin dependencias externas.
 * Limpia automáticamente el canvas del DOM al terminar la animación.
 */
export function dispararConfetti(options: ConfettiOptions = {}) {
  if (typeof window === 'undefined') return

  const particleCount = options.particleCount ?? 75
  const spread = options.spread ?? 80
  const originX = options.origin?.x ?? 0.5
  const originY = options.origin?.y ?? 0.35
  const colors = options.colors ?? [
    '#2f80ed', // brand
    '#1f6fe0', // brand-dark
    '#12805c', // success
    '#60a5fa', // blue light
    '#34d399', // green light
    '#fbbf24', // amber
    '#a855f7', // purple
    '#f43f5e', // rose
  ]

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '99999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr

  const startX = window.innerWidth * originX * dpr
  const startY = window.innerHeight * originY * dpr

  type Particle = {
    x: number
    y: number
    vx: number
    vy: number
    color: string
    w: number
    h: number
    rotation: number
    vRot: number
    alpha: number
    decay: number
  }

  const particles: Particle[] = []

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI / 180) * (-90 + (Math.random() - 0.5) * spread * 2)
    const speed = (Math.random() * 11 + 6) * dpr
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: (Math.random() * 6 + 6) * dpr,
      h: (Math.random() * 4 + 4) * dpr,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      alpha: 1,
      decay: Math.random() * 0.008 + 0.012,
    })
  }

  let animationFrame: number
  const gravity = 0.38 * dpr
  const drag = 0.98

  const update = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = 0

    for (const p of particles) {
      p.vx *= drag
      p.vy = p.vy * drag + gravity
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.vRot
      p.alpha -= p.decay

      if (p.alpha > 0) {
        alive++
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.fillStyle = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
    }

    if (alive > 0) {
      animationFrame = requestAnimationFrame(update)
    } else {
      cancelAnimationFrame(animationFrame)
      canvas.remove()
    }
  }

  animationFrame = requestAnimationFrame(update)
}

/**
 * Dispara una celebración en dos ráfagas (izquierda y derecha) para eventos de éxito destacados.
 */
export function dispararCelebracion() {
  dispararConfetti({ origin: { x: 0.35, y: 0.4 }, spread: 65, particleCount: 60 })
  setTimeout(() => {
    dispararConfetti({ origin: { x: 0.65, y: 0.4 }, spread: 65, particleCount: 60 })
  }, 220)
}
