import { apiRequest } from '@/shared/api/apiClient'

export interface PacienteResponse {
  id: number
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  fechaNacimiento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
  usuarioId: number | null
  tieneCuenta: boolean
  fechaCreacion: string | null
  fechaActualizacion: string | null
}

export interface PaginaResponse<T> {
  contenido: T[]
  pagina: number
  tamanoPagina: number
  totalElementos: number
  totalPaginas: number
  esPrimera: boolean
  esUltima: boolean
}

export interface CrearPacienteRequest {
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  fechaNacimiento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
}

export interface ActualizarPacienteRequest {
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  fechaNacimiento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
}

export interface DniResponse {
  dni?: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
}

export const patientsApi = {
  listar(accessToken: string, params: {
    buscar?: string
    activo?: boolean
    conCuenta?: boolean
    page: number
    size: number
  }) {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
      sortBy: 'id',
      direction: 'desc',
    })

    if (params.buscar?.trim()) query.set('buscar', params.buscar.trim())
    if (params.activo !== undefined) query.set('activo', String(params.activo))
    if (params.conCuenta !== undefined) query.set('conCuenta', String(params.conCuenta))

    return apiRequest<PaginaResponse<PacienteResponse>>(`/api/pacientes?${query}`, {
      accessToken,
    })
  },

  obtener(accessToken: string, id: number) {
    return apiRequest<PacienteResponse>(`/api/pacientes/${id}`, {
      accessToken,
    })
  },

  buscarPorDocumento(accessToken: string, tipoDocumento: string,numeroDocumento: string,) {
    return apiRequest<PacienteResponse>(`/api/pacientes/documento/${
      encodeURIComponent(tipoDocumento)}/${encodeURIComponent(numeroDocumento)}`,
      { accessToken },
    )
  },

  crear(accessToken: string, data: CrearPacienteRequest) {
    return apiRequest<PacienteResponse>('/api/pacientes', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(data),
    })
  },

  actualizar(accessToken: string, id: number, data: ActualizarPacienteRequest) {
    return apiRequest<PacienteResponse>(`/api/pacientes/${id}`, {
      method: 'PUT',
      accessToken,
      body: JSON.stringify(data),
    })
  },

  activar(accessToken: string, id: number) {
    return apiRequest<void>(`/api/pacientes/${id}/activar`, {
      method: 'PATCH',
      accessToken,
    })
  },

  desactivar(accessToken: string, id: number) {
    return apiRequest<void>(`/api/pacientes/${id}/desactivar`, {
      method: 'PATCH',
      accessToken,
    })
  },

  reenviarInvitacion(accessToken: string, id: number) {
    return apiRequest<void>(`/api/pacientes/${id}/reenviar-invitacion`, {
      method: 'POST',
      accessToken,
    })
  },

  consultarDni(accessToken: string, dni: string) {
    return apiRequest<DniResponse>(`/api/dni/${dni}`, {
      accessToken,
    })
  },
}