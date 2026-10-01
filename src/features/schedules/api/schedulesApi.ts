import { apiRequest } from '@/shared/api/apiClient'

export interface HorarioOdontologo {
  id: number
  odontologoEspecialidadId: number
  sedeId: number
  diaSemana: number
  horaInicio: string
  horaFin: string
  fechaInicioVigencia: string
  fechaFinVigencia: string | null
  activo: boolean
}

export interface HorarioOdontologoInput {
  odontologoEspecialidadId: number
  sedeId: number
  diaSemana: number
  horaInicio: string
  horaFin: string
  fechaInicioVigencia: string
  fechaFinVigencia: string | null
}

export interface HorarioOdontologoCatalogo {
  odontologoEspecialidadId: number
  odontologoId: number
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  numeroColegiatura: string | null
  especialidadId: number
  especialidadNombre: string
  tieneFoto: boolean
}

export const schedulesApi = {
  listar(token: string, odontologoEspecialidadId?: number) {
    const query = odontologoEspecialidadId
      ? `?odontologoEspecialidadId=${odontologoEspecialidadId}`
      : ''

    return apiRequest<HorarioOdontologo[]>(`/api/horarios${query}`, {
      accessToken: token,
    })
  },

  catalogoOdontologos(token: string) {
    return apiRequest<HorarioOdontologoCatalogo[]>(
      '/api/horarios/catalogo-odontologos',
      { accessToken: token },
    )
  },

  crear(token: string, data: HorarioOdontologoInput) {
    return apiRequest<HorarioOdontologo>('/api/horarios', {
      method: 'POST',
      accessToken: token,
      body: JSON.stringify(data),
    })
  },

  actualizar(
    token: string,
    id: number,
    data: HorarioOdontologoInput,
  ) {
    return apiRequest<HorarioOdontologo>(
      `/api/horarios/${id}`,
      {
        method: 'PUT',
        accessToken: token,
        body: JSON.stringify(data),
      },
    )
  },

  desactivar(token: string, id: number) {
    return apiRequest<void>(
      `/api/horarios/${id}`,
      {
        method: 'DELETE',
        accessToken: token,
      },
    )
  },
}
