import { apiRequest } from '@/shared/api/apiClient'

export interface NotificacionItem {
  id: number
  tipo: 'RECORDATORIO_CITA' | 'CANCELACION_CITA' | 'CONFIRMACION_CITA' | 'REPROGRAMACION_CITA' | 'SISTEMA' | string
  titulo: string
  mensaje: string
  enlace?: string | null
  referenciaTipo?: string | null
  referenciaId?: number | null
  leida: boolean
  leidaEn?: string | null
  fechaCreacion: string
}

export interface NotificacionesResumen {
  notificaciones: NotificacionItem[]
  noLeidasTotal: number
  totalPaginas: number
  totalElementos: number
}

export interface ConfiguracionNotificacionItem {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  canalCorreo: boolean
  canalPortal: boolean
  anticipacionValor: number
  anticipacionUnidad: 'HORAS' | 'DIAS' | string
  activo: boolean
  actualizadoPor?: string | null
  fechaActualizacion: string
}

export interface ActualizarConfiguracionRequest {
  canalCorreo?: boolean
  canalPortal?: boolean
  anticipacionValor?: number
  anticipacionUnidad?: string
  activo?: boolean
}

export const notificacionesApi = {
  async getMisNotificaciones(accessToken: string, page = 0, size = 15): Promise<NotificacionesResumen> {
    return apiRequest<NotificacionesResumen>(`/api/notificaciones?page=${page}&size=${size}`, {
      accessToken,
    })
  },

  async marcarLeida(accessToken: string, id: number): Promise<NotificacionItem> {
    return apiRequest<NotificacionItem>(`/api/notificaciones/${id}/leer`, {
      method: 'PATCH',
      accessToken,
    })
  },

  async marcarTodasLeidas(accessToken: string): Promise<void> {
    return apiRequest<void>('/api/notificaciones/marcar-todas-leidas', {
      method: 'PATCH',
      accessToken,
    })
  },

  async getConfiguraciones(accessToken: string): Promise<ConfiguracionNotificacionItem[]> {
    return apiRequest<ConfiguracionNotificacionItem[]>('/api/configuracion/notificaciones', {
      accessToken,
    })
  },

  async actualizarConfiguracion(
    accessToken: string,
    codigo: string,
    req: ActualizarConfiguracionRequest
  ): Promise<ConfiguracionNotificacionItem> {
    return apiRequest<ConfiguracionNotificacionItem>(`/api/configuracion/notificaciones/${codigo}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      accessToken,
      body: JSON.stringify(req),
    })
  },

  async probarNotificacion(
    accessToken: string,
    tipo: 'RECORDATORIO_CITA' | 'CANCELACION_CITA',
    correoDestino: string
  ): Promise<{ mensaje: string; destinatario: string; tipo: string }> {
    return apiRequest<{ mensaje: string; destinatario: string; tipo: string }>(
      '/api/configuracion/notificaciones/test',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        accessToken,
        body: JSON.stringify({ tipo, correoDestino }),
      }
    )
  },
}
