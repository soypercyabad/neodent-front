import { apiRequest } from '@/shared/api/apiClient'

export interface RolResponse {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  sistema: boolean
}

export interface RolRequest {
  nombre: string
  descripcion: string | null
}

export const rolesApi = {
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