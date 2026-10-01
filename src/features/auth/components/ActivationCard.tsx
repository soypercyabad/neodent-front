import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Card, Icon } from '@/shared/components/ui'

type ActivationCardProps = {
  title: string
  description?: ReactNode
  children?: ReactNode
  status?: 'success' | 'error'
}

export function ActivationCard({
  title,
  description,
  children,
  status,
}: ActivationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="flex min-h-[400px] flex-col justify-center rounded-[20px] border border-line bg-surface px-8 py-12 shadow-sm sm:px-10">
        <div className="text-center">
          {status && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className={`mx-auto mb-5 grid size-12 place-items-center rounded-full text-white ${
                status === 'success' ? 'bg-success' : 'bg-danger'
              }`}
            >
              {status === 'success'
                ? <Icon name="check" size={24} />
                : <span className="text-2xl leading-none">×</span>}
            </motion.div>
          )}

          <h1 className="text-[1.35rem] font-bold text-ink">
            {title}
          </h1>

          {description && (
            <p className="mx-auto mt-2 max-w-[330px] text-sm leading-relaxed text-muted">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="mt-8">
            {children}
          </div>
        )}
      </Card>
    </motion.div>
  )
}