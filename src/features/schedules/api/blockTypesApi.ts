import { apiRequest } from '@/shared/api/apiClient'

export interface BlockType {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  requiereOdontologo: boolean
  requiereSede: boolean
  permiteOdontologo: boolean
  permiteSede: boolean
  activo: boolean
  fechaCreacion: string | null
  fechaActualizacion: string | null
}

export interface BlockTypeInput {
  codigo: string
  nombre: string
  descripcion: string | null
  requiereOdontologo: boolean
  requiereSede: boolean
  permiteOdontologo: boolean
  permiteSede: boolean
}

export const blockTypesApi = {
  listarActivos(token: string) {
    return apiRequest<BlockType[]>('/api/tipos-bloqueo', { accessToken: token })
  },

  listarTodos(token: string) {
    return apiRequest<BlockType[]>('/api/tipos-bloqueo/admin', { accessToken: token })
  },

  crear(token: string, data: BlockTypeInput) {
    return apiRequest<BlockType>('/api/tipos-bloqueo', {
      method: 'POST',
      accessToken: token,
      body: JSON.stringify(data),
    })
  },

  actualizar(token: string, id: number, data: BlockTypeInput) {
    return apiRequest<BlockType>(`/api/tipos-bloqueo/${id}`, {
      method: 'PUT',
      accessToken: token,
      body: JSON.stringify(data),
    })
  },

  cambiarEstado(token: string, id: number, activo: boolean) {
    return apiRequest<BlockType>(`/api/tipos-bloqueo/${id}/estado`, {
      method: 'PATCH',
      accessToken: token,
      body: JSON.stringify({ activo }),
    })
  },
}