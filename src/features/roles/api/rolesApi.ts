import { apiRequest } from '@/shared/api/apiClient'

export interface ModuloResponse {
  id: number
  idModulo?: number
  codigo: string
  nombre: string
  icono: string | null
  orden: number
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