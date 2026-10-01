import { apiRequest } from '@/shared/api/apiClient'

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

export type SedeInput = Pick<Sede,
  'nombre' | 'direccion' | 'distrito' | 'provincia' | 'departamento' | 'telefono' | 'email'
>

export const sedesApi = {
  listar: (token: string) =>
    apiRequest<Sede[]>('/api/sedes', { accessToken: token }),

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