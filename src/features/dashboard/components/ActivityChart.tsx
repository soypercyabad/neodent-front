import { motion } from 'motion/react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

export interface ActivityPoint {
  label: string
  total: number
}

interface ActivityChartProps {
  title: string
  description?: string
  data: ActivityPoint[]
  color?: string
}

export function ActivityChart({
  title,
  description,
  data,
  color = '#2878F0',
}: ActivityChartProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
    >
      <header className="mb-6">
        <h2 className="text-base font-bold text-ink">{title}</h2>

        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </header>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-center text-sm text-muted">
          Todavía no hay datos disponibles para este período.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E8EDF5"
              />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#718096', fontSize: 12 }}
              />

              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#718096', fontSize: 12 }}
              />

              <Tooltip
                cursor={{ fill: '#F1F6FF' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E8EDF5',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                }}
              />

              <Bar
                dataKey="total"
                name="Total"
                fill={color}
                radius={[6, 6, 0, 0]}
                maxBarSize={42}
                animationDuration={700}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.section>
  )
}