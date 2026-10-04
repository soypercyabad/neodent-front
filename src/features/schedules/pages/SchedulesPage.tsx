import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AnimatedDatePicker,
  AnimatedSelect,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ClockTimePicker,
  ConfirmDialog,
  Icon,
  PageHead,
  ProtectedImage,
  Toast,
  type ToastAviso,
} from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/model/useAuth'
import { bookingApi, type BookingBranch } from '@/features/appointments/api/bookingApi'
import { useNavigate } from 'react-router-dom'
import {
  schedulesApi,
  type HorarioOdontologo,
  type HorarioOdontologoCatalogo,
  type HorarioOdontologoInput,
} from '../api/schedulesApi'
import { blocksApi, type AgendaBlock } from '../api/blocksApi'
import { ScheduleAgendaTabs } from '../components/ScheduleAgendaTabs'
import { calcularResumenVigencia } from '../model/scheduleUtils'

const DIAS = [
  { value: '1', label: 'Lunes', short: 'LUN' },
  { value: '2', label: 'Martes', short: 'MAR' },
  { value: '3', label: 'Miércoles', short: 'MIÉ' },
  { value: '4', label: 'Jueves', short: 'JUE' },
  { value: '5', label: 'Viernes', short: 'VIE' },
  { value: '6', label: 'Sábado', short: 'SÁB' },
  { value: '7', label: 'Domingo', short: 'DOM' },
] as const

type Formulario = {
  odontologoId: string
  odontologoEspecialidadId: string
  sedeId: string
  diaSemana: string
  horaInicio: string
  horaFin: string
  fechaInicioVigencia: string
  fechaFinVigencia: string
  sinFechaFin: boolean
}

const pad = (value: number) => String(value).padStart(2, '0')

const isoFecha = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const fechaDesdeIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const hoyIso = () => isoFecha(new Date())

const mesIsoActual = () => {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

const mesActual = (iso: string) => iso.slice(0, 7)

const inicioMes = (mes: string) => `${mes}-01`

const finMes = (mes: string) => {
  const [year, month] = mes.split('-').map(Number)
  return isoFecha(new Date(year, month, 0))
}

const moverMes = (mes: string, delta: number) => {
  const [year, month] = mes.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

const nombreMes = (mes: string) => {
  const [year, month] = mes.split('-').map(Number)
  const value = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))

  return value.charAt(0).toUpperCase() + value.slice(1)
}

const tituloMesAno = (mes: string) => {
  const [year, month] = mes.split('-').map(Number)
  const value = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
  }).format(new Date(year, month - 1, 1))

  const mesCapitalizado = value.charAt(0).toUpperCase() + value.slice(1)
  return `${mesCapitalizado} - ${year}`
}

const diaSemanaIso = (iso: string) => {
  const day = fechaDesdeIso(iso).getDay()
  return day === 0 ? 7 : day
}

const nombreCompleto = (item: HorarioOdontologoCatalogo) =>
  [item.nombres, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(' ')

const horaCorta = (hora: string) => hora.slice(0, 5)

const hora12 = (hora: string) => {
  const [hStr = '00', mStr = '00'] = hora.split(':')
  const h = Number.parseInt(hStr, 10)
  const m = Number.parseInt(mStr, 10)
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(fechaDesdeIso(iso.slice(0, 10)))

const fechaLarga = (iso: string) => {
  const value = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fechaDesdeIso(iso))

  return value.charAt(0).toUpperCase() + value.slice(1)
}

type EstiloBloqueo = {
  dotColor: string
  badgeTone: 'red' | 'amber' | 'blue' | 'green' | 'gray'
  cardClass: string
  textClass: string
  nombre: string
}

const getEstiloBloqueo = (codigo: string): EstiloBloqueo => {
  switch (codigo) {
    case 'FERIADO':
      return {
        dotColor: 'bg-rose-500',
        badgeTone: 'red',
        cardClass: 'border-rose-200/80 bg-rose-50/70',
        textClass: 'text-rose-900',
        nombre: 'Feriado',
      }
    case 'CAPACITACION':
      return {
        dotColor: 'bg-purple-500',
        badgeTone: 'blue',
        cardClass: 'border-purple-200/80 bg-purple-50/70',
        textClass: 'text-purple-900',
        nombre: 'Capacitación',
      }
    case 'VACACIONES':
      return {
        dotColor: 'bg-amber-500',
        badgeTone: 'amber',
        cardClass: 'border-amber-200/80 bg-amber-50/70',
        textClass: 'text-amber-900',
        nombre: 'Vacaciones',
      }
    case 'PERMISO':
      return {
        dotColor: 'bg-sky-500',
        badgeTone: 'blue',
        cardClass: 'border-sky-200/80 bg-sky-50/70',
        textClass: 'text-sky-900',
        nombre: 'Permiso',
      }
    case 'CIERRE_SEDE':
      return {
        dotColor: 'bg-slate-600',
        badgeTone: 'gray',
        cardClass: 'border-slate-300/80 bg-slate-100/80',
        textClass: 'text-slate-900',
        nombre: 'Cierre de sede',
      }
    default:
      return {
        dotColor: 'bg-slate-400',
        badgeTone: 'gray',
        cardClass: 'border-line bg-alt/60',
        textClass: 'text-ink',
        nombre: 'Otro bloqueo',
      }
  }
}

const horarioAplicaFecha = (horario: HorarioOdontologo, fecha: string) => {
  if (horario.diaSemana !== diaSemanaIso(fecha)) return false
  if (horario.fechaInicioVigencia > fecha) return false
  if (horario.fechaFinVigencia && horario.fechaFinVigencia < fecha) return false
  return true
}

const horarioCruzaMes = (horario: HorarioOdontologo, mes: string) => {
  const inicio = inicioMes(mes)
  const fin = finMes(mes)
  return horario.fechaInicioVigencia <= fin &&
    (!horario.fechaFinVigencia || horario.fechaFinVigencia >= inicio)
}

const bloqueoAplicaFecha = (bloqueo: AgendaBlock, fecha: string) => {
  const inicioDia = fechaDesdeIso(fecha)
  const finDia = new Date(inicioDia)
  finDia.setDate(finDia.getDate() + 1)

  const inicioBloqueo = new Date(bloqueo.fechaInicio)
  const finBloqueo = new Date(bloqueo.fechaFin)

  return inicioBloqueo < finDia && finBloqueo > inicioDia
}

const bloqueoCubreDiaCompleto = (bloqueo: AgendaBlock, fecha: string) => {
  const inicioDia = fechaDesdeIso(fecha)
  const finDia = new Date(inicioDia)
  finDia.setDate(finDia.getDate() + 1)

  const inicioBloqueo = new Date(bloqueo.fechaInicio)
  const finBloqueo = new Date(bloqueo.fechaFin)

  return inicioBloqueo <= inicioDia && finBloqueo >= finDia
}

const rangoBloqueo = (bloqueo: AgendaBlock) => {
  const inicio = new Date(bloqueo.fechaInicio)
  const fin = new Date(bloqueo.fechaFin)
  const inicioHora = `${pad(inicio.getHours())}:${pad(inicio.getMinutes())}`
  const finHora = `${pad(fin.getHours())}:${pad(fin.getMinutes())}`

  if (inicioHora === '00:00' && finHora === '00:00') {
    const finVisual = new Date(fin)
    finVisual.setDate(finVisual.getDate() - 1)
    const inicioIso = isoFecha(inicio)
    const finIso = isoFecha(finVisual)

    return inicioIso === finIso
      ? `${fechaCorta(inicioIso)} · Todo el día`
      : `${fechaCorta(inicioIso)} – ${fechaCorta(finIso)} · Todo el día`
  }

  if (isoFecha(inicio) === isoFecha(fin)) {
    return `${fechaCorta(isoFecha(inicio))} · ${hora12(inicioHora)} – ${hora12(finHora)}`
  }

  return `${fechaCorta(isoFecha(inicio))} ${hora12(inicioHora)} – ${fechaCorta(isoFecha(fin))} ${hora12(finHora)}`
}

const VACIO: Formulario = {
  odontologoId: '',
  odontologoEspecialidadId: '',
  sedeId: '',
  diaSemana: '1',
  horaInicio: '08:00',
  horaFin: '13:00',
  fechaInicioVigencia: inicioMes(mesIsoActual()),
  fechaFinVigencia: finMes(mesIsoActual()),
  sinFechaFin: false,
}

export function SchedulesPage() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [catalogo, setCatalogo] = useState<HorarioOdontologoCatalogo[]>([])
  const [sedes, setSedes] = useState<BookingBranch[]>([])
  const [horarios, setHorarios] = useState<HorarioOdontologo[]>([])
  const [bloqueos, setBloqueos] = useState<AgendaBlock[]>([])

  const [filtroOdontologoId, setFiltroOdontologoId] = useState('')
  const [filtroEspecialidadId, setFiltroEspecialidadId] = useState('')
  const [filtroSede, setFiltroSede] = useState('')

  const [mesVisible, setMesVisible] = useState(mesIsoActual())
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyIso())

  const [form, setForm] = useState<Formulario>(VACIO)
  const [editando, setEditando] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [confirmar, setConfirmar] = useState<HorarioOdontologo | null>(null)

  const resumenVigencia = useMemo(() => {
    if (!form.diaSemana || !form.fechaInicioVigencia) return null
    return calcularResumenVigencia(
      Number(form.diaSemana),
      form.fechaInicioVigencia,
      form.sinFechaFin ? null : form.fechaFinVigencia || null,
    )
  }, [form.diaSemana, form.fechaInicioVigencia, form.fechaFinVigencia, form.sinFechaFin])

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setError('No se encontró una sesión activa.')
      return
    }

    let activo = true
    setLoading(true)
    setError('')

    Promise.all([
      schedulesApi.catalogoOdontologos(accessToken),
      bookingApi.sedes(accessToken),
      schedulesApi.listar(accessToken),
      blocksApi.listar(accessToken).catch(() => [] as AgendaBlock[]),
    ])
      .then(([catalogoData, sedesData, horariosData, bloqueosData]) => {
        if (!activo) return

        setCatalogo(catalogoData)
        setSedes(sedesData)
        setHorarios(horariosData)
        setBloqueos(bloqueosData)

        setFiltroOdontologoId(actual =>
          actual && catalogoData.some(item => String(item.odontologoId) === actual)
            ? actual
            : catalogoData[0]
              ? String(catalogoData[0].odontologoId)
              : '',
        )
      })
      .catch(e => {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los horarios.')
        }
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, actualizacion])

  useEffect(() => {
    if (!fechaSeleccionada.startsWith(mesVisible)) {
      setFechaSeleccionada(inicioMes(mesVisible))
    }
  }, [mesVisible, fechaSeleccionada])

  const listaOdontologos = useMemo(() => {
    const map = new Map<number, HorarioOdontologoCatalogo>()
    catalogo.forEach(item => {
      if (!map.has(item.odontologoId)) {
        map.set(item.odontologoId, item)
      }
    })

    return [...map.values()].sort((a, b) =>
      nombreCompleto(a).localeCompare(nombreCompleto(b)),
    )
  }, [catalogo])

  const especialidadesDelOdontologo = useMemo(() => {
    if (!filtroOdontologoId) return []
    return catalogo.filter(item => String(item.odontologoId) === filtroOdontologoId)
  }, [catalogo, filtroOdontologoId])

  const odontologoSeleccionado = useMemo(
    () => listaOdontologos.find(item => String(item.odontologoId) === filtroOdontologoId) ?? null,
    [listaOdontologos, filtroOdontologoId],
  )

  const relacionActiva = useMemo(
    () =>
      especialidadesDelOdontologo.find(
        item => String(item.odontologoEspecialidadId) === filtroEspecialidadId,
      ) ?? null,
    [especialidadesDelOdontologo, filtroEspecialidadId],
  )

  const horariosVisibles = useMemo(() => {
    const idsRelacion = new Set(especialidadesDelOdontologo.map(e => e.odontologoEspecialidadId))

    return horarios.filter(h => {
      if (filtroEspecialidadId) {
        if (h.odontologoEspecialidadId !== Number(filtroEspecialidadId)) return false
      } else if (filtroOdontologoId) {
        if (!idsRelacion.has(h.odontologoEspecialidadId)) return false
      }

      if (filtroSede && h.sedeId !== Number(filtroSede)) return false
      return true
    })
  }, [horarios, filtroEspecialidadId, filtroOdontologoId, especialidadesDelOdontologo, filtroSede])

  const horariosMes = useMemo(
    () => horariosVisibles.filter(h => horarioCruzaMes(h, mesVisible)),
    [horariosVisibles, mesVisible],
  )

  const bloqueosRelevantes = useMemo(() => {
    const inicio = fechaDesdeIso(inicioMes(mesVisible))
    const fin = fechaDesdeIso(finMes(mesVisible))
    fin.setDate(fin.getDate() + 1)

    return bloqueos
      .filter(b => {
        const inicioBloqueo = new Date(b.fechaInicio)
        const finBloqueo = new Date(b.fechaFin)
        if (!(inicioBloqueo < fin && finBloqueo > inicio)) return false

        if (
          filtroOdontologoId &&
          b.odontologoId !== null &&
          String(b.odontologoId) !== filtroOdontologoId
        ) {
          return false
        }

        if (filtroSede && b.sedeId !== null && String(b.sedeId) !== filtroSede) {
          return false
        }

        return true
      })
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
  }, [bloqueos, filtroOdontologoId, filtroSede, mesVisible])

  const turnosFechaSeleccionada = useMemo(
    () =>
      horariosVisibles
        .filter(h => horarioAplicaFecha(h, fechaSeleccionada))
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    [horariosVisibles, fechaSeleccionada],
  )

  const bloqueosFechaSeleccionada = useMemo(
    () => bloqueosRelevantes.filter(b => bloqueoAplicaFecha(b, fechaSeleccionada)),
    [bloqueosRelevantes, fechaSeleccionada],
  )

  const bloqueoTotalFechaSeleccionada = useMemo(
    () => bloqueosFechaSeleccionada.some(b => bloqueoCubreDiaCompleto(b, fechaSeleccionada)),
    [bloqueosFechaSeleccionada, fechaSeleccionada],
  )


  const calendario = useMemo(() => {
    const [year, month] = mesVisible.split('-').map(Number)
    const first = new Date(year, month - 1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()
    const offset = (first.getDay() + 6) % 7

    const cells: Array<{ fecha: string | null; dia: number | null }> = []
    for (let i = 0; i < offset; i++) cells.push({ fecha: null, dia: null })
    for (let day = 1; day <= daysInMonth; day++) {
      const fecha = `${mesVisible}-${pad(day)}`
      cells.push({ fecha, dia: day })
    }
    while (cells.length % 7 !== 0) cells.push({ fecha: null, dia: null })
    return cells
  }, [mesVisible])

  const opcionesOdontologos = listaOdontologos.map(item => ({
    value: String(item.odontologoId),
    label: `Dr(a). ${nombreCompleto(item)}`,
  }))

  const opcionesEspecialidades = useMemo(() => {
    if (especialidadesDelOdontologo.length <= 1) {
      return especialidadesDelOdontologo.map(e => ({
        value: String(e.odontologoEspecialidadId),
        label: e.especialidadNombre,
      }))
    }

    return [
      { value: '', label: 'Todas las especialidades' },
      ...especialidadesDelOdontologo.map(e => ({
        value: String(e.odontologoEspecialidadId),
        label: e.especialidadNombre,
      })),
    ]
  }, [especialidadesDelOdontologo])

  const opcionesEspecialidadesFormulario = useMemo(() => {
    if (!form.odontologoId) return []
    return catalogo
      .filter(item => String(item.odontologoId) === form.odontologoId)
      .map(e => ({
        value: String(e.odontologoEspecialidadId),
        label: e.especialidadNombre,
      }))
  }, [catalogo, form.odontologoId])

  const opcionesSedes = sedes.map(sede => ({
    value: String(sede.id),
    label: sede.nombre,
  }))

  const sedeNombre = (id: number) =>
    sedes.find(sede => sede.id === id)?.nombre ?? `Sede #${id}`

  const abrirNuevo = (dia?: number, fechaBase?: string) => {
    const doctorId =
      filtroOdontologoId ||
      (listaOdontologos[0] ? String(listaOdontologos[0].odontologoId) : '')
    const espDoctor = catalogo.filter(item => String(item.odontologoId) === doctorId)
    const relacionId =
      filtroEspecialidadId &&
      espDoctor.some(e => String(e.odontologoEspecialidadId) === filtroEspecialidadId)
        ? filtroEspecialidadId
        : espDoctor[0]
          ? String(espDoctor[0].odontologoEspecialidadId)
          : ''
    const sedeId = filtroSede || (sedes[0] ? String(sedes[0].id) : '')
    const inicio = fechaBase || inicioMes(mesVisible)

    setForm({
      ...VACIO,
      odontologoId: doctorId,
      odontologoEspecialidadId: relacionId,
      sedeId,
      diaSemana: dia ? String(dia) : String(diaSemanaIso(inicio)),
      horaInicio: '08:00',
      horaFin: '13:00',
      fechaInicioVigencia: inicio,
      fechaFinVigencia: finMes(mesVisible),
      sinFechaFin: false,
    })

    setEditando(null)
    setMostrarForm(true)
  }

  const abrirEditar = (horario: HorarioOdontologo) => {
    const match = catalogo.find(
      c => c.odontologoEspecialidadId === horario.odontologoEspecialidadId,
    )

    setForm({
      odontologoId: match ? String(match.odontologoId) : '',
      odontologoEspecialidadId: String(horario.odontologoEspecialidadId),
      sedeId: String(horario.sedeId),
      diaSemana: String(horario.diaSemana),
      horaInicio: horaCorta(horario.horaInicio),
      horaFin: horaCorta(horario.horaFin),
      fechaInicioVigencia: horario.fechaInicioVigencia,
      fechaFinVigencia: horario.fechaFinVigencia ?? '',
      sinFechaFin: horario.fechaFinVigencia === null,
    })

    setEditando(horario.id)
    setMostrarForm(true)
  }

  const cerrarForm = () => {
    if (guardando) return
    setMostrarForm(false)
    setEditando(null)
  }

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!accessToken || guardando) return

    setGuardando(true)

    try {
      if (!form.odontologoId || !form.odontologoEspecialidadId || !form.sedeId) {
        throw new Error('Selecciona el odontólogo, la especialidad y la sede.')
      }

      if (!form.horaInicio || !form.horaFin) {
        throw new Error('Ingresa la hora de inicio y la hora de fin.')
      }

      if (form.horaFin <= form.horaInicio) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio.')
      }

      if (!form.fechaInicioVigencia) {
        throw new Error('Selecciona la fecha de inicio de vigencia.')
      }

      if (
        !form.sinFechaFin &&
        (!form.fechaFinVigencia || form.fechaFinVigencia < form.fechaInicioVigencia)
      ) {
        throw new Error('La fecha fin de vigencia debe ser igual o posterior a la fecha de inicio.')
      }

      const data: HorarioOdontologoInput = {
        odontologoEspecialidadId: Number(form.odontologoEspecialidadId),
        sedeId: Number(form.sedeId),
        diaSemana: Number(form.diaSemana),
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        fechaInicioVigencia: form.fechaInicioVigencia,
        fechaFinVigencia: form.sinFechaFin ? null : form.fechaFinVigencia,
      }

      const esNuevo = editando === null
      const resultado = esNuevo
        ? await schedulesApi.crear(accessToken, data)
        : await schedulesApi.actualizar(accessToken, editando, data)

      setHorarios(actual => {
        const siguiente = esNuevo
          ? [...actual, resultado]
          : actual.map(h => (h.id === resultado.id ? resultado : h))

        return siguiente.sort(
          (a, b) =>
            a.fechaInicioVigencia.localeCompare(b.fechaInicioVigencia) ||
            a.diaSemana - b.diaSemana ||
            a.horaInicio.localeCompare(b.horaInicio),
        )
      })

      const matchCatalogo = catalogo.find(
        c => c.odontologoEspecialidadId === resultado.odontologoEspecialidadId,
      )

      if (matchCatalogo) {
        setFiltroOdontologoId(String(matchCatalogo.odontologoId))
        setFiltroEspecialidadId(String(matchCatalogo.odontologoEspecialidadId))
      }

      setMostrarForm(false)
      setEditando(null)

      setAviso({
        tipo: 'success',
        texto: esNuevo
          ? 'Horario registrado correctamente.'
          : 'Horario actualizado correctamente.',
      })
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo guardar el horario.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const desactivar = async () => {
    if (!accessToken || !confirmar || procesando) return

    const horario = confirmar
    setProcesando(true)

    try {
      await schedulesApi.desactivar(accessToken, horario.id)
      setHorarios(actual => actual.filter(h => h.id !== horario.id))
      setConfirmar(null)
      setAviso({ tipo: 'success', texto: 'Horario desactivado correctamente.' })
    } catch (e) {
      setConfirmar(null)
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo desactivar el horario.',
      })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <PageHead
        title="Agenda de odontólogos"
        description="Configura horarios con vigencia, revisa el calendario mensual y controla excepciones de atención."
      />

      <ScheduleAgendaTabs />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      <AnimatePresence>
        {mostrarForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cerrarForm}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
            >
              <div className="mb-5 flex items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <h2 className="text-xl font-bold text-ink">
                    {editando === null ? 'Registrar horario de atención' : 'Editar horario de atención'}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Define el turno semanal y el periodo exacto durante el cual estará vigente.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar formulario"
                  onClick={cerrarForm}
                  disabled={guardando}
                  className="rounded-xl p-2 text-muted transition hover:bg-alt hover:text-ink"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <form onSubmit={event => void guardar(event)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="min-w-0">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Odontólogo</span>
                  <AnimatedSelect
                    value={form.odontologoId}
                    options={opcionesOdontologos}
                    onChange={value => {
                      const espDoctor = catalogo.filter(
                        item => String(item.odontologoId) === value,
                      )
                      setForm(actual => ({
                        ...actual,
                        odontologoId: value,
                        odontologoEspecialidadId: espDoctor[0]
                          ? String(espDoctor[0].odontologoEspecialidadId)
                          : '',
                      }))
                    }}
                    label="Odontólogo"
                    disabled={guardando}
                  />
                </label>

                <label className="min-w-0">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Especialidad</span>
                  <AnimatedSelect
                    value={form.odontologoEspecialidadId}
                    options={opcionesEspecialidadesFormulario}
                    onChange={value =>
                      setForm(actual => ({ ...actual, odontologoEspecialidadId: value }))
                    }
                    label="Especialidad"
                    disabled={guardando || opcionesEspecialidadesFormulario.length === 0}
                  />
                </label>

                <label className="min-w-0">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Sede</span>
                  <AnimatedSelect
                    value={form.sedeId}
                    options={opcionesSedes}
                    onChange={value => setForm(actual => ({ ...actual, sedeId: value }))}
                    label="Sede"
                    disabled={guardando}
                  />
                </label>

                <label className="min-w-0">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Día de atención</span>
                  <AnimatedSelect
                    value={form.diaSemana}
                    options={DIAS.map(dia => ({ value: dia.value, label: dia.label }))}
                    onChange={value => setForm(actual => ({ ...actual, diaSemana: value }))}
                    label="Día de atención"
                    disabled={guardando}
                  />
                </label>

                <div className="min-w-0">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Hora de inicio</span>
                  <ClockTimePicker
                    value={form.horaInicio}
                    onChange={value => setForm(actual => ({ ...actual, horaInicio: value }))}
                    label="Hora de inicio"
                    disabled={guardando}
                  />
                </div>

                <div className="min-w-0">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Hora de fin</span>
                  <ClockTimePicker
                    value={form.horaFin}
                    onChange={value => setForm(actual => ({ ...actual, horaFin: value }))}
                    label="Hora de fin"
                    disabled={guardando}
                  />
                </div>

                <div className="min-w-0">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Vigente desde</span>
                  <AnimatedDatePicker
                    value={form.fechaInicioVigencia}
                    onChange={value =>
                      setForm(actual => ({
                        ...actual,
                        fechaInicioVigencia: value,
                        fechaFinVigencia:
                          !actual.sinFechaFin && actual.fechaFinVigencia < value
                            ? value
                            : actual.fechaFinVigencia,
                      }))
                    }
                    label="Inicio de vigencia"
                    disabled={guardando}
                  />
                </div>

                <div className="min-w-0">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Vigente hasta</span>
                  <AnimatedDatePicker
                    value={form.fechaFinVigencia}
                    onChange={value => setForm(actual => ({ ...actual, fechaFinVigencia: value }))}
                    min={form.fechaInicioVigencia || undefined}
                    label="Fin de vigencia"
                    disabled={guardando || form.sinFechaFin}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <Checkbox
                    checked={form.sinFechaFin}
                    onChange={event =>
                      setForm(actual => ({
                        ...actual,
                        sinFechaFin: event.target.checked,
                        fechaFinVigencia: event.target.checked
                          ? ''
                          : actual.fechaFinVigencia || finMes(mesVisible),
                      }))
                    }
                    label="Mantener este horario sin fecha final"
                    disabled={guardando}
                  />
                </div>

                {resumenVigencia && !form.sinFechaFin && (
                  <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-line bg-alt/50 p-3.5 text-xs">
                    {resumenVigencia.aviso && (
                      <div className="mb-2 flex items-start gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 text-amber-900">
                        <Icon name="warning" size={17} className="mt-0.5 shrink-0 text-amber-600" />
                        <div className="min-w-0">
                          <p className="font-bold text-amber-950">Aviso sobre fecha de vigencia</p>
                          <p className="mt-0.5 leading-relaxed text-amber-900">{resumenVigencia.aviso}</p>
                          {resumenVigencia.fechaAjustadaSugerida && (
                            <button
                              type="button"
                              onClick={() =>
                                setForm(actual => ({
                                  ...actual,
                                  fechaFinVigencia: resumenVigencia.fechaAjustadaSugerida!,
                                }))
                              }
                              className="mt-1.5 inline-flex items-center gap-1 font-bold text-brand hover:underline"
                            >
                              <span>Ajustar fin de vigencia al {fechaCorta(resumenVigencia.fechaAjustadaSugerida)} →</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-muted font-medium">
                      <Icon name="calendar" size={15} className="shrink-0 text-brand" />
                      <span>
                        {resumenVigencia.count === 0 ? (
                          <strong className="text-danger">0 turnos efectivos en este periodo</strong>
                        ) : (
                          <>
                            <strong className="text-ink">
                              {resumenVigencia.count} turno{resumenVigencia.count === 1 ? '' : 's'} de atención efectivo{resumenVigencia.count === 1 ? '' : 's'}
                            </strong>
                            {resumenVigencia.primerDia &&
                              ` (primer turno: ${fechaCorta(resumenVigencia.primerDia)}${
                                resumenVigencia.count > 1 ? ` · último: ${fechaCorta(resumenVigencia.ultimoDia!)}` : ''
                              })`}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5 sm:col-span-2 lg:col-span-4">
                  <Button variant="ghost" onClick={cerrarForm} disabled={guardando}>
                    Cancelar
                  </Button>

                  <Button type="submit" disabled={guardando}>
                    {guardando
                      ? 'Guardando…'
                      : editando === null
                        ? 'Registrar horario'
                        : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Card className="overflow-visible">
        <div className="border-b border-line p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink sm:text-lg">Programación de atención</h2>
              <p className="mt-1 text-xs text-muted">
                Revisa el mes real o administra la plantilla semanal dentro de su periodo de vigencia.
              </p>
            </div>

            <div className="grid w-full gap-2.5 sm:grid-cols-2 xl:w-auto xl:grid-cols-[minmax(14rem,18rem)_minmax(12rem,16rem)_11rem]">
              <AnimatedSelect
                value={filtroOdontologoId}
                options={opcionesOdontologos}
                onChange={value => {
                  setFiltroOdontologoId(value)
                  setFiltroEspecialidadId('')
                }}
                label="Odontólogo"
                placeholder="Selecciona un odontólogo"
              />

              <AnimatedSelect
                value={filtroEspecialidadId}
                options={opcionesEspecialidades}
                onChange={setFiltroEspecialidadId}
                label="Especialidad"
                disabled={!filtroOdontologoId || especialidadesDelOdontologo.length === 0}
              />

              <AnimatedSelect
                value={filtroSede}
                options={[{ value: '', label: 'Todas las sedes' }, ...opcionesSedes]}
                onChange={setFiltroSede}
                label="Filtrar por sede"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted">
            <Icon name="spinner" size={22} className="animate-spin text-brand" />
            Cargando agenda de atención…
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p role="alert" className="text-sm text-danger">{error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => setActualizacion(n => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : catalogo.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="clock" size={36} className="mx-auto text-muted" />
            <p className="mt-3 font-semibold text-ink">No hay odontólogos activos con especialidades.</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            {odontologoSeleccionado && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-soft/80 via-brand-soft/40 to-surface p-4 shadow-xs sm:p-5">
                <div className="flex items-center gap-3.5">
                  {odontologoSeleccionado.tieneFoto ? (
                    <div className="size-13 shrink-0 overflow-hidden rounded-full border border-line bg-alt shadow-sm">
                      <ProtectedImage
                        path={`/api/odontologos/${odontologoSeleccionado.odontologoId}/foto`}
                        accessToken={accessToken}
                        alt={`Dr(a). ${nombreCompleto(odontologoSeleccionado)}`}
                        className="size-full object-cover"
                        fallback={
                          <Avatar
                            nombre={odontologoSeleccionado.nombres}
                            apellido={odontologoSeleccionado.apellidoPaterno}
                            seed={odontologoSeleccionado.odontologoId}
                            size={52}
                            animate="hover"
                            trackCursor={false}
                          />
                        }
                      />
                    </div>
                  ) : (
                    <Avatar
                      nombre={odontologoSeleccionado.nombres}
                      apellido={odontologoSeleccionado.apellidoPaterno}
                      seed={odontologoSeleccionado.odontologoId}
                      size={52}
                      animate="hover"
                      trackCursor={false}
                    />
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-ink sm:text-lg">
                        Dr(a). {nombreCompleto(odontologoSeleccionado)}
                      </h3>
                      {relacionActiva ? (
                        <Badge tone="blue">{relacionActiva.especialidadNombre}</Badge>
                      ) : (
                        especialidadesDelOdontologo.map(e => (
                          <Badge key={e.odontologoEspecialidadId} tone="blue">
                            {e.especialidadNombre}
                          </Badge>
                        ))
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Programación visible para {nombreMes(mesVisible)}
                      {filtroSede ? ` · ${sedeNombre(Number(filtroSede))}` : ' · Todas las sedes'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
                  {odontologoSeleccionado.numeroColegiatura && (
                    <div className="rounded-xl border border-line bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-ink shadow-2xs">
                      <span className="mr-1.5 font-medium text-muted">COP:</span>
                      <span className="font-mono font-bold text-ink">
                        {odontologoSeleccionado.numeroColegiatura}
                      </span>
                    </div>
                  )}

                  <div className="rounded-xl border border-brand/20 bg-brand-soft/80 px-3.5 py-1.5 text-xs font-semibold text-brand shadow-2xs">
                    {horariosMes.length} turno{horariosMes.length === 1 ? '' : 's'} habitual{horariosMes.length === 1 ? '' : 'es'} en el periodo
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/horarios/bloqueos')}
                    className="flex items-center gap-1.5 rounded-xl border border-line bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-ink shadow-2xs transition hover:border-brand/40 hover:bg-alt"
                  >
                    <span className="size-2 rounded-full bg-rose-500" />
                    {bloqueosRelevantes.length} excepción{bloqueosRelevantes.length === 1 ? '' : 'es'} en {nombreMes(mesVisible).split(' ')[0]}
                  </button>
                </div>
              </div>
            )}

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Calendario de atención</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Consulta la programación mensual, excepciones de agenda y administra turnos de atención.
                </p>
              </div>

              <Button
                icon="plus"
                onClick={() => abrirNuevo(diaSemanaIso(fechaSeleccionada), fechaSeleccionada)}
                disabled={!filtroOdontologoId}
              >
                Nuevo horario
              </Button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="min-w-0 rounded-2xl border border-brand/80 bg-surface shadow-xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4">
                  <h3 className="text-xl sm:text-2xl font-black capitalize tracking-tight text-ink">
                    {tituloMesAno(mesVisible)}
                  </h3>

                  <div className="flex items-center gap-1 rounded-xl border border-line bg-alt/50 p-1 shadow-2xs">
                    <button
                      type="button"
                      aria-label="Mes anterior"
                      onClick={() => setMesVisible(actual => moverMes(actual, -1))}
                      className="grid size-8 place-items-center rounded-lg text-ink/70 transition hover:bg-surface hover:text-ink hover:shadow-2xs"
                    >
                      <Icon name="chevronLeft" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const hoy = hoyIso()
                        setMesVisible(mesActual(hoy))
                        setFechaSeleccionada(hoy)
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-muted transition hover:bg-surface hover:text-brand hover:shadow-2xs rounded-lg"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      aria-label="Mes siguiente"
                      onClick={() => setMesVisible(actual => moverMes(actual, 1))}
                      className="grid size-8 place-items-center rounded-lg text-ink/70 transition hover:bg-surface hover:text-ink hover:shadow-2xs"
                    >
                      <Icon name="chevronRight" size={18} />
                    </button>
                  </div>
                </div>

                {/* LEYENDA DEBAJO DEL ENCABEZADO */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 border-b border-line bg-surface px-4 py-3 text-xs font-semibold text-muted">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted mr-1">Leyenda:</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 font-bold border border-blue-200/80">
                    <span className="size-2 rounded-full bg-brand" /> Turnos
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-rose-700 font-bold border border-rose-200/80">
                    <span className="size-2 rounded-full bg-rose-500" /> Feriados
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800 font-bold border border-amber-200/80">
                    <span className="size-2 rounded-full bg-amber-500" /> Vacaciones
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-purple-700 font-bold border border-purple-200/80">
                    <span className="size-2 rounded-full bg-purple-500" /> Capacitaciones
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-sky-700 font-bold border border-sky-200/80">
                    <span className="size-2 rounded-full bg-sky-500" /> Permisos
                  </span>
                </div>

                <div className="grid grid-cols-7 border-y border-brand/30 bg-brand text-white py-2.5 text-center text-xs font-black uppercase tracking-wider shadow-xs">
                  {DIAS.map(dia => (
                    <span
                      key={dia.value}
                      className={cn(dia.value === '7' ? 'text-amber-200' : 'text-white')}
                    >
                      {dia.short}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 p-2 sm:p-3 bg-alt/20">
                  {calendario.map((cell, index) => {
                    if (!cell.fecha || cell.dia === null) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="min-h-20 sm:min-h-24 rounded-xl border border-dashed border-line/30 bg-alt/10"
                        />
                      )
                    }

                    const turnos = horariosVisibles
                      .filter(h => horarioAplicaFecha(h, cell.fecha!))
                      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                    const excepciones = bloqueosRelevantes.filter(b => bloqueoAplicaFecha(b, cell.fecha!))
                    const bloqueoTotal = excepciones.some(b => bloqueoCubreDiaCompleto(b, cell.fecha!))
                    const seleccionado = fechaSeleccionada === cell.fecha
                    const esHoy = cell.fecha === hoyIso()
                    const tiposExcepcionUnicos = Array.from(new Set(excepciones.map(b => b.tipoBloqueoCodigo)))

                    return (
                      <button
                        key={cell.fecha}
                        type="button"
                        onClick={() => setFechaSeleccionada(cell.fecha!)}
                        className={cn(
                          'group min-h-20 sm:min-h-24 rounded-xl p-2 text-left transition-all duration-150 flex flex-col justify-between',
                          'border bg-surface hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                          seleccionado
                            ? 'relative z-10 border-brand/30 ring-2 ring-brand bg-brand-soft/70 shadow-sm'
                            : 'border-line/70 hover:border-brand/40 hover:bg-alt/30',
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className={cn(
                              'grid size-6 sm:size-7 place-items-center rounded-lg text-xs sm:text-sm font-bold transition-transform group-hover:scale-105',
                              esHoy
                                ? 'bg-brand text-white shadow-xs font-black'
                                : seleccionado
                                  ? 'bg-brand/15 text-brand font-black'
                                  : 'text-ink',
                            )}
                          >
                            {cell.dia}
                          </span>

                          {bloqueoTotal && (
                            <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-700 max-sm:hidden">
                              Cerrado
                            </span>
                          )}
                        </div>

                        {/* RESUMEN VISUAL DE TURNOS Y EXCEPCIONES */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {turnos.length > 0 && (
                            <span
                              title={`${turnos.length} turno${turnos.length === 1 ? '' : 'es'} habitual${turnos.length === 1 ? '' : 'es'}`}
                              className="size-2.5 rounded-full bg-brand ring-2 ring-white shadow-2xs"
                            />
                          )}

                          {tiposExcepcionUnicos.map(codigo => {
                            const estilo = getEstiloBloqueo(codigo)
                            return (
                              <span
                                key={`bloqueo-tipo-${codigo}`}
                                title={estilo.nombre}
                                className={cn('size-2.5 rounded-full ring-2 ring-white shadow-2xs', estilo.dotColor)}
                              />
                            )
                          })}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="min-w-0">
                <div className="sticky top-4 rounded-2xl border border-line bg-surface p-4 shadow-xs sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Día seleccionado</p>
                      <h3 className="mt-1 text-base font-bold text-ink">{fechaLarga(fechaSeleccionada)}</h3>
                    </div>
                  </div>

                  {bloqueosFechaSeleccionada.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {bloqueosFechaSeleccionada.map(bloqueo => {
                        const estilo = getEstiloBloqueo(bloqueo.tipoBloqueoCodigo)
                        return (
                          <div
                            key={bloqueo.id}
                            className={cn('rounded-xl border p-3 transition', estilo.cardClass)}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className={cn('size-2 rounded-full', estilo.dotColor)} />
                                <Badge tone={estilo.badgeTone}>
                                  {bloqueo.tipoBloqueoNombre}
                                </Badge>
                              </div>
                              {bloqueoCubreDiaCompleto(bloqueo, fechaSeleccionada) && (
                                <span className={cn('text-[11px] font-bold', estilo.textClass)}>Todo el día</span>
                              )}
                            </div>
                            <p className="mt-1.5 text-xs font-semibold text-ink">
                              {rangoBloqueo(bloqueo)}
                            </p>
                            {bloqueo.motivo && (
                              <p className="mt-1 text-xs text-muted">{bloqueo.motivo}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {bloqueoTotalFechaSeleccionada && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5">
                      <div className="flex items-start gap-2.5">
                        <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-rose-600" />
                        <div>
                          <p className="text-sm font-bold text-rose-900">Atención suspendida</p>
                          <p className="mt-1 text-xs leading-relaxed text-rose-800">
                            Existe una excepción que cubre todo el día. Los turnos habituales se conservan como referencia, pero no generan disponibilidad para citas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {turnosFechaSeleccionada.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-line bg-alt/50 p-5 text-center">
                      <Icon name={bloqueosFechaSeleccionada.length > 0 ? 'warning' : 'clock'} size={24} className="mx-auto text-muted" />
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {bloqueosFechaSeleccionada.length > 0
                          ? 'No hay turnos habituales para esta fecha'
                          : 'Sin atención habitual'}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {bloqueosFechaSeleccionada.length > 0
                          ? 'La excepción registrada se muestra arriba y sigue afectando el calendario.'
                          : horariosVisibles.length > 0
                            ? 'No existe un turno vigente para este día. Puedes revisar y editar los turnos configurados en el listado de abajo.'
                            : 'No existe un turno vigente para este día.'}
                      </p>
                    </div>
                    ) : (
                      <div className="mt-4 space-y-2.5">
                        {turnosFechaSeleccionada.map(horario => (
                          <div
                            key={horario.id}
                            className={cn(
                              'group rounded-xl border p-3.5 transition',
                              bloqueoTotalFechaSeleccionada
                                ? 'border-line bg-alt/70 opacity-70'
                                : 'border-line bg-surface hover:border-brand/40 hover:shadow-xs',
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-extrabold text-brand tabular-nums">
                                  {hora12(horario.horaInicio)} – {hora12(horario.horaFin)}
                                </p>
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                                  <Icon name="mapPin" size={13} className="shrink-0 text-muted" />
                                  <span className="truncate">{sedeNombre(horario.sedeId)}</span>
                                </div>
                                <p className="mt-1 text-[11px] text-muted">
                                  Vigencia: {fechaCorta(horario.fechaInicioVigencia)} – {horario.fechaFinVigencia ? fechaCorta(horario.fechaFinVigencia) : 'Indefinida'}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {bloqueoTotalFechaSeleccionada && <Badge tone="amber">Bloqueado</Badge>}
                                <button
                                  type="button"
                                  title="Editar turno"
                                  aria-label="Editar turno"
                                  onClick={() => abrirEditar(horario)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:bg-alt hover:text-brand"
                                >
                                  <Icon name="edit" size={15} />
                                </button>
                                <button
                                  type="button"
                                  title="Eliminar turno"
                                  aria-label="Eliminar turno"
                                  onClick={() => setConfirmar(horario)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

      <ConfirmDialog
        open={confirmar !== null}
        title="¿Eliminar horario de atención?"
        description={
          confirmar
            ? `¿Estás seguro de eliminar el turno de ${hora12(confirmar.horaInicio)} a ${hora12(confirmar.horaFin)} los días ${DIAS.find(d => d.value === String(confirmar.diaSemana))?.label.toLowerCase() ?? ''}? Dejará de estar disponible en la agenda.`
            : undefined
        }
        confirmLabel={procesando ? 'Eliminando…' : 'Eliminar horario'}
        cancelLabel="Cancelar"
        onCancel={() => {
          if (!procesando) setConfirmar(null)
        }}
        onConfirm={() => void desactivar()}
      />
    </>
  )
}
