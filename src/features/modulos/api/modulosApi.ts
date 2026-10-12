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

export interface ModuloItem {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  ruta: string
  icono: string
  orden: number
  activo: boolean
}

export interface ModuloInput {
  codigo: string
  nombre: string
  descripcion: string | null
  ruta: string
  icono: string
  orden: number
}

export interface ModuloResumenEstados {
  todos: number
  activos: number
  inactivos: number
}

export interface ModuloListarParams {
  buscar?: string
  activo?: boolean
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export const modulosApi = {
  listar(accessToken: string, activo?: boolean) {
    const query = activo === undefined ? '' : `?activo=${activo}`
    return apiRequest<ModuloItem[]>(`/api/modulos${query}`, { accessToken })
  },

  listarPaginado(accessToken: string, params: ModuloListarParams = {}) {
    const sp = new URLSearchParams()
    if (params.buscar) sp.set('buscar', params.buscar)
    if (params.activo !== undefined) sp.set('activo', String(params.activo))
    if (params.page !== undefined) sp.set('page', String(params.page))
    if (params.size !== undefined) sp.set('size', String(params.size))
    if (params.sortBy) sp.set('sortBy', params.sortBy)
    if (params.direction) sp.set('direction', params.direction)

    const qs = sp.toString()
    return apiRequest<PaginaResponse<ModuloItem> | ModuloItem[]>(
      `/api/modulos${qs ? `?${qs}` : ''}`,
      { accessToken },
    )
  },

  resumenEstados(accessToken: string, buscar?: string) {
    const sp = new URLSearchParams()
    if (buscar) sp.set('buscar', buscar)
    const qs = sp.toString()
    return apiRequest<ModuloResumenEstados>(
      `/api/modulos/resumen-estados${qs ? `?${qs}` : ''}`,
      { accessToken },
    )
  },

  obtener(accessToken: string, id: number) {
    return apiRequest<ModuloItem>(`/api/modulos/${id}`, { accessToken })
  },

  crear(accessToken: string, data: ModuloInput) {
    return apiRequest<ModuloItem>('/api/modulos', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(data),
    })
  },

  actualizar(accessToken: string, id: number, data: ModuloInput) {
    return apiRequest<ModuloItem>(`/api/modulos/${id}`, {
      method: 'PUT',
      accessToken,
      body: JSON.stringify(data),
    })
  },

  activar(accessToken: string, id: number) {
    return apiRequest<ModuloItem>(`/api/modulos/${id}/activar`, {
      method: 'PATCH',
      accessToken,
    })
  },

  desactivar(accessToken: string, id: number) {
    return apiRequest<ModuloItem>(`/api/modulos/${id}/desactivar`, {
      method: 'PATCH',
      accessToken,
    })
  },
}
