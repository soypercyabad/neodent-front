import { roleTone, type Role } from './identity'
import { Badge } from '@/shared/components/ui'

export interface RoleBadgeProps {
  role: Role
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return <Badge tone={roleTone[role]}>{role}</Badge>
}
