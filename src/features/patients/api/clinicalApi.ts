import { apiRequest } from '@/shared/api/apiClient'

export interface HistoriaClinicaResponse {
  id: number
  pacienteId: number
  nombrePaciente: string
  tipoDocumento: string
  numeroDocumento: string
  fechaNacimiento?: string
  edad?: number
  antecedentes?: string
  alergias?: string
  observacionesGenerales?: string
  fechaCreacion: string
  fechaActualizacion?: string
  tieneOdontograma: boolean
  totalEvoluciones: number
}

export interface GuardarHistoriaClinicaRequest {
  antecedentes?: string
  alergias?: string
  observacionesGenerales?: string
}

export interface EvolucionClinicaResponse {
  id: number
  historiaId: number
  citaId?: number
  odontologoId?: number
  odontologoNombre: string
  numeroColegiatura: string
  fecha: string
  diagnostico: string
  procedimiento?: string
  indicaciones?: string
  observaciones?: string
}

export interface CrearEvolucionRequest {
  citaId?: number
  diagnostico: string
  procedimiento?: string
  indicaciones?: string
  observaciones?: string
}

export interface CondicionOdontograma {
  id: number
  codigo: string
  nombre: string
  descripcion?: string
  colorHexadecimal: string
  activo: boolean
}

export interface PiezaDentalDetalle {
  id: number
  numeroPieza: number
  superficie?: string
  idCondicion: number
  codigoCondicion: string
  nombreCondicion: string
  colorHexadecimal: string
  observacion?: string
  estado?: 'HALLAZGO' | 'PRESUPUESTADO' | 'PROGRAMADO' | 'REALIZADO'
  fecha: string
}

export interface OdontogramaResponse {
  id: number
  historiaId: number
  pacienteId: number
  fecha: string
  observaciones?: string
  odontologoId?: number
  odontologoNombre: string
  numeroColegiatura: string
  piezas: PiezaDentalDetalle[]
}

export interface ActualizarPiezaRequest {
  numeroPieza: number
  superficie?: string
  idCondicion?: number
  codigoCondicion?: string
  observacion?: string
  estado?: 'HALLAZGO' | 'PRESUPUESTADO' | 'PROGRAMADO' | 'REALIZADO'
  citaId?: number
}

export interface CrearCondicionRequest {
  nombre: string
  codigo?: string
  descripcion?: string
  colorHexadecimal?: string
}

export const CONDICIONES_DEFAULT: CondicionOdontograma[] = [
  { id: 1, codigo: 'CARIES', nombre: 'Caries Dental', descripcion: 'Lesión cariosa activa o recidivante', colorHexadecimal: '#EF4444', activo: true },
  { id: 2, codigo: 'RESTAURACION', nombre: 'Restauración / Obturación', descripcion: 'Resina compuesta, amalgama o ionómero', colorHexadecimal: '#3B82F6', activo: true },
  { id: 3, codigo: 'CORONA', nombre: 'Corona Protésica', descripcion: 'Corona fija en zirconio, metal-porcelana o disilicato', colorHexadecimal: '#A855F7', activo: true },
  { id: 4, codigo: 'AUSENTE', nombre: 'Pieza Ausente', descripcion: 'Pieza dental extraída o ausente', colorHexadecimal: '#64748B', activo: true },
  { id: 5, codigo: 'ENDODONCIA', nombre: 'Endodoncia / Conducto', descripcion: 'Tratamiento pulpar o necropulpectomía', colorHexadecimal: '#F97316', activo: true },
  { id: 6, codigo: 'SELLANTE', nombre: 'Sellante de Fosas', descripcion: 'Sellado preventivo de fisuras', colorHexadecimal: '#06B6D4', activo: true },
  { id: 7, codigo: 'FRACTURA', nombre: 'Fractura / Fisura', descripcion: 'Pérdida de tejido dentario por trauma', colorHexadecimal: '#E11D48', activo: true },
  { id: 8, codigo: 'IMPLANTE', nombre: 'Implante Dental', descripcion: 'Perno o implante osteointegrado', colorHexadecimal: '#8B5CF6', activo: true },
  { id: 9, codigo: 'PROTESIS_REMOVIBLE', nombre: 'Prótesis Removible', descripcion: 'Aparato protésico removible parcial o total', colorHexadecimal: '#F59E0B', activo: true },
  { id: 10, codigo: 'DIENTE_IMPACTADO', nombre: 'Diente Impactado', descripcion: 'Pieza dental retenida en hueso', colorHexadecimal: '#EC4899', activo: true },
  { id: 11, codigo: 'SANO', nombre: 'Sano / Normal', descripcion: 'Esmalte íntegro sin hallazgos patológicos', colorHexadecimal: '#10B981', activo: true },
]

export interface DocumentoClinico {
  id: number
  pacienteId: number
  citaId?: number
  claveAlmacenamiento: string
  nombreOriginal: string
  tipoMime: string
  tipoDocumento: 'RADIOGRAFIA_PANORAMICA' | 'RADIOGRAFIA_PERIAPICAL' | 'FOTOGRAFIA_CLINICA' | 'TOMOGRAFIA' | 'CONSENTIMIENTO_INFORMADO' | 'OTRO'
  tamanoBytes: number
  visiblePaciente: boolean
  fechaCreacion: string
  urlVisualizacion?: string
}

export interface RecetaItem {
  id?: number
  medicamento: string
  dci?: string
  concentracion?: string
  formaFarmaceutica?: string
  cantidadTotal?: string
  dosis?: string
  frecuencia?: string
  duracion?: string
  viaAdministracion?: string
  observaciones?: string
}

export interface RecetaClinica {
  id: number
  codigoReceta?: string
  pacienteId: number
  odontologoId: number
  odontologoNombre: string
  numeroColegiatura: string
  citaId?: number
  fecha: string
  validaHasta?: string
  indicacionesGenerales?: string
  detalles: RecetaItem[]
}

export const clinicalApi = {
  obtenerHistoria(token: string, pacienteId: number): Promise<HistoriaClinicaResponse | undefined> {
    return apiRequest<HistoriaClinicaResponse>(`/api/pacientes/${pacienteId}/historia-clinica`, {
      accessToken: token,
      method: 'GET',
    })
  },

  crearHistoria(
    token: string,
    pacienteId: number,
    data: GuardarHistoriaClinicaRequest,
  ): Promise<HistoriaClinicaResponse> {
    return apiRequest<HistoriaClinicaResponse>(`/api/pacientes/${pacienteId}/historia-clinica`, {
      accessToken: token,
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizarHistoria(
    token: string,
    pacienteId: number,
    data: GuardarHistoriaClinicaRequest,
  ): Promise<HistoriaClinicaResponse> {
    return apiRequest<HistoriaClinicaResponse>(`/api/pacientes/${pacienteId}/historia-clinica`, {
      accessToken: token,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  listarEvoluciones(token: string, pacienteId: number): Promise<EvolucionClinicaResponse[]> {
    return apiRequest<EvolucionClinicaResponse[]>(`/api/pacientes/${pacienteId}/historia-clinica/evoluciones`, {
      accessToken: token,
      method: 'GET',
    })
  },

  agregarEvolucion(
    token: string,
    pacienteId: number,
    data: CrearEvolucionRequest,
  ): Promise<EvolucionClinicaResponse> {
    return apiRequest<EvolucionClinicaResponse>(`/api/pacientes/${pacienteId}/historia-clinica/evoluciones`, {
      accessToken: token,
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async listarCondiciones(token: string): Promise<CondicionOdontograma[]> {
    try {
      const data = await apiRequest<CondicionOdontograma[]>('/api/odontograma/condiciones', {
        accessToken: token,
        method: 'GET',
      })
      if (Array.isArray(data) && data.length > 0) {
        return data
      }
      return CONDICIONES_DEFAULT
    } catch {
      return CONDICIONES_DEFAULT
    }
  },

  crearCondicion(token: string, data: CrearCondicionRequest): Promise<CondicionOdontograma> {
    return apiRequest<CondicionOdontograma>('/api/odontograma/condiciones', {
      accessToken: token,
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  obtenerOdontograma(token: string, pacienteId: number): Promise<OdontogramaResponse> {
    return apiRequest<OdontogramaResponse>(`/api/pacientes/${pacienteId}/odontograma`, {
      accessToken: token,
      method: 'GET',
    })
  },

  actualizarPieza(
    token: string,
    pacienteId: number,
    data: ActualizarPiezaRequest,
  ): Promise<OdontogramaResponse> {
    return apiRequest<OdontogramaResponse>(`/api/pacientes/${pacienteId}/odontograma/pieza`, {
      accessToken: token,
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  limpiarPieza(
    token: string,
    pacienteId: number,
    numeroPieza: number,
    superficie?: string,
  ): Promise<OdontogramaResponse> {
    const url = `/api/pacientes/${pacienteId}/odontograma/pieza/${numeroPieza}${
      superficie ? `?superficie=${encodeURIComponent(superficie)}` : ''
    }`
    return apiRequest<OdontogramaResponse>(url, {
      accessToken: token,
      method: 'DELETE',
    })
  },
}
