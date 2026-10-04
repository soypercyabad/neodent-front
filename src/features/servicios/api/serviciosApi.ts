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

export interface EspecialidadOption {
  id: number
  nombre: string
  activo: boolean
}

export const serviciosApi = {
  listar(token: string) {
    return apiRequest<Servicio[]>('/api/servicios', { accessToken: token })
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