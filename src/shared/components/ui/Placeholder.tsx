import { Card } from './Card'
import { Icon } from './Icon'
import { PageHead } from './PageHead'

/** Pantalla aún no implementada. Deja la ruta reservada y navegable. */
export function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <PageHead title={title} description={description} />
      <Card className="grid place-items-center gap-3 px-6 py-20 text-center text-muted">
        <Icon name="warning" size={28} />
        <p className="text-[0.95rem]">Esta pantalla todavía no está implementada.</p>
      </Card>
    </>
  )
}
