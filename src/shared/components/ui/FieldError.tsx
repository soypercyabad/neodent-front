import { motion } from 'motion/react'

export function FieldError({ invalid }: { invalid: boolean }) {
  if (!invalid) return null
  return (
    <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      role="status" aria-label="Campo inválido"
      className="grid size-5 shrink-0 place-items-center rounded-full bg-danger text-white">
      <span className="text-xs pb-1 font-bold leading-none">×</span>
    </motion.span>
  )
}