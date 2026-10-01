import { apiRequest } from '@/shared/api/apiClient'

export interface TipoDocumentoOption {
  id: number
  codigo: string
  nombre: string
  longitudMin: number
  longitudMax: number
}

export const documentTypesApi = {
  listar() {
    return apiRequest<TipoDocumentoOption[]>(
      '/api/auth/tipos-documento',
      { method: 'GET' }
    )
  },
}