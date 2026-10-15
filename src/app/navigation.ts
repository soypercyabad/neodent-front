import type { IconName } from '@/shared/components/ui/Icon'
import type { Role, UserModulo } from '@/domain/identity'

export interface NavItem {
  label: string
  icon: IconName
  href: string
}

export const MODULE_NAV_MAP: Record<string, NavItem> = {
  DASHBOARD: { label: 'Dashboard', icon: 'calendar', href: '/dashboard' },
  CITAS: { label: 'Citas', icon: 'citas', href: '/citas' },
  PACIENTES: { label: 'Pacientes', icon: 'pacientes', href: '/pacientes' },
  PERSONAL: { label: 'Personal', icon: 'user', href: '/usuarios' },
  HORARIOS: { label: 'Horarios', icon: 'clock', href: '/horarios' },
  ROLES: { label: 'Roles', icon: 'lock', href: '/roles' },
  MODULOS: { label: 'Módulos', icon: 'menu', href: '/modulos' },
  SEDES: { label: 'Sedes', icon: 'location', href: '/sedes' },
  ESPECIALIDADES: { label: 'Especialidades', icon: 'tooth', href: '/especialidades' },
  SERVICIOS: { label: 'Servicios', icon: 'toothCracked', href: '/servicios' },
  LEGALES: { label: 'Documentos Legales', icon: 'file', href: '/documentos-legales' },
  MIS_CITAS: { label: 'Mis Citas', icon: 'citas', href: '/mis-citas' },
  NOTIFICACIONES: { label: 'Recordatorios', icon: 'bell', href: '/configuracion/recordatorios' },
}


export const navItemsFor = (_rol: Role, modulos?: UserModulo[]): NavItem[] => {
  if (!modulos || modulos.length === 0) {
    return []
  }

  const sorted = [...modulos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const items: NavItem[] = []
  for (const m of sorted) {
    const mapped = MODULE_NAV_MAP[m.codigo]
    const item: NavItem = {
      label: m.nombre || mapped?.label || m.codigo,
      icon: (m.icono as IconName) || mapped?.icon || 'file',
      href: m.ruta || mapped?.href || '#',
    }
    if (!items.some(it => it.href === item.href)) {
      items.push(item)
    }
  }
  return items
}

export const homeFor = (_rol: Role): string => '/dashboard'