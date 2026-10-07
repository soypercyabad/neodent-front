import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ActionsCell, AnimatedDatePicker, AnimatedSelect, Avatar,
  Badge, Button, Card, Checkbox, ClockTimePicker, ConfirmDialog, Icon,
  PageHead, Pagination, ProtectedImage, RowActions, TableFoot, Toast,  type ToastAviso,
} from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { scrollToTopOrElement } from '@/shared/lib/scroll'
import { useAuth } from '@/features/auth/model/useAuth'
import { bookingApi, type BookingBranch } from '@/features/appointments/api/bookingApi'
import { schedulesApi, type HorarioOdontologo,
  type HorarioOdontologoCatalogo, type HorarioOdontologoInput,
} from '../api/schedulesApi'
import { ScheduleAgendaTabs } from '../components/ScheduleAgendaTabs'
import { DIAS, calcularResumenVigencia, fechaCorta, hora12, hoyIso } from '../model/scheduleUtils'

type EstadoFiltro = 'todos' | 'vigentes' | 'proximos' | 'expirados'

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

const FORM_INICIAL: Formulario = {
  odontologoId: '',
  odontologoEspecialidadId: '',
  sedeId: '',
  diaSemana: '1',
  horaInicio: '08:00',
  horaFin: '13:00',
  fechaInicioVigencia: hoyIso(),
  fechaFinVigencia: '',
  sinFechaFin: true,
}

const PAGE_SIZE = 10

const OPCIONES_DIAS_FILTRO = [
  { value: '', label: 'Todos los días' },
  ...DIAS.map(d => ({ value: d.value, label: d.label })),
]

const horaCorta = (hora: string) => hora.slice(0, 5)

const nombreCompleto = (item: HorarioOdontologoCatalogo) =>
  [item.nombres, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(' ')

export function ScheduleHistoryPage() {
  const { accessToken } = useAuth()

  const [catalogo, setCatalogo] = useState<HorarioOdontologoCatalogo[]>([])
  const [sedes, setSedes] = useState<BookingBranch[]>([])
  const [horarios, setHorarios] = useState<HorarioOdontologo[]>([])

  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('todos')
  const [filtroOdontologoId, setFiltroOdontologoId] = useState('')
  const [filtroEspecialidadId, setFiltroEspecialidadId] = useState('')
  const [filtroSedeId, setFiltroSedeId] = useState('')
  const [filtroDia, setFiltroDia] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)

  const [form, setForm] = useState<Formulario>(FORM_INICIAL)
  const [editando, setEditando] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [confirmar, setConfirmar] = useState<HorarioOdontologo | null>(null)

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)

  // CARGAR DATOS
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
    ])
      .then(([catalogoData, sedesData, horariosData]) => {
        if (!activo) return
        setCatalogo(catalogoData)
        setSedes(sedesData)
        setHorarios(horariosData)
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

  // CATÁLOGO DE ODONTÓLOGOS ÚNICOS
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

  const especialidadesFiltradas = useMemo(() => {
    if (!filtroOdontologoId) {
      const map = new Map<number, string>()
      catalogo.forEach(c => map.set(c.especialidadId, c.especialidadNombre))
      return [...map.entries()].map(([id, nombre]) => ({ id, nombre }))
    }
    return catalogo
      .filter(item => String(item.odontologoId) === filtroOdontologoId)
      .map(item => ({ id: item.especialidadId, nombre: item.especialidadNombre }))
  }, [catalogo, filtroOdontologoId])

  const sedeNombre = (id: number) =>
    sedes.find(s => s.id === id)?.nombre ?? `Sede #${id}`

  const hoy = hoyIso()

  // CONJUNTO BASE CON FILTROS DE ODONTÓLOGO, ESPECIALIDAD, SEDE, DÍA Y BÚSQUEDA
  const horariosBase = useMemo(() => {
    const matchCat = new Map<number, HorarioOdontologoCatalogo>()
    catalogo.forEach(c => matchCat.set(c.odontologoEspecialidadId, c))

    return horarios.filter(h => {
      // Sede
      if (filtroSedeId && String(h.sedeId) !== filtroSedeId) return false

      // Día de la semana
      if (filtroDia && String(h.diaSemana) !== filtroDia) return false

      const cat = matchCat.get(h.odontologoEspecialidadId)

      // Odontólogo
      if (filtroOdontologoId && cat && String(cat.odontologoId) !== filtroOdontologoId) {
        return false
      }

      // Especialidad
      if (filtroEspecialidadId && cat && String(cat.especialidadId) !== filtroEspecialidadId) {
        return false
      }

      // Búsqueda libre
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim()
        const nombreDoc = cat ? nombreCompleto(cat).toLowerCase() : ''
        const espNombre = cat ? cat.especialidadNombre.toLowerCase() : ''
        const sNombre = sedeNombre(h.sedeId).toLowerCase()
        const diaNombre = (DIAS.find(d => Number(d.value) === h.diaSemana)?.label ?? '').toLowerCase()
        const coincide =
          nombreDoc.includes(q) ||
          espNombre.includes(q) ||
          sNombre.includes(q) ||
          diaNombre.includes(q)
        if (!coincide) return false
      }

      return true
    })
  }, [
    horarios,
    catalogo,
    filtroOdontologoId,
    filtroEspecialidadId,
    filtroSedeId,
    filtroDia,
    busqueda,
    sedes,
  ])

  // CONTEO POR ESTADO DINÁMICO (se adapta a los filtros seleccionados)
  const conteos = useMemo(() => {
    let vigentes = 0
    let proximos = 0
    let expirados = 0

    horariosBase.forEach(h => {
      if (h.fechaFinVigencia && h.fechaFinVigencia < hoy) {
        expirados++
      } else if (h.fechaInicioVigencia > hoy) {
        proximos++
      } else {
        vigentes++
      }
    })

    return {
      todos: horariosBase.length,
      vigentes,
      proximos,
      expirados,
    }
  }, [horariosBase, hoy])

  // FILTRADO FINAL APLICANDO EL SELECTOR DE ESTADO
  const horariosFiltrados = useMemo(() => {
    if (filtroEstado === 'todos') return horariosBase

    return horariosBase.filter(h => {
      const expirado = Boolean(h.fechaFinVigencia && h.fechaFinVigencia < hoy)
      const proximo = Boolean(h.fechaInicioVigencia > hoy)
      const vigente = !expirado && !proximo

      if (filtroEstado === 'vigentes') return vigente
      if (filtroEstado === 'proximos') return proximo
      if (filtroEstado === 'expirados') return expirado
      return true
    })
  }, [horariosBase, filtroEstado, hoy])

  // ORDENAMIENTO INTERACTIVO
  const [sortColumn, setSortColumn] = useState<string>('fechaInicioVigencia')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(colKey)
      setSortDirection('asc')
    }
    setPagina(1)
  }

  const horariosOrdenados = useMemo(() => {
    const list = [...horariosFiltrados]
    if (!sortColumn) return list
    const dir = sortDirection === 'asc' ? 1 : -1

    return list.sort((a, b) => {
      const docA = catalogo.find(c => c.odontologoEspecialidadId === a.odontologoEspecialidadId)
      const docB = catalogo.find(c => c.odontologoEspecialidadId === b.odontologoEspecialidadId)

      if (sortColumn === 'odontologo') {
        const nomA = docA ? `${docA.nombres} ${docA.apellidoPaterno}` : ''
        const nomB = docB ? `${docB.nombres} ${docB.apellidoPaterno}` : ''
        return nomA.localeCompare(nomB, 'es') * dir
      }
      if (sortColumn === 'especialidad') {
        const espA = docA?.especialidadNombre || ''
        const espB = docB?.especialidadNombre || ''
        return espA.localeCompare(espB, 'es') * dir
      }
      if (sortColumn === 'sede') {
        const sedeA = sedes.find(s => s.id === a.sedeId)?.nombre || ''
        const sedeB = sedes.find(s => s.id === b.sedeId)?.nombre || ''
        return sedeA.localeCompare(sedeB, 'es') * dir
      }
      if (sortColumn === 'diaSemana') {
        return (a.diaSemana - b.diaSemana) * dir
      }
      if (sortColumn === 'horaInicio') {
        return a.horaInicio.localeCompare(b.horaInicio) * dir
      }
      if (sortColumn === 'fechaInicioVigencia') {
        return a.fechaInicioVigencia.localeCompare(b.fechaInicioVigencia) * dir
      }
      return 0
    })
  }, [horariosFiltrados, sortColumn, sortDirection, catalogo, sedes])

  // PAGINACIÓN
  const totalPaginas = Math.max(1, Math.ceil(horariosOrdenados.length / PAGE_SIZE))
  const horariosPaginados = useMemo(() => {
    const start = (pagina - 1) * PAGE_SIZE
    return horariosOrdenados.slice(start, start + PAGE_SIZE)
  }, [horariosOrdenados, pagina])

  // RESUMEN INTELIGENTE DE VIGENCIA EN FORMULARIO
  const resumenVigencia = useMemo(() => {
    if (!form.diaSemana || !form.fechaInicioVigencia) return null
    return calcularResumenVigencia(
      Number(form.diaSemana),
      form.fechaInicioVigencia,
      form.sinFechaFin ? null : form.fechaFinVigencia || null,
    )
  }, [form.diaSemana, form.fechaInicioVigencia, form.fechaFinVigencia, form.sinFechaFin])

  // OPCIONES PARA FORMULARIO
  const opcionesEspecialidadesForm = useMemo(() => {
    if (!form.odontologoId) return []
    return catalogo
      .filter(item => String(item.odontologoId) === form.odontologoId)
      .map(e => ({
        value: String(e.odontologoEspecialidadId),
        label: e.especialidadNombre,
      }))
  }, [catalogo, form.odontologoId])

  // ABRIR FORMULARIO NUEVO
  const abrirNuevo = () => {
    const defaultDoc = listaOdontologos[0] ? String(listaOdontologos[0].odontologoId) : ''
    const espList = catalogo.filter(c => String(c.odontologoId) === defaultDoc)
    const defaultEsp = espList[0] ? String(espList[0].odontologoEspecialidadId) : ''
    const defaultSede = sedes[0] ? String(sedes[0].id) : ''

    setForm({
      ...FORM_INICIAL,
      odontologoId: defaultDoc,
      odontologoEspecialidadId: defaultEsp,
      sedeId: defaultSede,
      diaSemana: '1',
      horaInicio: '08:00',
      horaFin: '13:00',
      fechaInicioVigencia: hoyIso(),
      sinFechaFin: true,
      fechaFinVigencia: '',
    })
    setEditando(null)
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  // ABRIR FORMULARIO EDITAR
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
    scrollToTopOrElement()
  }

  const cerrarForm = () => {
    if (guardandoRef.current) return
    setMostrarForm(false)
    setEditando(null)
  }

  // GUARDAR
  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!accessToken || guardandoRef.current) return
    guardandoRef.current = true
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

      setMostrarForm(false)
      setEditando(null)
      setAviso({
        tipo: 'success',
        texto: esNuevo
          ? 'Horario de atención registrado correctamente.'
          : 'Horario de atención actualizado correctamente.',
      })
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo guardar el horario.',
      })
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  // DESACTIVAR
  const desactivar = async () => {
    if (!accessToken || !confirmar || procesando) return

    setProcesando(true)

    try {
      await schedulesApi.desactivar(accessToken, confirmar.id)
      setHorarios(actual => actual.filter(h => h.id !== confirmar.id))
      setConfirmar(null)
      setAviso({ tipo: 'success', texto: 'Horario desactivado correctamente.' })
    } catch (err) {
      setConfirmar(null)
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo desactivar el horario.',
      })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <PageHead
        title="Historial de cronogramas"
        description="Administra la plantilla completa de turnos semanales de los odontólogos con control de vigencia."
      />

      <ScheduleAgendaTabs />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* MODAL CREAR / EDITAR HORARIO */}
      <AnimatePresence>
        {mostrarForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
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
              className="relative z-10 w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    {editando === null ? 'Nuevo horario de atención' : 'Editar horario de atención'}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Define el turno semanal y el periodo exacto durante el cual estará vigente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cerrarForm}
                  className="rounded-lg p-1.5 text-muted hover:bg-alt hover:text-ink"
                  aria-label="Cerrar modal"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              <form onSubmit={guardar} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-2">
                  <AnimatedSelect
                    value={form.odontologoId}
                    options={listaOdontologos.map(item => ({
                      value: String(item.odontologoId),
                      label: `Dr(a). ${nombreCompleto(item)}`,
                    }))}
                    onChange={value => {
                      const espDoctor = catalogo.filter(item => String(item.odontologoId) === value)
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
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <AnimatedSelect
                    value={form.odontologoEspecialidadId}
                    options={opcionesEspecialidadesForm}
                    onChange={value =>
                      setForm(actual => ({ ...actual, odontologoEspecialidadId: value }))
                    }
                    label="Especialidad"
                    disabled={guardando || !form.odontologoId}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <AnimatedSelect
                    value={form.sedeId}
                    options={sedes.map(s => ({ value: String(s.id), label: s.nombre }))}
                    onChange={value => setForm(actual => ({ ...actual, sedeId: value }))}
                    label="Sede"
                    disabled={guardando}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-2">
                  <AnimatedSelect
                    value={form.diaSemana}
                    options={DIAS.map(d => ({ value: d.value, label: d.label }))}
                    onChange={value => setForm(actual => ({ ...actual, diaSemana: value }))}
                    label="Día de atención"
                    disabled={guardando}
                  />
                </div>

                <div className="min-w-0 sm:col-span-1 lg:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Hora de inicio</span>
                  <ClockTimePicker
                    value={form.horaInicio}
                    onChange={value => setForm(actual => ({ ...actual, horaInicio: value }))}
                    label="Hora de inicio"
                    disabled={guardando}
                  />
                </div>

                <div className="min-w-0 sm:col-span-1 lg:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Hora de fin</span>
                  <ClockTimePicker
                    value={form.horaFin}
                    onChange={value => setForm(actual => ({ ...actual, horaFin: value }))}
                    label="Hora de fin"
                    disabled={guardando}
                  />
                </div>

                <div className="min-w-0 sm:col-span-1 lg:col-span-2">
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

                <div className="min-w-0 sm:col-span-1 lg:col-span-2">
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
                        fechaFinVigencia: event.target.checked ? '' : actual.fechaFinVigencia,
                      }))
                    }
                    label="Mantener este horario sin fecha final (indefinido)"
                    disabled={guardando}
                  />
                </div>

                {/* ALERTA INTELIGENTE DE VIGENCIA Y AJUSTE RÁPIDO */}
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

      {/* TARJETA DE CONTROL Y TABLA */}
      <Card className="overflow-visible">
        {/* ENCABEZADO Y FILTROS */}
        <div className="border-b border-line p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink sm:text-lg">Plantilla de cronogramas</h2>
              <p className="mt-1 text-xs text-muted">
                Listado integral de turnos configurados con filtros de odontólogo, sede y estado de vigencia.
              </p>
            </div>

            <Button icon="plus" onClick={abrirNuevo}>
              Nuevo horario
            </Button>
          </div>

          {/* SELECTOR DE ESTADO (PILLS) */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
            <span className="mr-1 text-xs font-semibold text-muted">Estado:</span>
            {(
              [
                ['todos', `Todos (${conteos.todos})`],
                ['vigentes', `Vigentes (${conteos.vigentes})`],
                ['proximos', `Próximos (${conteos.proximos})`],
                ['expirados', `Expirados (${conteos.expirados})`],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setFiltroEstado(val)
                  setPagina(1)
                }}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                  filtroEstado === val
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-alt text-muted hover:bg-alt/80 hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* BARRA DE FILTROS SECUNDARIOS */}
          <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <AnimatedSelect
              value={filtroOdontologoId}
              options={[{ value: '', label: 'Todos los odontólogos' }, ...listaOdontologos.map(item => ({
                value: String(item.odontologoId),
                label: `Dr(a). ${nombreCompleto(item)}`,
              }))]}
              onChange={value => {
                setFiltroOdontologoId(value)
                setFiltroEspecialidadId('')
                setPagina(1)
              }}
              label="Odontólogo"
            />

            <AnimatedSelect
              value={filtroEspecialidadId}
              options={[
                { value: '', label: 'Todas las especialidades' },
                ...especialidadesFiltradas.map(e => ({ value: String(e.id), label: e.nombre })),
              ]}
              onChange={value => {
                setFiltroEspecialidadId(value)
                setPagina(1)
              }}
              label="Especialidad"
            />

            <AnimatedSelect
              value={filtroSedeId}
              options={[{ value: '', label: 'Todas las sedes' }, ...sedes.map(s => ({ value: String(s.id), label: s.nombre }))]}
              onChange={value => {
                setFiltroSedeId(value)
                setPagina(1)
              }}
              label="Sede"
            />

            <AnimatedSelect
              value={filtroDia}
              options={OPCIONES_DIAS_FILTRO}
              onChange={value => {
                setFiltroDia(value)
                setPagina(1)
              }}
              label="Día de la semana"
            />

            <div className="relative flex items-center">
              <input
                type="text"
                value={busqueda}
                onChange={e => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
                placeholder="Buscar por día, hora o doctor…"
                aria-label="Buscar cronogramas"
                className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-xs font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
              <Icon name="search" size={15} className="absolute left-3 text-muted pointer-events-none" />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('')
                    setPagina(1)
                  }}
                  className="absolute right-3 text-muted hover:text-ink cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CONTENIDO DE LA TABLA */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted">
            <Icon name="spinner" size={22} className="animate-spin text-brand" />
            Cargando historial de cronogramas…
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p role="alert" className="text-sm text-danger">{error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => setActualizacion(n => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : horariosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="clock" size={38} className="mx-auto text-muted/60" />
            <p className="mt-3 font-semibold text-ink">No se encontraron cronogramas registrados</p>
            <p className="mt-1 text-xs text-muted">
              {filtroEstado !== 'todos' || filtroOdontologoId || filtroSedeId || busqueda
                ? 'Prueba a cambiar o limpiar los filtros seleccionados.'
                : 'Registra el primer horario para un especialista pulsando «Nuevo horario».'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-alt/40 text-[11px] font-bold uppercase tracking-wider text-muted">
                    {[
                      { key: 'odontologo', label: 'Odontólogo', className: 'pl-5' },
                      { key: 'especialidad', label: 'Especialidad' },
                      { key: 'sede', label: 'Sede' },
                      { key: 'diaSemana', label: 'Día' },
                      { key: 'horaInicio', label: 'Horario' },
                      { key: 'fechaInicioVigencia', label: 'Vigencia' },
                    ].map(col => {
                      const isSorted = sortColumn === col.key
                      return (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            'py-3.5 px-4 cursor-pointer select-none transition-colors hover:bg-alt/80 group',
                            isSorted ? 'text-brand font-extrabold bg-brand-soft/20' : 'text-muted',
                            col.className,
                          )}
                          title={`Ordenar por ${col.label}`}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <span>{col.label}</span>
                            <span className={cn('inline-flex items-center transition-colors', isSorted ? 'text-brand' : 'text-muted/40 group-hover:text-muted')}>
                              {isSorted ? (
                                sortDirection === 'asc' ? <Icon name="chevronUp" size={13} strokeWidth={2.5} /> : <Icon name="chevronDown" size={13} strokeWidth={2.5} />
                              ) : (
                                <Icon name="chevronsUpDown" size={12} strokeWidth={1.8} />
                              )}
                            </span>
                          </div>
                        </th>
                      )
                    })}
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="py-3.5 pl-4 pr-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {horariosPaginados.map(horario => {
                    const matchDoc = catalogo.find(
                      c => c.odontologoEspecialidadId === horario.odontologoEspecialidadId,
                    )
                    const diaInfo = DIAS.find(d => Number(d.value) === horario.diaSemana)
                    const expirado = Boolean(horario.fechaFinVigencia && horario.fechaFinVigencia < hoy)
                    const proximo = Boolean(horario.fechaInicioVigencia > hoy)

                    return (
                      <tr
                        key={horario.id}
                        className={cn(
                          'transition hover:bg-alt/30',
                          expirado && 'bg-alt/10 text-muted',
                        )}
                      >
                        {/* ODONTÓLOGO */}
                        <td className="py-3.5 pl-5 pr-4">
                          <div className="flex items-center gap-3">
                            {matchDoc ? (
                              matchDoc.tieneFoto ? (
                                <div className="size-9 shrink-0 overflow-hidden rounded-full border border-line bg-alt shadow-2xs">
                                  <ProtectedImage
                                    path={`/api/odontologos/${matchDoc.odontologoId}/foto`}
                                    accessToken={accessToken}
                                    alt={`Dr(a). ${nombreCompleto(matchDoc)}`}
                                    className="size-full object-cover"
                                    fallback={
                                      <Avatar
                                        nombre={matchDoc.nombres}
                                        apellido={matchDoc.apellidoPaterno}
                                        seed={matchDoc.odontologoId}
                                        size={36}
                                        animate="hover"
                                        trackCursor={false}
                                      />
                                    }
                                  />
                                </div>
                              ) : (
                                <Avatar
                                  nombre={matchDoc.nombres}
                                  apellido={matchDoc.apellidoPaterno}
                                  seed={matchDoc.odontologoId}
                                  size={36}
                                  animate="hover"
                                  trackCursor={false}
                                />
                              )
                            ) : null}

                            <div className="min-w-0">
                              <p className="font-bold text-ink">
                                Dr(a). {matchDoc ? nombreCompleto(matchDoc) : `ID #${horario.odontologoEspecialidadId}`}
                              </p>
                              {matchDoc?.numeroColegiatura && (
                                <p className="mt-0.5 text-xs text-muted">
                                  COP: {matchDoc.numeroColegiatura}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ESPECIALIDAD */}
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-ink">
                            {matchDoc?.especialidadNombre ?? '—'}
                          </span>
                        </td>

                        {/* SEDE */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-muted">
                            <Icon name="mapPin" size={13} className="shrink-0 text-muted" />
                            <span className="truncate">{sedeNombre(horario.sedeId)}</span>
                          </div>
                        </td>

                        {/* DÍA */}
                        <td className="px-4 py-3.5">
                          <span className="inline-block rounded-md bg-brand-soft px-2 py-0.5 font-bold uppercase text-brand">
                            {diaInfo?.label ?? `Día ${horario.diaSemana}`}
                          </span>
                        </td>

                        {/* HORARIO */}
                        <td className="px-4 py-3.5">
                          <span className="font-bold tabular-nums text-ink">
                            {hora12(horario.horaInicio)} – {hora12(horario.horaFin)}
                          </span>
                        </td>

                        {/* VIGENCIA */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5 text-[11px]">
                            <p>
                              <span className="text-muted">Desde:</span>{' '}
                              <strong className="text-ink">{fechaCorta(horario.fechaInicioVigencia)}</strong>
                            </p>
                            <p>
                              <span className="text-muted">Hasta:</span>{' '}
                              <strong className="text-ink">
                                {horario.fechaFinVigencia ? fechaCorta(horario.fechaFinVigencia) : 'Indefinida'}
                              </strong>
                            </p>
                          </div>
                        </td>

                        {/* ESTADO */}
                        <td className="px-4 py-3.5">
                          {expirado ? (
                            <Badge tone="red">Expirado</Badge>
                          ) : proximo ? (
                            <Badge tone="amber">Próximo</Badge>
                          ) : (
                            <Badge tone="green">Vigente</Badge>
                          )}
                        </td>

                        {/* ACCIONES */}
                        <ActionsCell align="right" className="py-3.5 pl-4 pr-5">
                          <RowActions
                            actions={[
                              {
                                label: 'Editar horario',
                                icon: 'edit',
                                onClick: () => abrirEditar(horario),
                              },
                              {
                                label: 'Eliminar horario',
                                icon: 'trash',
                                onClick: () => setConfirmar(horario),
                                variant: 'danger',
                              },
                            ]}
                          />
                        </ActionsCell>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* PIE DE TABLA Y PAGINACIÓN */}
            <TableFoot
              summary={`Mostrando ${horariosFiltrados.length === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1}–${Math.min(pagina * PAGE_SIZE, horariosFiltrados.length)} de ${horariosFiltrados.length} cronogramas`}
            >
              {totalPaginas > 1 && (
                <Pagination
                  page={pagina}
                  totalPages={totalPaginas}
                  onChange={setPagina}
                />
              )}
            </TableFoot>
          </>
        )}
      </Card>

      {/* DIÁLOGO DE CONFIRMACIÓN PARA ELIMINAR */}
      <ConfirmDialog
        open={confirmar !== null}
        title="¿Eliminar horario de atención?"
        description={
          confirmar
            ? `¿Estás seguro de eliminar el turno de ${hora12(confirmar.horaInicio)} a ${hora12(confirmar.horaFin)} los días ${DIAS.find(d => Number(d.value) === confirmar.diaSemana)?.label ?? ''}? Dejará de estar disponible en la agenda.`
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
