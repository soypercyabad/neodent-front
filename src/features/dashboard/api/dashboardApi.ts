import { apiRequest } from '@/shared/api/apiClient'
import { citaDetalleApi, type DetalleCita } from '@/features/appointments/api/citaDetalleApi'
import { bookingApi, type CreatedAppointment } from '@/features/appointments/api/bookingApi'

export interface DashboardCitaResumen {
  idCita: number
  fechaHoraInicio: string
  fechaHoraFin: string
  estado: string
  pacienteId?: number
  pacienteNombre: string
  pacienteTipoDocumento?: string
  pacienteNumeroDocumento?: string
  pacienteTelefono?: string
  odontologoNombre?: string
  servicioNombre: string
  sedeNombre?: string
  precioReferencial?: number
}

export interface AdminDashboardData {
  citas: DashboardCitaResumen[]
  pacientesTotal: number
  pacientesActivos: number
  pacientesNuevosMes: number
  citasTotal: number
  citasAtendidas: number
  citasConfirmadas: number
  citasCanceladas: number
  citasEnAtencion: number
  citasHoy: number
  facturacionEstimada: number
  personalTotal: number
  odontologosTotal: number
  recepcionistasTotal: number
  sedesTotal: number
  serviciosTotal: number
  evolucion: Array<{ fecha: string; Programadas: number; Atendidas: number }>
  topServicios: Array<{ name: string; total: number }>
  distribucionEstados: Array<{ name: string; value: number; color: string }>
  productividadDoctores: Array<{ doctor: string; citas: number; atendidas: number }>
  sedesData: Array<{ name: string; total: number }>
}

export interface DentistDashboardData {
  citas: DashboardCitaResumen[]
  citasHoy: number
  citasAtendidasHoy: number
  citasProximas: number
  pacientesUnicos: number
}

export interface ReceptionDashboardData {
  citas: DashboardCitaResumen[]
  citasDeHoy: DashboardCitaResumen[]
  citasProximas: DashboardCitaResumen[]
  citasHoy: number
  citasPendientesHoy: number
  citasAtendidasHoy: number
  citasEnAtencionHoy: number
  citasPendientesTotal: number
  citasProximasTotal: number
  pacientesNuevosSemana: number
}

export interface PatientDashboardCita {
  id: number
  servicio: string
  odontologo: string
  especialidad?: string
  sede: string
  fecha: string
  hora: string
  estado: string
  fechaHoraInicio: string
  fechaHoraFin: string
}

export interface PatientDashboardData {
  proximaCita: PatientDashboardCita | null
  citasProximas: PatientDashboardCita[]
  citasHistorial: PatientDashboardCita[]
  totalCitas: number
}

export const getLocalDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const dashboardApi = {
  /**
   * Carga métricas consolidadas optimizadas para el Administrador desde /api/dashboard/admin
   */
  async getAdminData(accessToken: string, periodo: string = '30D'): Promise<AdminDashboardData> {
    interface BackendAdminResponse {
      kpis: {
        pacientesTotal: number
        pacientesActivos: number
        pacientesNuevosMes: number
        citasTotal: number
        citasAtendidas: number
        citasConfirmadas: number
        citasCanceladas: number
        citasEnAtencion: number
        citasHoy: number
        facturacionEstimada: number
        personalTotal: number
        odontologosTotal: number
        recepcionistasTotal: number
        sedesTotal: number
        serviciosTotal: number
      }
      evolucion: Array<{ fecha: string; Programadas: number; Atendidas: number }>
      topServicios: Array<{ name: string; total: number }>
      distribucionEstados: Array<{ name: string; value: number; color: string }>
      productividadDoctores: Array<{ doctor: string; citas: number; atendidas: number }>
      sedesData: Array<{ name: string; total: number }>
      citasRecientes: DashboardCitaResumen[]
    }

    const data = await apiRequest<BackendAdminResponse>(
      `/api/dashboard/admin?periodo=${encodeURIComponent(periodo)}`,
      { accessToken },
    )

    return {
      citas: data.citasRecientes || [],
      pacientesTotal: data.kpis?.pacientesTotal ?? 0,
      pacientesActivos: data.kpis?.pacientesActivos ?? 0,
      pacientesNuevosMes: data.kpis?.pacientesNuevosMes ?? 0,
      citasTotal: data.kpis?.citasTotal ?? 0,
      citasAtendidas: data.kpis?.citasAtendidas ?? 0,
      citasConfirmadas: data.kpis?.citasConfirmadas ?? 0,
      citasCanceladas: data.kpis?.citasCanceladas ?? 0,
      citasEnAtencion: data.kpis?.citasEnAtencion ?? 0,
      citasHoy: data.kpis?.citasHoy ?? 0,
      facturacionEstimada: data.kpis?.facturacionEstimada ?? 0,
      personalTotal: data.kpis?.personalTotal ?? 0,
      odontologosTotal: data.kpis?.odontologosTotal ?? 0,
      recepcionistasTotal: data.kpis?.recepcionistasTotal ?? 0,
      sedesTotal: data.kpis?.sedesTotal ?? 0,
      serviciosTotal: data.kpis?.serviciosTotal ?? 0,
      evolucion: data.evolucion || [],
      topServicios: data.topServicios || [],
      distribucionEstados: data.distribucionEstados || [],
      productividadDoctores: data.productividadDoctores || [],
      sedesData: data.sedesData || [],
    }
  },

  /**
   * Carga métricas y citas del odontólogo autenticado desde /api/dashboard/odontologo
   */
  async getDentistData(accessToken: string): Promise<DentistDashboardData> {
    const data = await apiRequest<DentistDashboardData>(
      '/api/dashboard/odontologo',
      { accessToken },
    )

    return {
      citas: data.citas || [],
      citasHoy: data.citasHoy || 0,
      citasAtendidasHoy: data.citasAtendidasHoy || 0,
      citasProximas: data.citasProximas || 0,
      pacientesUnicos: data.pacientesUnicos || 0,
    }
  },

  /**
   * Carga métricas operativas del día para la Recepcionista desde /api/dashboard/recepcion
   */
  async getReceptionData(accessToken: string): Promise<ReceptionDashboardData> {
    const data = await apiRequest<ReceptionDashboardData>(
      '/api/dashboard/recepcion',
      { accessToken },
    )

    return {
      citas: data.citasDeHoy || [],
      citasDeHoy: data.citasDeHoy || [],
      citasProximas: data.citasProximas || [],
      citasHoy: data.citasHoy || 0,
      citasPendientesHoy: data.citasPendientesHoy || 0,
      citasAtendidasHoy: data.citasAtendidasHoy || 0,
      citasEnAtencionHoy: data.citasEnAtencionHoy || 0,
      citasPendientesTotal: data.citasPendientesTotal || 0,
      citasProximasTotal: data.citasProximasTotal || 0,
      pacientesNuevosSemana: data.pacientesNuevosSemana || 0,
    }
  },

  /**
   * Carga citas reales y próxima cita para el Paciente
   */
  async getPatientData(accessToken: string): Promise<PatientDashboardData> {
    let rawCitas: CreatedAppointment[] = []

    try {
      const res = await bookingApi.misCitas(accessToken, 0)
      rawCitas = res.contenido || []
    } catch {
      rawCitas = []
    }

    if (rawCitas.length === 0) {
      return {
        proximaCita: null,
        citasProximas: [],
        citasHistorial: [],
        totalCitas: 0,
      }
    }

    // Resolver detalles completos de las citas
    const detalles = await Promise.allSettled(
      rawCitas.map(c => citaDetalleApi.detalle(accessToken, c.idCita)),
    )

    const citasDetalladas: DetalleCita[] = detalles
      .filter((d): d is PromiseFulfilledResult<DetalleCita> => d.status === 'fulfilled')
      .map(d => d.value)

    const ahora = Date.now()

    const parseHora12 = (fechaIso: string) => {
      try {
        const [h, m] = fechaIso.slice(11, 16).split(':').map(Number)
        return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
      } catch {
        return fechaIso.slice(11, 16)
      }
    }

    const parseFechaFormato = (fechaIso: string) => {
      try {
        return new Intl.DateTimeFormat('es-PE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date(`${fechaIso.slice(0, 10)}T12:00:00`))
      } catch {
        return fechaIso.slice(0, 10)
      }
    }

    const formateadas: PatientDashboardCita[] = citasDetalladas.map(c => ({
      id: c.idCita,
      servicio: c.servicioNombre || 'Consulta Odontológica',
      odontologo: c.odontologoNombre
        ? c.odontologoNombre.startsWith('Dr')
          ? c.odontologoNombre
          : `Dr(a). ${c.odontologoNombre}`
        : 'Por asignar',
      especialidad: c.especialidadNombre,
      sede: c.sedeNombre || 'Sede Principal',
      fecha: parseFechaFormato(c.fechaHoraInicio),
      hora: parseHora12(c.fechaHoraInicio),
      estado: c.estado,
      fechaHoraInicio: c.fechaHoraInicio,
      fechaHoraFin: c.fechaHoraFin,
    }))

    const ordenadas = [...formateadas].sort(
      (a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime(),
    )

    const proximas = ordenadas.filter(
      c => new Date(c.fechaHoraFin).getTime() >= ahora && c.estado !== 'CANCELADA',
    )
    const historial = ordenadas
      .filter(c => new Date(c.fechaHoraFin).getTime() < ahora || c.estado === 'CANCELADA')
      .reverse()

    const proximaCita = proximas.length > 0 ? proximas[0] : null

    return {
      proximaCita,
      citasProximas: proximas,
      citasHistorial: historial,
      totalCitas: formateadas.length,
    }
  },
}
