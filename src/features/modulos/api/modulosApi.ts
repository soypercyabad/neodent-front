import { apiRequest } from '@/shared/api/apiClient'

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

export const modulosApi = {
  listar(accessToken: string, activo?: boolean) {
    const query = activo === undefined ? '' : `?activo=${activo}`
    return apiRequest<ModuloItem[]>(`/api/modulos${query}`, { accessToken })
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
