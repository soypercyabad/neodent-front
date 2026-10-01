import { ErrorPage } from '@/shared/components/ui'

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Parece que esta página se perdió"
      description="No encontramos la dirección que estás buscando. Es posible que haya cambiado, que ya no exista o que el enlace sea incorrecto."
    />
  )
}