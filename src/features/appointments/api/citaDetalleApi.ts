import { apiRequest } from '@/shared/api/apiClient'
import type { CreatedAppointment } from './bookingApi'

export interface DetalleCita {
  idCita: number

  pacienteId: number
  pacienteNombre: string
  pacienteTipoDocumento: string
  pacienteNumeroDocumento: string
  pacienteTelefono: string | null
  pacienteCorreo: string | null

  odontologoEspecialidadId: number
  odontologoId: number
  odontologoNombre: string
  especialidadNombre: string

  sedeId: number
  sedeNombre: string
  sedeDireccion: string

  servicioId: number | null
  servicioNombre: string
  servicioDescripcion: string | null
  duracionMinutos: number | null
  precioReferencial: number | null

  estado: string
  fechaHoraInicio: string
  fechaHoraFin: string

  motivo: string | null
  observaciones: string | null
  confirmadaEn: string | null

  creadoPor: string
  fechaCreacion: string | null
  fechaActualizacion: string | null
}

export interface HistorialCita {
  id: number
  accion: string
  estadoAnterior: string | null
  estadoNuevo: string | null
  fechaHoraAnterior: string | null
  fechaHoraNueva: string | null
  motivo: string | null
  realizadoPor: string
  fechaCreacion: string
}

export interface AgendaParams {
  page?: number
  size?: number
  fecha?: string
  estado?: string
  vista?: string
  buscar?: string
  odontologoId?: number
  sedeId?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export interface CitaResumen {
  idCita: number
  pacienteId: number
  pacienteNombre: string
  pacienteTelefono: string | null
  pacienteNumeroDocumento: string | null
  odontologoNombre: string
  especialidadNombre: string
  sedeNombre: string | null
  servicioNombre: string
  fechaHoraInicio: string
  fechaHoraFin: string
  duracionMinutos: number | null
  estado: string
}

export interface PaginaAgendaDetalle {
  contenido: CitaResumen[]
  pagina: number
  tamanoPagina: number
  totalElementos: number
  totalPaginas: number
  esPrimera: boolean
  esUltima: boolean
}

export const citaDetalleApi = {
  detalle(token: string, id: number) {
    return apiRequest<DetalleCita>(
      `/api/citas/detalle/${id}`,
      { accessToken: token },
    )
  },

  agenda(token: string, params?: AgendaParams | string) {
    if (typeof params === 'string') {
      const query = params ? `?fecha=${params}` : ''
      return apiRequest<PaginaAgendaDetalle>(
        `/api/citas/agenda-detalle${query}`,
        { accessToken: token },
      )
    }

    const q = new URLSearchParams()
    if (params?.page !== undefined) q.set('page', String(params.page))
    if (params?.size !== undefined) q.set('size', String(params.size))
    if (params?.fecha) q.set('fecha', params.fecha)
    if (params?.estado) q.set('estado', params.estado)
    if (params?.vista) q.set('vista', params.vista)
    if (params?.buscar) q.set('buscar', params.buscar)
    if (params?.odontologoId) q.set('odontologoId', String(params.odontologoId))
    if (params?.sedeId) q.set('sedeId', String(params.sedeId))
    if (params?.sortBy) q.set('sortBy', params.sortBy)
    if (params?.direction) q.set('direction', params.direction)

    const query = q.toString() ? `?${q.toString()}` : ''
    return apiRequest<PaginaAgendaDetalle>(
      `/api/citas/agenda-detalle${query}`,
      { accessToken: token },
    )
  },

  historial(token: string, id: number) {
    return apiRequest<HistorialCita[]>(
      `/api/citas/${id}/historial`,
      { accessToken: token },
    )
  },

  confirmarAsistencia(token: string, id: number) {
    return apiRequest<CreatedAppointment>(
      `/api/citas/${id}/confirmar-asistencia`,
      {
        method: 'PUT',
        accessToken: token,
      },
    )
  },

  cancelar(token: string, id: number, motivo: string) {
    return apiRequest<CreatedAppointment>(
      `/api/citas/${id}/cancelar`,
      {
        method: 'PUT',
        accessToken: token,
        body: JSON.stringify({ motivo }),
      },
    )
  },

  noAsistio(token: string, id: number, motivo?: string) {
    return apiRequest<CreatedAppointment>(
      `/api/citas/${id}/no-asistio`,
      {
        method: 'PUT',
        accessToken: token,
        body: JSON.stringify({
          motivo: motivo?.trim() || null,
        }),
      },
    )
  },

  iniciarAtencion(token: string, id: number) {
    return apiRequest<CreatedAppointment>(
      `/api/citas/${id}/iniciar-atencion`,
      {
        method: 'PUT',
        accessToken: token,
      },
    )
  },

  finalizarAtencion(token: string, id: number) {
    return apiRequest<CreatedAppointment>(
      `/api/citas/${id}/finalizar-atencion`,
      {
        method: 'PUT',
        accessToken: token,
      },
    )
  },

  reprogramar(
    token: string,
    id: number,
    fechaHoraInicio: string,
    motivo?: string,
  ) {
    return apiRequest<CreatedAppointment>(
      `/api/citas/${id}/reprogramar`,
      {
        method: 'PUT',
        accessToken: token,
        body: JSON.stringify({
          fechaHoraInicio,
          motivo: motivo?.trim() || null,
        }),
      },
    )
  },
}