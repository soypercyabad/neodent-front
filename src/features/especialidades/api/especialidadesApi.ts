import { apiRequest } from '@/shared/api/apiClient'

export interface Especialidad {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
}

export interface EspecialidadInput {
  nombre: string
  descripcion: string | null
}

export const especialidadesApi = {
  listar(token: string) {
    return apiRequest<Especialidad[]>('/api/especialidades/admin', { accessToken: token })
  },

  obtener(token: string, id: number) {
    return apiRequest<Especialidad>(`/api/especialidades/admin/${id}`, { accessToken: token })
  },

  crear(token: string, data: EspecialidadInput) {
    return apiRequest<Especialidad>('/api/especialidades', {
      method: 'POST', accessToken: token, body: JSON.stringify(data),
    })
  },

  actualizar(token: string, id: number, data: EspecialidadInput) {
    return apiRequest<Especialidad>(`/api/especialidades/${id}`, {
      method: 'PUT', accessToken: token, body: JSON.stringify(data),
    })
  },

  cambiarEstado(token: string, id: number, activo: boolean) {
    return apiRequest<Especialidad>(`/api/especialidades/${id}/estado`, {
      method: 'PATCH', accessToken: token, body: JSON.stringify({ activo }),
    })
  },
}