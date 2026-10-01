import { Avatar, Badge, Card, Icon, InfoRow, StatusDot } from '@/shared/components/ui'
import { useAuth } from '../model/useAuth'
import { roleTone } from '@/domain'
import { fullName } from '@/shared/lib/people'

export function MyProfilePage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado del perfil */}
      <Card className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className="relative shrink-0">
            <Avatar
              nombre={user.nombre}
              apellido={user.apellido}
              //seed={avatarSeed(user.id)}
              size={110}
              animate="always"
              trackCursor
              className="ring-4 ring-brand-soft shadow-md"
            />

            <span
              title={
                user.activo
                  ? 'Cuenta activa'
                  : 'Cuenta inactiva'
              }
              className={`absolute bottom-1 right-1 size-5 rounded-full border-2 border-surface ${
                user.activo ? 'bg-success' : 'bg-danger'
              }`}
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <h1 className="break-words text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {fullName(user)}
              </h1>

              <Badge tone={roleTone[user.rol]}>
                {user.rol}
              </Badge>
            </div>

            <p className="mt-2 break-all text-ink-soft">
              {user.correo}
            </p>

            <div className="mt-4 flex justify-center sm:justify-start">
              <StatusDot on={user.activo}>
                {user.activo
                  ? 'Cuenta activa'
                  : 'Cuenta inactiva'}
              </StatusDot>
            </div>
          </div>
        </div>
      </Card>

      {/* Información del usuario autenticado */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
            <Icon
              name="usuarios"
              size={20}
              className="text-brand"
            />

            Información de la cuenta
          </h2>

          <InfoRow
            label="Nombre completo"
            value={fullName(user)}
          />

          <InfoRow
            label="Correo electrónico"
            value={user.correo}
          />

          <InfoRow
            label="Rol en el sistema"
            value={
              <Badge tone={roleTone[user.rol]}>
                {user.rol}
              </Badge>
            }
          />
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-ink">
            <Icon
              name="file"
              size={20}
              className="text-brand"
            />

            Seguridad y sesión
          </h2>

          <InfoRow
            label="Estado del acceso"
            value={
              <StatusDot on={user.activo}>
                {user.activo
                  ? 'Permitido'
                  : 'No permitido'}
              </StatusDot>
            }
          />

          <InfoRow
            label="Método de acceso"
            value="Correo y contraseña"
          />

          <InfoRow
            label="Verificación adicional"
            value="Código de seguridad por correo"
          />
        </Card>
      </div>
    </div>
  )
}