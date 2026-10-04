import { apiBlob, apiRequest } from '@/shared/api/apiClient'

export interface BookingService {
  id: number
  nombre: string
  descripcion: string | null
  especialidadId: number
  duracionMinutos: number | null
  precioReferencial: number | null
  destacado?: boolean
  sedeIds: number[]
}

export interface BookingBranch {
  id: number
  nombre: string
  direccion: string
}

export interface BookingSpecialist {
  odontologoEspecialidadId: number
  odontologoId: number
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  especialidadId: number
  especialidad: string
  tieneFoto: boolean
}

export interface AvailableSlot {
  horaInicio: string
  horaFin: string
}

export interface AvailabilityResponse {
  odontologoEspecialidadId: number
  sedeId: number
  servicioId: number
  fecha: string
  duracionMinutos: number
  horarios: AvailableSlot[]
}

export interface HoldResponse {
  tokenReserva: string
  fechaHoraInicio: string
  fechaHoraFin: string
  expiresAt: string
  segundosRestantes: number
  message: string
}

export interface CreatedAppointment {
  idCita: number
  pacienteId: number
  odontologoEspecialidadId: number
  sedeId: number
  servicioId: number | null
  estado: string
  fechaHoraInicio: string
  fechaHoraFin: string
  message: string
}

export interface AppointmentPage {
  contenido: CreatedAppointment[]
  pagina: number
  tamanoPagina: number
  totalElementos: number
  totalPaginas: number
  esPrimera: boolean
  esUltima: boolean
}

export const bookingApi = {
  servicios(accessToken: string) {
    return apiRequest<BookingService[]>('/api/citas/catalogo/servicios', { accessToken })
  },

  sedes(accessToken: string) {
    return apiRequest<BookingBranch[]>('/api/citas/catalogo/sedes', { accessToken })
  },

  especialistas(accessToken: string, especialidadId: number) {
    return apiRequest<BookingSpecialist[]>(
      `/api/citas/catalogo/especialistas?especialidadId=${especialidadId}`, { accessToken }
    )
  },

  disponibilidad(accessToken: string, odontologoEspecialidadId: number, sedeId: number, servicioId: number, fecha: string) {
    const query = new URLSearchParams({
      odontologoEspecialidadId: String(odontologoEspecialidadId),
      sedeId: String(sedeId),
      servicioId: String(servicioId),
      fecha,
    })

    return apiRequest<AvailabilityResponse>(`/api/citas/disponibilidad?${query}`, { accessToken })
  },

  reservar(accessToken: string, data: {
    pacienteId?: number
    odontologoEspecialidadId: number
    sedeId: number
    servicioId: number
    fechaHoraInicio: string
  }) {
    return apiRequest<HoldResponse>('/api/citas/hold', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(data),
    })
  },

  liberar(accessToken: string, tokenReserva: string, keepalive = false) {
    return apiRequest<void>('/api/citas/hold/release', {
      method: 'POST', accessToken, keepalive, body: JSON.stringify({ tokenReserva }),
    })
  },

  confirmar(accessToken: string, tokenReserva: string) {
    return apiRequest<CreatedAppointment>('/api/citas/confirm', {
      method: 'POST', accessToken, body: JSON.stringify({ tokenReserva }),
    })
  },

  misCitas(accessToken: string, pagina = 0) {
    return apiRequest<AppointmentPage>(
      `/api/citas/mis-citas?pagina=${pagina}&tamano=100`,
      { accessToken },
    )
  },

  fotoOdontologo(accessToken: string, odontologoId: number) {
    return apiBlob(`/api/odontologos/${odontologoId}/foto`, accessToken)
  },
}