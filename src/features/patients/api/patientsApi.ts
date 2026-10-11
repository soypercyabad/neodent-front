import { apiRequest } from '@/shared/api/apiClient'

/** Resumen de paciente optimizado para listados y tablas (arquitectura limpia) */
export interface PacienteResumenResponse {
  id: number
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  telefono: string | null
  email: string | null
  activo: boolean
  tieneCuenta: boolean
  estadoCuenta: string | null
  origenRegistro?: 'AUTORREGISTRO' | 'RECEPCION' | null
  sedeRegistroNombre?: string | null
  fechaCreacion: string | null
}

/** Información detallada y completa del paciente */
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
  estadoCuenta: string | null
  correoVerificado: boolean | null
  origenRegistro?: 'AUTORREGISTRO' | 'RECEPCION' | null
  sedeRegistroId?: number | null
  sedeRegistroNombre?: string | null
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
  sedeId?: number | null
  origenRegistro?: 'AUTORREGISTRO' | 'RECEPCION' | null
}

export interface ActualizarPacienteRequest {
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  fechaNacimiento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  sedeId?: number | null
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
    origen?: string
    sedeId?: string | number
    sortBy?: string
    direction?: string
    page: number
    size: number
  }) {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
      sortBy: params.sortBy || 'id',
      direction: params.direction || 'desc',
    })

    if (params.buscar?.trim()) query.set('buscar', params.buscar.trim())
    if (params.activo !== undefined) query.set('activo', String(params.activo))
    if (params.conCuenta !== undefined) query.set('conCuenta', String(params.conCuenta))
    if (params.origen?.trim()) query.set('origen', params.origen.trim())
    if (params.sedeId !== undefined && params.sedeId !== null && params.sedeId !== '') {
      query.set('sedeId', String(params.sedeId))
    }

    return apiRequest<PaginaResponse<PacienteResumenResponse>>(`/api/pacientes?${query}`, {
      accessToken,
    })
  },

  obtener(accessToken: string, id: number) {
    return apiRequest<PacienteResponse>(`/api/pacientes/${id}`, {
      accessToken,
    })
  },

  buscarPorDocumento(
    accessToken: string,
    tipoDocumento: string,
    numeroDocumento: string,
  ) {
    return apiRequest<PacienteResponse>(
      `/api/pacientes/documento/${encodeURIComponent(tipoDocumento)}/${encodeURIComponent(numeroDocumento)}`,
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