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

export interface Sede {
  id: number
  nombre: string
  direccion: string
  distrito: string | null
  provincia: string | null
  departamento: string | null
  telefono: string | null
  email: string | null
  activo: boolean
  fechaCreacion: string | null
}

export interface SedeCatalogo {
  id: number
  nombre: string
  distrito: string | null
  activo: boolean
}

export interface SedeResumenEstados {
  todas: number
  activas: number
  inactivas: number
}

export interface SedeListarParams {
  buscar?: string
  activo?: boolean
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export type SedeInput = Pick<Sede,
  'nombre' | 'direccion' | 'distrito' | 'provincia' | 'departamento' | 'telefono' | 'email'
>

export const sedesApi = {
  catalogo: (token?: string) =>
    apiRequest<SedeCatalogo[]>('/api/sedes/catalogo', { accessToken: token }),

  listar: (token: string) =>
    apiRequest<Sede[]>('/api/sedes', { accessToken: token }),

  listarPaginado: (token: string, params: SedeListarParams = {}) => {
    const sp = new URLSearchParams()
    if (params.buscar) sp.set('buscar', params.buscar)
    if (params.activo !== undefined) sp.set('activo', String(params.activo))
    if (params.page !== undefined) sp.set('page', String(params.page))
    if (params.size !== undefined) sp.set('size', String(params.size))
    if (params.sortBy) sp.set('sortBy', params.sortBy)
    if (params.direction) sp.set('direction', params.direction)

    const qs = sp.toString()
    return apiRequest<PaginaResponse<Sede> | Sede[]>(
      `/api/sedes${qs ? `?${qs}` : ''}`,
      { accessToken: token },
    )
  },

  resumenEstados: (token: string, buscar?: string) => {
    const sp = new URLSearchParams()
    if (buscar) sp.set('buscar', buscar)
    const qs = sp.toString()
    return apiRequest<SedeResumenEstados>(
      `/api/sedes/resumen-estados${qs ? `?${qs}` : ''}`,
      { accessToken: token },
    )
  },

  obtener: (token: string, id: number) =>
    apiRequest<Sede>(`/api/sedes/${id}`, { accessToken: token }),

  crear: (token: string, data: SedeInput) =>
    apiRequest<Sede>('/api/sedes', { method: 'POST', accessToken: token, body: JSON.stringify(data) }),

  actualizar: (token: string, id: number, data: SedeInput) =>
    apiRequest<Sede>(`/api/sedes/${id}`, { method: 'PUT', accessToken: token, body: JSON.stringify(data) }),

  cambiarEstado: (token: string, id: number, activo: boolean) =>
    apiRequest<Sede>(`/api/sedes/${id}/estado`, {
      method: 'PATCH', accessToken: token, body: JSON.stringify({ activo }),
    }),
}