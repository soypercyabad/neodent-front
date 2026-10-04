import { apiRequest } from '@/shared/api/apiClient'
import { citaDetalleApi, type DetalleCita } from '@/features/appointments/api/citaDetalleApi'
import { bookingApi, type CreatedAppointment } from '@/features/appointments/api/bookingApi'
import { patientsApi } from '@/features/patients/api/patientsApi'
import { usersApi } from '@/features/users/api/usersApi'
import { serviciosApi } from '@/features/servicios/api/serviciosApi'
import { sedesApi } from '@/features/sedes/api/sedesApi'

export interface AdminDashboardData {
  citas: DetalleCita[]
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

export interface DentistDashboardData {
  citas: DetalleCita[]
  citasHoy: number
  citasAtendidasHoy: number
  citasProximas: number
  pacientesUnicos: number
}

export interface ReceptionDashboardData {
  citas: DetalleCita[]
  citasDeHoy: DetalleCita[]
  citasProximas: DetalleCita[]
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

const hoyStr = () => getLocalDateStr()

const esMismoDia = (fechaIso: string, objetivoIso: string) => {
  return fechaIso.slice(0, 10) === objetivoIso.slice(0, 10)
}

export const dashboardApi = {
  /**
   * Carga métricas consolidadas para el Administrador
   */
  async getAdminData(accessToken: string): Promise<AdminDashboardData> {
    const [citasRes, pacsRes, usersRes, servsRes, sedesRes] = await Promise.allSettled([
      citaDetalleApi.agenda(accessToken),
      patientsApi.listar(accessToken, { page: 0, size: 250 }),
      usersApi.listar(accessToken, { page: 0, size: 250 }),
      serviciosApi.listar(accessToken),
      sedesApi.listar(accessToken),
    ])

    const citas = citasRes.status === 'fulfilled' ? citasRes.value : []
    const pacs = pacsRes.status === 'fulfilled' ? pacsRes.value : { totalElementos: 0, contenido: [] }
    const users = usersRes.status === 'fulfilled' ? usersRes.value : { totalElementos: 0, contenido: [] }
    const servicios = servsRes.status === 'fulfilled' ? servsRes.value : []
    const sedes = sedesRes.status === 'fulfilled' ? sedesRes.value : []

    const hoy = hoyStr()
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const citasHoy = citas.filter(c => esMismoDia(c.fechaHoraInicio, hoy)).length
    const citasAtendidas = citas.filter(c => c.estado === 'ATENDIDA').length
    const citasConfirmadas = citas.filter(c => c.estado === 'CONFIRMADA').length
    const citasCanceladas = citas.filter(c => c.estado === 'CANCELADA' || c.estado === 'NO_ASISTIO').length
    const citasEnAtencion = citas.filter(c => c.estado === 'EN_ATENCION').length

    // Facturación estimada: suma del precio referencial de citas atendidas o confirmadas
    const facturacionEstimada = citas
      .filter(c => c.estado === 'ATENDIDA' || c.estado === 'CONFIRMADA')
      .reduce((acc, c) => acc + (c.precioReferencial || 0), 0)

    // Pacientes
    const pacientesActivos = pacs.contenido.filter(p => p.activo).length
    const pacientesNuevosMes = pacs.contenido.filter(p => {
      if (!p.fechaCreacion) return false
      return new Date(p.fechaCreacion).getTime() >= inicioMes.getTime()
    }).length

    // Usuarios
    const odontologosTotal = users.contenido.filter(u => u.roles.includes('ODONTOLOGO')).length
    const recepcionistasTotal = users.contenido.filter(u => u.roles.includes('RECEPCIONISTA')).length

    return {
      citas,
      pacientesTotal: pacs.totalElementos || pacs.contenido.length,
      pacientesActivos,
      pacientesNuevosMes,
      citasTotal: citas.length,
      citasAtendidas,
      citasConfirmadas,
      citasCanceladas,
      citasEnAtencion,
      citasHoy,
      facturacionEstimada,
      personalTotal: users.totalElementos || users.contenido.length,
      odontologosTotal,
      recepcionistasTotal,
      sedesTotal: sedes.length,
      serviciosTotal: servicios.length,
    }
  },

  /**
   * Carga métricas y agenda para el Odontólogo
   */
  async getDentistData(accessToken: string, odontologoId?: number): Promise<DentistDashboardData> {
    let citas: DetalleCita[] = []

    try {
      // Intentar consultar mi agenda si existe el endpoint paginado
      const paginaRes = await apiRequest<{ contenido: CreatedAppointment[] }>(
        '/api/citas/mi-agenda?pagina=0&tamano=100',
        { accessToken },
      )
      if (paginaRes?.contenido?.length) {
        citas = await Promise.all(
          paginaRes.contenido.map(c => citaDetalleApi.detalle(accessToken, c.idCita)),
        )
      }
    } catch {
      // Fallback a consultar agenda general y filtrar por odontólogo
      const todas = await citaDetalleApi.agenda(accessToken)
      if (odontologoId) {
        citas = todas.filter(c => c.odontologoId === odontologoId)
      } else {
        citas = todas
      }
    }

    const hoy = hoyStr()
    const ahora = Date.now()

    const citasHoy = citas.filter(c => esMismoDia(c.fechaHoraInicio, hoy)).length
    const citasAtendidasHoy = citas.filter(
      c => esMismoDia(c.fechaHoraInicio, hoy) && c.estado === 'ATENDIDA',
    ).length
    const citasProximas = citas.filter(
      c => new Date(c.fechaHoraInicio).getTime() >= ahora && c.estado !== 'CANCELADA',
    ).length

    const pacientesUnicos = new Set(citas.map(c => c.pacienteId)).size

    return {
      citas,
      citasHoy,
      citasAtendidasHoy,
      citasProximas,
      pacientesUnicos,
    }
  },

  /**
   * Carga métricas y agenda para la Recepcionista
   */
  async getReceptionData(accessToken: string): Promise<ReceptionDashboardData> {
    const [citasRes, pacsRes] = await Promise.allSettled([
      citaDetalleApi.agenda(accessToken),
      patientsApi.listar(accessToken, { page: 0, size: 250 }),
    ])

    const citas = citasRes.status === 'fulfilled' ? citasRes.value : []
    const pacs = pacsRes.status === 'fulfilled' ? pacsRes.value : { totalElementos: 0, contenido: [] }

    const hoy = hoyStr()
    const haceUnaSemana = Date.now() - 7 * 24 * 60 * 60 * 1000
    const ahora = Date.now()

    // Ordenar cronológicamente
    const citasOrdenadas = [...citas].sort(
      (a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime(),
    )

    const citasDeHoy = citasOrdenadas.filter(c => esMismoDia(c.fechaHoraInicio, hoy))
    const citasPendientesHoy = citasDeHoy.filter(
      c => c.estado === 'PROGRAMADA' || c.estado === 'CONFIRMADA',
    ).length
    const citasAtendidasHoy = citasDeHoy.filter(c => c.estado === 'ATENDIDA').length
    const citasEnAtencionHoy = citasDeHoy.filter(c => c.estado === 'EN_ATENCION').length

    // Citas próximas: desde hoy en adelante o que no estén concluidas/canceladas
    const citasProximas = citasOrdenadas.filter(
      c =>
        new Date(c.fechaHoraInicio).getTime() >= ahora - 12 * 60 * 60 * 1000 &&
        c.estado !== 'CANCELADA' &&
        c.estado !== 'NO_ASISTIO',
    )

    const citasPendientesTotal = citas.filter(
      c => c.estado === 'PROGRAMADA' || c.estado === 'CONFIRMADA',
    ).length

    const pacientesNuevosSemana = pacs.contenido.filter(p => {
      if (!p.fechaCreacion) return false
      return new Date(p.fechaCreacion).getTime() >= haceUnaSemana
    }).length

    return {
      citas: citasOrdenadas,
      citasDeHoy,
      citasProximas,
      citasHoy: citasDeHoy.length,
      citasPendientesHoy,
      citasAtendidasHoy,
      citasEnAtencionHoy,
      citasPendientesTotal,
      citasProximasTotal: citasProximas.length,
      pacientesNuevosSemana,
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
