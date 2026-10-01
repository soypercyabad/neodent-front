import type { ActivityPoint } from '../components/ActivityChart'

export const DEMO_METRICS = {
  Administrador: {
    'Pacientes totales': '368',
    'Pacientes nuevos': '42',
    'Citas atendidas': '184',
    'Servicios realizados': '216',
  },
  Recepcionista: {
    'Citas de hoy': '24',
    'Pacientes por atender': '11',
    'Pacientes nuevos': '5',
    'Citas confirmadas': '18',
  },
  Odontólogo: {
    'Mis citas de hoy': '8',
    'Pacientes atendidos': '3',
    'Próximas citas': '5',
    'Tratamientos en curso': '12',
  },
  Paciente: {
    'Mi próxima cita': '25 sep.',
    'Mis citas pendientes': '2',
  },
} as const

export const DEMO_ATTENDED: ActivityPoint[] = [
  { label: 'Lun', total: 19 },
  { label: 'Mar', total: 28 },
  { label: 'Mié', total: 24 },
  { label: 'Jue', total: 36 },
  { label: 'Vie', total: 31 },
  { label: 'Sáb', total: 46 },
]

export const DEMO_PATIENTS: ActivityPoint[] = [
  { label: 'Lun', total: 5 },
  { label: 'Mar', total: 8 },
  { label: 'Mié', total: 6 },
  { label: 'Jue', total: 9 },
  { label: 'Vie', total: 7 },
  { label: 'Sáb', total: 7 },
]

export const DEMO_SERVICES = [
  { name: 'Limpieza dental', total: 68, color: '#2878F0' },
  { name: 'Restauración', total: 51, color: '#27A36A' },
  { name: 'Ortodoncia', total: 43, color: '#8B6CEB' },
  { name: 'Endodoncia', total: 32, color: '#F0AA45' },
  { name: 'Otros', total: 22, color: '#91A4BD' },
]

export type DemoAppointment = {
  id: number
  paciente: string
  servicio: string
  odontologo: string
  hora: string
  estado: 'Confirmada' | 'Programada' | 'En atención'
}

export const DEMO_APPOINTMENTS: DemoAppointment[] = [
  {
    id: 1,
    paciente: 'María Torres',
    servicio: 'Limpieza dental',
    odontologo: 'Dra. Andrea Sotil',
    hora: '09:00',
    estado: 'Confirmada',
  },
  {
    id: 2,
    paciente: 'Carlos Mendoza',
    servicio: 'Endodoncia',
    odontologo: 'Dra. Leyni Luzon',
    hora: '09:30',
    estado: 'En atención',
  },
  {
    id: 3,
    paciente: 'Ana Ramírez',
    servicio: 'Ortodoncia',
    odontologo: 'Dra. Andrea Sotil',
    hora: '10:15',
    estado: 'Programada',
  },
  {
    id: 4,
    paciente: 'José Castillo',
    servicio: 'Restauración',
    odontologo: 'Dra. Leyni Luzon',
    hora: '11:00',
    estado: 'Confirmada',
  },
]