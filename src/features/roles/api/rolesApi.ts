import { apiRequest } from '@/shared/api/apiClient'

export interface PaginaResponse<T> {
  contenido: T[]
  pagina: number
  tamanoPagina: number
  totalElementos: number
  totalPaginas: number
  esPrimera: boolean
  esUltima: boolean
}

export interface ModuloResponse {
  id: number
  idModulo?: number
  codigo: string
  nombre: string
  descripcion?: string | null
  ruta?: string | null
  icono: string | null
  orden: number
  activo?: boolean
  idModuloPadre?: number | null
  nombreModuloPadre?: string | null
}

export interface RolModuloResponse {
  id: number
  codigo: string
  nombre: string
}

export interface RolCatalogoResponse {
  id: number
  nombre: string
}

export interface RolResponse {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  sistema: boolean
  modulos?: RolModuloResponse[]
}

export interface RolResumenEstados {
  todos: number
  activos: number
  inactivos: number
  sistema: number
  personalizados: number
}

export interface RolListarParams {
  buscar?: string
  tipo?: string
  activo?: boolean
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export interface RolRequest {
  nombre: string
  descripcion: string | null
  modulosIds?: number[]
}

export const modulosApi = {
  listar(accessToken: string) {
    return apiRequest<ModuloResponse[]>('/api/modulos', { accessToken })
  },
}

export const rolesApi = {
  catalogo(accessToken: string) {
    return apiRequest<RolCatalogoResponse[]>('/api/roles/catalogo', { accessToken })
  },

  listar(accessToken: string, activo?: boolean) {
    const query = activo === undefined ? '' : `?activo=${activo}`
    return apiRequest<RolResponse[]>(`/api/roles${query}`, { accessToken })
  },

  listarPaginado(accessToken: string, params: RolListarParams = {}) {
    const sp = new URLSearchParams()
    if (params.buscar) sp.set('buscar', params.buscar)
    if (params.tipo) sp.set('tipo', params.tipo)
    if (params.activo !== undefined) sp.set('activo', String(params.activo))
    if (params.page !== undefined) sp.set('page', String(params.page))
    if (params.size !== undefined) sp.set('size', String(params.size))
    if (params.sortBy) sp.set('sortBy', params.sortBy)
    if (params.direction) sp.set('direction', params.direction)

    const qs = sp.toString()
    return apiRequest<PaginaResponse<RolResponse> | RolResponse[]>(
      `/api/roles${qs ? `?${qs}` : ''}`,
      { accessToken },
    )
  },

  resumenEstados(accessToken: string, buscar?: string) {
    const sp = new URLSearchParams()
    if (buscar) sp.set('buscar', buscar)
    const qs = sp.toString()
    return apiRequest<RolResumenEstados>(
      `/api/roles/resumen-estados${qs ? `?${qs}` : ''}`,
      { accessToken },
    )
  },

  crear(accessToken: string, data: RolRequest) {
    return apiRequest<RolResponse>('/api/roles', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(data),
    })
  },

  actualizar(accessToken: string, id: number, data: RolRequest) {
    return apiRequest<RolResponse>(`/api/roles/${id}`, {
      method: 'PUT',
      accessToken,
      body: JSON.stringify(data),
    })
  },

  activar(accessToken: string, id: number) {
    return apiRequest<RolResponse>(`/api/roles/${id}/activar`, {
      method: 'PATCH',
      accessToken,
    })
  },

  desactivar(accessToken: string, id: number) {
    return apiRequest<RolResponse>(`/api/roles/${id}/desactivar`, {
      method: 'PATCH',
      accessToken,
    })
  },
}