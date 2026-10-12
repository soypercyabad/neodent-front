import { apiRequest } from '@/shared/api/apiClient'

export interface Servicio {
  id: number
  especialidadId: number
  especialidadNombre: string
  nombre: string
  descripcion: string | null
  duracionMinutos: number
  precioReferencial: number | null
  activo: boolean
  destacado?: boolean
  sedeIds: number[]
}

export interface ServicioInput {
  especialidadId: number
  nombre: string
  descripcion: string | null
  duracionMinutos: number
  precioReferencial: number | null
  destacado?: boolean
  sedeIds: number[]
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

export interface ServicioResumenEstados {
  todos: number
  destacados: number
  activos: number
  inactivos: number
}

export interface ServicioListarParams {
  buscar?: string
  especialidadId?: number
  sedeId?: number
  activo?: boolean
  destacado?: boolean
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export interface EspecialidadOption {
  id: number
  nombre: string
  activo: boolean
}

export const serviciosApi = {
  listar(token: string) {
    return apiRequest<Servicio[]>('/api/servicios', { accessToken: token })
  },

  listarPaginado(token: string, params: ServicioListarParams = {}) {
    const sp = new URLSearchParams()
    if (params.buscar) sp.set('buscar', params.buscar)
    if (params.especialidadId) sp.set('especialidadId', String(params.especialidadId))
    if (params.sedeId) sp.set('sedeId', String(params.sedeId))
    if (params.activo !== undefined) sp.set('activo', String(params.activo))
    if (params.destacado !== undefined) sp.set('destacado', String(params.destacado))
    if (params.page !== undefined) sp.set('page', String(params.page))
    if (params.size !== undefined) sp.set('size', String(params.size))
    if (params.sortBy) sp.set('sortBy', params.sortBy)
    if (params.direction) sp.set('direction', params.direction)

    const qs = sp.toString()
    return apiRequest<PaginaResponse<Servicio> | Servicio[]>(
      `/api/servicios${qs ? `?${qs}` : ''}`,
      { accessToken: token }
    )
  },

  resumenEstados(token: string, params: { buscar?: string; especialidadId?: number; sedeId?: number } = {}) {
    const sp = new URLSearchParams()
    if (params.buscar) sp.set('buscar', params.buscar)
    if (params.especialidadId) sp.set('especialidadId', String(params.especialidadId))
    if (params.sedeId) sp.set('sedeId', String(params.sedeId))

    const qs = sp.toString()
    return apiRequest<ServicioResumenEstados>(
      `/api/servicios/resumen-estados${qs ? `?${qs}` : ''}`,
      { accessToken: token }
    )
  },

  crear(token: string, data: ServicioInput) {
    return apiRequest<Servicio>('/api/servicios', {
      method: 'POST', accessToken: token, body: JSON.stringify(data),
    })
  },

  actualizar(token: string, id: number, data: ServicioInput) {
    return apiRequest<Servicio>(`/api/servicios/${id}`, {
      method: 'PUT', accessToken: token, body: JSON.stringify(data),
    })
  },

  cambiarEstado(token: string, id: number, activo: boolean) {
    return apiRequest<Servicio>(`/api/servicios/${id}/estado`, {
      method: 'PATCH', accessToken: token, body: JSON.stringify({ activo }),
    })
  },

  alternarDestacado(token: string, id: number) {
    return apiRequest<Servicio>(`/api/servicios/${id}/destacado`, {
      method: 'PATCH', accessToken: token,
    })
  },

  especialidades(token: string) {
    return apiRequest<EspecialidadOption[]>('/api/especialidades/admin', { accessToken: token })
  },
}