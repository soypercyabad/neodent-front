import { useLocation, useNavigate } from 'react-router-dom'
import { Tabs, type TabItem } from '@/shared/components/ui'

const ITEMS = [
  { value: 'horarios', label: 'Agenda y horarios' },
  { value: 'bloqueos', label: 'Bloqueos y feriados' },
] as const satisfies readonly TabItem<'horarios' | 'bloqueos'>[]

export function ScheduleAgendaTabs() {
  const location = useLocation()
  const navigate = useNavigate()

  const value = location.pathname.includes('/bloqueos') ? 'bloqueos' : 'horarios'

  return (
    <div className="mb-6">
      <Tabs
        items={ITEMS}
        value={value}
        label="Secciones de agenda"
        onChange={next => navigate(next === 'horarios' ? '/horarios' : '/horarios/bloqueos')}
      />
    </div>
  )
}

