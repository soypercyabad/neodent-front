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

export interface PaginaResponse<T> {
  contenido: T[]
  pagina: number
  tamanoPagina: number
  totalElementos: number
  totalPaginas: number
  esPrimera: boolean
  esUltima: boolean
}

export type PaginaHorarios = PaginaResponse<HorarioOdontologo>

export interface ListarHorariosParams {
  odontologoEspecialidadId?: number
  odontologoId?: number
  especialidadId?: number
  sedeId?: number
  diaSemana?: number
  estado?: string
  buscar?: string
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export interface HorariosResumenEstados {
  todos: number
  vigentes: number
  proximos: number
  expirados: number
}

export const schedulesApi = {
  resumenEstados(
    token: string,
    params: {
      odontologoEspecialidadId?: number
      odontologoId?: number
      especialidadId?: number
      sedeId?: number
      diaSemana?: number
      buscar?: string
    } = {},
  ) {
    const search = new URLSearchParams()
    if (params.odontologoEspecialidadId) search.append('odontologoEspecialidadId', String(params.odontologoEspecialidadId))
    if (params.odontologoId) search.append('odontologoId', String(params.odontologoId))
    if (params.especialidadId) search.append('especialidadId', String(params.especialidadId))
    if (params.sedeId) search.append('sedeId', String(params.sedeId))
    if (params.diaSemana) search.append('diaSemana', String(params.diaSemana))
    if (params.buscar?.trim()) search.append('buscar', params.buscar.trim())

    const query = search.toString() ? `?${search.toString()}` : ''
    return apiRequest<HorariosResumenEstados>(`/api/horarios/resumen-estados${query}`, {
      accessToken: token,
    })
  },
  listar(token: string, odontologoEspecialidadId?: number, odontologoId?: number) {
    const params = new URLSearchParams()
    if (odontologoEspecialidadId) params.append('odontologoEspecialidadId', String(odontologoEspecialidadId))
    if (odontologoId) params.append('odontologoId', String(odontologoId))
    const query = params.toString() ? `?${params.toString()}` : ''

    return apiRequest<HorarioOdontologo[]>(`/api/horarios${query}`, {
      accessToken: token,
    })
  },

  listarPaginado(token: string, params: ListarHorariosParams = {}) {
    const search = new URLSearchParams()
    if (params.page !== undefined) search.append('page', String(params.page))
    if (params.size !== undefined) search.append('size', String(params.size))
    if (params.odontologoEspecialidadId) search.append('odontologoEspecialidadId', String(params.odontologoEspecialidadId))
    if (params.odontologoId) search.append('odontologoId', String(params.odontologoId))
    if (params.especialidadId) search.append('especialidadId', String(params.especialidadId))
    if (params.sedeId) search.append('sedeId', String(params.sedeId))
    if (params.diaSemana) search.append('diaSemana', String(params.diaSemana))
    if (params.estado && params.estado !== 'todos') search.append('estado', params.estado)
    if (params.buscar?.trim()) search.append('buscar', params.buscar.trim())
    if (params.sortBy) search.append('sortBy', params.sortBy)
    if (params.direction) search.append('direction', params.direction)

    const query = search.toString() ? `?${search.toString()}` : ''

    return apiRequest<PaginaHorarios | HorarioOdontologo[]>(`/api/horarios${query}`, {
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
