import { motion } from 'motion/react'
import { Icon } from './Icon'

export function FieldCheck({ valid }: { valid: boolean }) {
  if (!valid) return null
  return (
    <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      role="status" aria-label="Campo válido"
      className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-white">
      <Icon name="check" size={12} />
    </motion.span>
  )
}