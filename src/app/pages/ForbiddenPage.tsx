import { ErrorPage } from '@/shared/components/ui'

export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="No tienes acceso a esta página"
      description="No cuentas con los permisos necesarios para acceder a esta sección. Puedes regresar al inicio o comunicarte con el administrador si necesitas acceder."
    />
  )
}