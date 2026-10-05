import type { IconName } from '@/shared/components/ui/Icon'
import type { Role } from '@/domain/identity'

export interface NavItem {
  label: string
  icon: IconName
  href: string
}

const DASHBOARD: NavItem = {
  label: 'Dashboard', icon: 'calendar', href: '/dashboard',
}

const ADMIN_NAV: NavItem[] = [
  DASHBOARD,
  { label: 'Citas', icon: 'citas', href: '/citas' },
  { label: 'Pacientes', icon: 'pacientes', href: '/pacientes' },
  { label: 'Personal', icon: 'user', href: '/usuarios' },
  { label: 'Horarios', icon: 'clock', href: '/horarios' },
  { label: 'Bloqueos', icon: 'calendarEdit', href: '/tipos-bloqueo' },
  { label: 'Roles', icon: 'lock', href: '/roles' },
  { label: 'Especialidades', icon: 'tooth', href: '/especialidades' },
  { label: 'Servicios', icon: 'toothCracked', href: '/servicios' },
  { label: 'Sedes', icon: 'location', href: '/sedes' },
  { label: 'Legales', icon: 'file', href: '/terminos-admin' },
]

const RECEPTION_NAV: NavItem[] = [
  DASHBOARD,
  { label: 'Citas', icon: 'citas', href: '/citas' },
  { label: 'Pacientes', icon: 'pacientes', href: '/pacientes' },
  { label: 'Horarios', icon: 'clock', href: '/horarios' },
]

const DENTIST_NAV: NavItem[] = [
  DASHBOARD,
  { label: 'Citas', icon: 'citas', href: '/citas' },
  { label: 'Pacientes', icon: 'pacientes', href: '/pacientes' },
]

const PATIENT_NAV: NavItem[] = [
  DASHBOARD,
  { label: 'Mis Citas', icon: 'citas', href: '/mis-citas' },
]

export const navItemsFor = (rol: Role): NavItem[] => {
  switch (rol) {
    case 'Administrador':
      return ADMIN_NAV
    case 'Recepcionista':
      return RECEPTION_NAV
    case 'Odontólogo':
      return DENTIST_NAV
    case 'Paciente':
      return PATIENT_NAV
    default:
      return []
  }
}

export const homeFor = (_rol: Role): string => '/dashboard'