import { useLocation, useNavigate } from 'react-router-dom'
import { Tabs, type TabItem } from '@/shared/components/ui'

const ITEMS = [
  { value: 'horarios', label: 'Agenda y horarios' },
  { value: 'cronogramas', label: 'Historial de cronogramas' },
  { value: 'bloqueos', label: 'Bloqueos y feriados' },
] as const satisfies readonly TabItem<'horarios' | 'cronogramas' | 'bloqueos'>[]

export function ScheduleAgendaTabs() {
  const location = useLocation()
  const navigate = useNavigate()

  const value = location.pathname.includes('/bloqueos')
    ? 'bloqueos'
    : location.pathname.includes('/cronogramas')
      ? 'cronogramas'
      : 'horarios'

  return (
    <div className="mb-6">
      <Tabs
        items={ITEMS}
        value={value}
        label="Secciones de agenda"
        onChange={next => {
          if (next === 'horarios') navigate('/horarios')
          else if (next === 'cronogramas') navigate('/horarios/cronogramas')
          else navigate('/horarios/bloqueos')
        }}
      />
    </div>
  )
}

