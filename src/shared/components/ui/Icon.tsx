import type { SVGProps } from 'react'

/**
 * Catálogo de iconos (trazos sobre una caja de 24x24). Para añadir uno nuevo
 * basta con agregar una entrada aquí y usar <Icon name="..." />.
 */
const ICONS = {
  usuarios: <><rect x="8" y="3" width="8" height="4" rx="1" /><rect x="4" y="5" width="16" height="16" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M8.5 18c.6-1.6 1.9-2.4 3.5-2.4s2.9.8 3.5 2.4" /></>,
  citas: <><rect x="8" y="3" width="8" height="4" rx="1" /><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M12 11v5M9.5 13.5h5" /></>,
  pacientes: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 6a3 3 0 010 6M21 20c0-2.5-1.5-4.6-3.6-5.5" /></>,
  logout: <><path d="M15 12H3M7 8l-4 4 4 4" /><path d="M11 4h6a2 2 0 012 2v12a2 2 0 01-2 2h-6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  calendarEdit: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /><path d="M11 13h2M11 17h4" /></>,
  bell: <><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  printer: <><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="7" rx="1" /></>,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronUp: <path d="M18 15l-6-6-6 6" />,
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 18l6-6-6-6" />,
  arrowLeft: <><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v5M14 11v5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  kebab: <><circle cx="12" cy="5" r="1.8" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.8" fill="currentColor" stroke="none" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>,
  xCircle: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></>,
  alertCircle: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M12 12v4" /></>,
  warning: <path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />,
  spinner: <path d="M12 3a9 9 0 019 9" />,
  refreshCw: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  user: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.3 18.4c1.1-2.2 3.1-3.4 5.7-3.4s4.6 1.2 5.7 3.4" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  eyeOff: <><path d="M2 10s3.5 6 10 6 10-6 10-6" /><path d="M12 16v3M8 15.4L6.5 18M16 15.4l1.5 2.6M4.6 13.3L2.8 15.4M19.4 13.3l1.8 2.1" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  phone: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  question: <><path d="M9.2 9.3a3 3 0 115.3 2.2c-.9 1-2 1.4-2 2.8" /><path d="M12 18h.01" /></>,
  /* Servicios odontológicos */
  tooth: <path d="M12 4c-1.6 0-2.4.7-3.8.7S5.5 4 4.8 5.6c-.6 1.4-.3 3 .3 5.3.5 1.9.7 3.4.9 4.9.2 1.8.6 3.2 1.7 3.2 1.3 0 1.5-1.7 1.9-3.4.3-1.3.6-2.1 2.4-2.1s2.1.8 2.4 2.1c.4 1.7.6 3.4 1.9 3.4 1.1 0 1.5-1.4 1.7-3.2.2-1.5.4-3 .9-4.9.6-2.3.9-3.9.3-5.3C18.5 4 17.2 4.7 15.8 4.7S13.6 4 12 4z" />,
  toothCracked: <><path d="M12 4c-1.6 0-2.4.7-3.8.7S5.5 4 4.8 5.6c-.6 1.4-.3 3 .3 5.3.5 1.9.7 3.4.9 4.9.2 1.8.6 3.2 1.7 3.2 1.3 0 1.5-1.7 1.9-3.4.3-1.3.6-2.1 2.4-2.1s2.1.8 2.4 2.1c.4 1.7.6 3.4 1.9 3.4 1.1 0 1.5-1.4 1.7-3.2.2-1.5.4-3 .9-4.9.6-2.3.9-3.9.3-5.3C18.5 4 17.2 4.7 15.8 4.7S13.6 4 12 4z" /><path d="M12.6 7.2l-1.8 2.6h2.2l-1.6 2.4" /></>,
  braces: <><rect x="2.5" y="8" width="19" height="8" rx="2.5" /><path d="M7 8v8M12 8v8M17 8v8" /><circle cx="4.8" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19.2" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  forceps: <><path d="M7.5 2.5l3.4 7.2M16.5 2.5l-3.4 7.2" /><path d="M12 10c-1.2 0-2 .6-2.6 1.4-.7 1-.6 2.4-.3 3.9.3 1.4.4 3.2 1.3 3.2.8 0 1-1.4 1.6-1.4s.8 1.4 1.6 1.4c.9 0 1-1.8 1.3-3.2.3-1.5.4-2.9-.3-3.9-.6-.8-1.4-1.4-2.6-1.4z" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  chevronsUpDown: <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />,
  mapPin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  creditCard: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  idCard: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M14 9h4M14 13h4M6 16c0-1.5 1.2-2.5 3-2.5s3 1 3 2.5" /></>,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  starFilled: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none" />,
}

export type IconName = keyof typeof ICONS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  strokeWidth?: number
}

export function Icon({ name, size = 18, strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  )
}
