import type { IconName } from '@/shared/components/ui/Icon'
import type { Role, UserModulo } from '@/domain/identity'

export interface NavSingleItem {
  type: 'item'
  id: number | string
  label: string
  icon: IconName
  href: string
}

export interface NavGroupItem {
  type: 'group'
  id: number | string
  label: string
  icon: IconName
  items: NavSingleItem[]
}

export type NavEntry = NavSingleItem | NavGroupItem

export type NavItem = NavEntry

export const MODULE_NAV_MAP: Record<string, { label: string; icon: IconName; href: string }> = {
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
  CONFIGURACION: { label: 'Configuración', icon: 'settings', href: '/configuracion' },
}

// Módulos que por defecto se agrupan en Configuración si la BD aún no tiene id_modulo_padre
const DEFAULT_CONFIG_MODULES = new Set([
  'PERSONAL',
  'ROLES',
  'MODULOS',
  'SEDES',
  'ESPECIALIDADES',
  'SERVICIOS',
  'LEGALES',
  'NOTIFICACIONES',
])

export const navItemsFor = (_rol: Role, modulos?: UserModulo[]): NavEntry[] => {
  if (!modulos || modulos.length === 0) {
    return []
  }

  const sorted = [...modulos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  // 1. Verificar si en la base de datos ya hay módulos con idModuloPadre definido
  const tieneJerarquiaDB = sorted.some(m => m.idModuloPadre != null && m.idModuloPadre > 0)

  if (tieneJerarquiaDB) {
    // ---- MODO 100% DINÁMICO POR BD (idModuloPadre) ----
    const modulosPadre = sorted.filter(m => !m.idModuloPadre)
    const modulosHijos = sorted.filter(m => m.idModuloPadre != null && m.idModuloPadre > 0)

    const result: NavEntry[] = []

    for (const padre of modulosPadre) {
      const padreId = padre.id ?? padre.idModulo
      const mapped = MODULE_NAV_MAP[padre.codigo]
      const label = padre.nombre || mapped?.label || padre.codigo
      const icon = (padre.icono as IconName) || mapped?.icon || 'folder'
      const href = padre.ruta || mapped?.href || '#'

      // Buscar si este padre tiene hijos asignados al usuario
      const hijos = modulosHijos.filter(h => (h.idModuloPadre === padreId || h.idModuloPadre === padre.id))

      if (hijos.length > 0) {
        // Es un grupo con submenú
        result.push({
          type: 'group',
          id: padreId || padre.codigo,
          label,
          icon,
          items: hijos.map(h => {
            const hMapped = MODULE_NAV_MAP[h.codigo]
            return {
              type: 'item',
              id: h.id ?? h.idModulo ?? h.codigo,
              label: h.nombre || hMapped?.label || h.codigo,
              icon: (h.icono as IconName) || hMapped?.icon || 'file',
              href: h.ruta || hMapped?.href || '#',
            }
          }),
        })
      } else {
        // Es un módulo normal sin hijos
        result.push({
          type: 'item',
          id: padreId || padre.codigo,
          label,
          icon,
          href,
        })
      }
    }

    // Agregar cualquier hijo huérfano (cuyo padre no esté asignado al usuario)
    for (const h of modulosHijos) {
      const estaEnGrupo = result.some(
        r => r.type === 'group' && r.items.some(child => (child.id === (h.id ?? h.idModulo) || child.href === h.ruta))
      )
      if (!estaEnGrupo) {
        const hMapped = MODULE_NAV_MAP[h.codigo]
        result.push({
          type: 'item',
          id: h.id ?? h.idModulo ?? h.codigo,
          label: h.nombre || hMapped?.label || h.codigo,
          icon: (h.icono as IconName) || hMapped?.icon || 'file',
          href: h.ruta || hMapped?.href || '#',
        })
      }
    }

    return result
  }

  // ---- MODO FALLBACK (antes de ejecutar la migración en MySQL) ----
  const singleItems: NavSingleItem[] = []
  const configItems: NavSingleItem[] = []

  for (const m of sorted) {
    if (m.codigo === 'CONFIGURACION') continue

    const mapped = MODULE_NAV_MAP[m.codigo]
    const item: NavSingleItem = {
      type: 'item',
      id: m.id ?? m.idModulo ?? m.codigo,
      label: m.nombre || mapped?.label || m.codigo,
      icon: (m.icono as IconName) || mapped?.icon || 'file',
      href: m.ruta || mapped?.href || '#',
    }

    if (DEFAULT_CONFIG_MODULES.has(m.codigo)) {
      if (!configItems.some(it => it.href === item.href)) {
        configItems.push(item)
      }
    } else {
      if (!singleItems.some(it => it.href === item.href)) {
        singleItems.push(item)
      }
    }
  }

  const result: NavEntry[] = [...singleItems]

  if (configItems.length > 0) {
    result.push({
      type: 'group',
      id: 'configuracion',
      label: 'Configuración',
      icon: 'settings',
      items: configItems,
    })
  }

  return result
}

export const homeFor = (_rol: Role): string => '/dashboard'