import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ActionsCell, AnimatedDatePicker, AnimatedSelect, Avatar,
  Badge, Button, Card, Checkbox, ClockTimePicker, ConfirmDialog, Icon,
  PageHead, Pagination, ProtectedImage, RowActions, SearchInput, TableFoot, Toast, Tooltip, type ToastAviso,
} from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { scrollToTopOrElement } from '@/shared/lib/scroll'
import { useAuth } from '@/features/auth/model/useAuth'
import { bookingApi, type BookingBranch } from '@/features/appointments/api/bookingApi'
import {
  schedulesApi, type HorarioOdontologo,
  type HorarioOdontologoCatalogo, type HorarioOdontologoInput,
} from '../api/schedulesApi'
import { ScheduleAgendaTabs } from '../components/ScheduleAgendaTabs'
import { DIAS, calcularResumenVigencia, fechaCorta, finMes, hora12, hoyIso } from '../model/scheduleUtils'

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
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [sortColumn, setSortColumn] = useState<string>('fechaInicioVigencia')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [totalElementos, setTotalElementos] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [esBackendPaginado, setEsBackendPaginado] = useState(false)
  const [conteosBackend, setConteosBackend] = useState<{
    todos: number
    vigentes: number
    proximos: number
    expirados: number
  }>({
    todos: 0,
    vigentes: 0,
    proximos: 0,
    expirados: 0,
  })

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

  // DEBOUNCE DE BÚSQUEDA (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setBusquedaDebounced(busqueda.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [busqueda])

  // CARGAR CATÁLOGOS BASE (Odontólogos y Sedes)
  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setError('No se encontró una sesión activa.')
      return
    }

    let activo = true
    setError('')

    Promise.all([
      schedulesApi.catalogoOdontologos(accessToken),
      bookingApi.sedes(accessToken),
    ])
      .then(([catalogoData, sedesData]) => {
        if (!activo) return
        setCatalogo(catalogoData)
        setSedes(sedesData)
      })
      .catch(e => {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los catálogos.')
        }
      })

    return () => {
      activo = false
    }
  }, [accessToken, actualizacion])

  // CARGAR HORARIOS CON PAGINACIÓN DESDE EL BACKEND
  useEffect(() => {
    if (!accessToken) return

    let activo = true
    setBuscando(true)

    schedulesApi
      .listarPaginado(accessToken, {
        page: pagina - 1,
        size: PAGE_SIZE,
        buscar: busquedaDebounced || undefined,
        sedeId: filtroSedeId ? Number(filtroSedeId) : undefined,
        diaSemana: filtroDia ? Number(filtroDia) : undefined,
        odontologoId: filtroOdontologoId ? Number(filtroOdontologoId) : undefined,
        especialidadId: filtroEspecialidadId ? Number(filtroEspecialidadId) : undefined,
        estado:
          filtroEstado === 'vigentes'
            ? 'VIGENTE'
            : filtroEstado === 'proximos'
              ? 'PROXIMO'
              : filtroEstado === 'expirados'
                ? 'EXPIRADO'
                : undefined,
        sortBy: sortColumn,
        direction: sortDirection,
      })
      .then(data => {
        if (!activo) return
        if ('contenido' in data) {
          setHorarios(data.contenido)
          setTotalElementos(data.totalElementos)
          setTotalPaginas(Math.max(1, data.totalPaginas))
          setEsBackendPaginado(true)
        } else {
          setHorarios(data)
          setEsBackendPaginado(false)
        }
      })
      .catch(e => {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los horarios.')
        }
      })
      .finally(() => {
        if (activo) {
          setBuscando(false)
          setLoading(false)
        }
      })

    return () => {
      activo = false
    }
  }, [
    accessToken,
    pagina,
    busquedaDebounced,
    filtroSedeId,
    filtroDia,
    filtroOdontologoId,
    filtroEspecialidadId,
    filtroEstado,
    sortColumn,
    sortDirection,
    actualizacion,
  ])

  // CARGAR CONTEOS POR ESTADO DESDE EL BACKEND
  useEffect(() => {
    if (!accessToken) return

    let activo = true
    schedulesApi
      .resumenEstados(accessToken, {
        buscar: busquedaDebounced || undefined,
        sedeId: filtroSedeId ? Number(filtroSedeId) : undefined,
        diaSemana: filtroDia ? Number(filtroDia) : undefined,
        odontologoId: filtroOdontologoId ? Number(filtroOdontologoId) : undefined,
        especialidadId: filtroEspecialidadId ? Number(filtroEspecialidadId) : undefined,
      })
      .then(res => {
        if (!activo) return
        setConteosBackend(res)
      })
      .catch(() => {
        // Fallback en caso de error
      })

    return () => {
      activo = false
    }
  }, [
    accessToken,
    busquedaDebounced,
    filtroSedeId,
    filtroDia,
    filtroOdontologoId,
    filtroEspecialidadId,
    actualizacion,
  ])

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

  // CONJUNTO BASE CON FILTROS (Fallback cliente)
  const horariosBase = useMemo(() => {
    if (esBackendPaginado) return horarios

    const matchCat = new Map<number, HorarioOdontologoCatalogo>()
    catalogo.forEach(c => matchCat.set(c.odontologoEspecialidadId, c))

    return horarios.filter(h => {
      if (filtroSedeId && String(h.sedeId) !== filtroSedeId) return false
      if (filtroDia && String(h.diaSemana) !== filtroDia) return false

      const cat = matchCat.get(h.odontologoEspecialidadId)
      if (filtroOdontologoId && cat && String(cat.odontologoId) !== filtroOdontologoId) {
        return false
      }
      if (filtroEspecialidadId && cat && String(cat.especialidadId) !== filtroEspecialidadId) {
        return false
      }

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
          diaNombre.includes(q) ||
          (cat?.numeroColegiatura && cat.numeroColegiatura.toLowerCase().includes(q)) ||
          h.horaInicio.includes(q) ||
          h.horaFin.includes(q)
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
    esBackendPaginado,
  ])

  // CONTEO POR ESTADO
  const conteos = useMemo(() => {
    if (esBackendPaginado) {
      return conteosBackend
    }

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
  }, [horariosBase, hoy, esBackendPaginado, conteosBackend])

  // FILTRADO FINAL (Fallback cliente)
  const horariosFiltrados = useMemo(() => {
    if (esBackendPaginado) return horarios
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
  }, [horariosBase, filtroEstado, hoy, esBackendPaginado, horarios])

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
    if (esBackendPaginado) return horarios
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
  }, [horariosFiltrados, sortColumn, sortDirection, catalogo, sedes, esBackendPaginado, horarios])

  // TOTALES Y REGISTROS FINALES A MOSTRAR
  const totalPaginasFinal = esBackendPaginado
    ? totalPaginas
    : Math.max(1, Math.ceil(horariosOrdenados.length / PAGE_SIZE))

  const totalElementosFinal = esBackendPaginado
    ? totalElementos
    : horariosFiltrados.length

  const horariosAMostrar = useMemo(() => {
    if (esBackendPaginado) return horarios
    const start = (pagina - 1) * PAGE_SIZE
    return horariosOrdenados.slice(start, start + PAGE_SIZE)
  }, [esBackendPaginado, horarios, horariosOrdenados, pagina])

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
    const defaultDoc =
      filtroOdontologoId ||
      (listaOdontologos[0] ? String(listaOdontologos[0].odontologoId) : '')
    const espList = catalogo.filter(c => String(c.odontologoId) === defaultDoc)
    const defaultEsp =
      filtroEspecialidadId && espList.some(e => String(e.odontologoEspecialidadId) === filtroEspecialidadId)
        ? filtroEspecialidadId
        : espList[0]
          ? String(espList[0].odontologoEspecialidadId)
          : ''
    const defaultSede = filtroSedeId || (sedes[0] ? String(sedes[0].id) : '')

    setForm({
      ...FORM_INICIAL,
      odontologoId: defaultDoc,
      odontologoEspecialidadId: defaultEsp,
      sedeId: defaultSede,
      diaSemana: filtroDia || '1',
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
      setActualizacion(a => a + 1)
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
      setActualizacion(a => a + 1)
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
              className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-brand/20 bg-brand-soft/30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                    <Icon name="clock" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      {editando === null ? 'Registrar horario de atención' : 'Editar horario de atención'}
                    </h3>
                    <p className="text-xs text-muted">
                      Define el especialista, sede, jornada semanal y vigencia temporal del turno.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cerrarForm}
                  className="rounded-lg p-1.5 text-muted hover:bg-alt hover:text-ink transition-colors"
                  aria-label="Cerrar modal"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              <form onSubmit={guardar} className="p-6 space-y-4">
                {/* PANEL 1: ESPECIALISTA Y SEDE */}
                <div className="rounded-xl border border-line bg-alt/30 p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">1</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Profesional, Especialidad y Sede <span className="text-danger">*</span>
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-bold text-ink">Odontólogo</span>
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
                    <div>
                      <span className="mb-1.5 block text-xs font-bold text-ink">Especialidad</span>
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
                    <div>
                      <span className="mb-1.5 block text-xs font-bold text-ink">Sede</span>
                      <AnimatedSelect
                        value={form.sedeId}
                        options={sedes.map(s => ({ value: String(s.id), label: s.nombre }))}
                        onChange={value => setForm(actual => ({ ...actual, sedeId: value }))}
                        label="Sede"
                        disabled={guardando}
                      />
                    </div>
                  </div>
                </div>

                {/* PANEL 2: JORNADA Y HORAS */}
                <div className="rounded-xl border border-line bg-alt/30 p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">2</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Jornada Semanal y Horario del Turno <span className="text-danger">*</span>
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <span className="mb-1.5 block text-xs font-bold text-ink">Día de la semana</span>
                      <AnimatedSelect
                        value={form.diaSemana}
                        options={DIAS.map(d => ({ value: d.value, label: d.label }))}
                        onChange={value => setForm(actual => ({ ...actual, diaSemana: value }))}
                        label="Día de la semana"
                        disabled={guardando}
                      />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-xs font-bold text-ink">Hora de inicio</span>
                      <ClockTimePicker
                        value={form.horaInicio}
                        onChange={value => setForm(actual => ({ ...actual, horaInicio: value }))}
                        label="Hora de inicio"
                        disabled={guardando}
                      />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-xs font-bold text-ink">Hora de fin</span>
                      <ClockTimePicker
                        value={form.horaFin}
                        onChange={value => setForm(actual => ({ ...actual, horaFin: value }))}
                        label="Hora de fin"
                        disabled={guardando}
                      />
                    </div>
                  </div>
                </div>

                {/* PANEL 3: VIGENCIA */}
                <div className="rounded-xl border border-line bg-alt/30 p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">3</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Período de Vigencia del Horario <span className="text-danger">*</span>
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="mb-1.5 block text-xs font-bold text-ink">Vigente desde</span>
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
                        position="top"
                        disabled={guardando}
                      />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-xs font-bold text-ink">Vigente hasta</span>
                      <AnimatedDatePicker
                        value={form.sinFechaFin ? '' : form.fechaFinVigencia}
                        onChange={value => setForm(actual => ({ ...actual, fechaFinVigencia: value }))}
                        min={form.fechaInicioVigencia || undefined}
                        label="Fin de vigencia"
                        position="top"
                        disabled={guardando || form.sinFechaFin}
                        placeholder={form.sinFechaFin ? 'Indefinido' : 'dd/mm/aaaa'}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Checkbox
                        checked={form.sinFechaFin}
                        onChange={event =>
                          setForm(actual => ({
                            ...actual,
                            sinFechaFin: event.target.checked,
                            fechaFinVigencia: event.target.checked
                              ? ''
                              : actual.fechaFinVigencia || finMes(actual.fechaInicioVigencia.slice(0, 7)),
                          }))
                        }
                        label="Mantener este horario sin fecha final (indefinido)"
                        disabled={guardando}
                      />
                      <p className="mt-1 text-[11px] text-muted">
                        El turno se programará semanalmente de forma continua hasta que sea modificado o desactivado.
                      </p>
                    </div>
                  </div>

                  {form.sinFechaFin && (
                    <div className="mt-3 rounded-xl border border-line/80 bg-surface p-3.5 text-xs flex items-start gap-2.5 text-ink-soft">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-success" />
                      <div className="min-w-0">
                        <p className="font-bold text-ink">Turno semanal permanente</p>
                        <p className="mt-0.5 text-muted">
                          Se programará cada{' '}
                          <strong className="text-brand">
                            {DIAS.find(d => String(d.value) === String(form.diaSemana))?.label}
                          </strong>{' '}
                          a partir del <strong>{fechaCorta(form.fechaInicioVigencia)}</strong> de forma indefinida.
                        </p>
                      </div>
                    </div>
                  )}

                  {resumenVigencia && !form.sinFechaFin && form.fechaFinVigencia && !resumenVigencia.esIndefinido && (
                    <div className="mt-3 rounded-lg border border-line bg-surface p-3 text-xs">
                      {resumenVigencia.aviso && (
                        <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 p-2.5 text-amber-900">
                          <Icon name="warning" size={16} className="mt-0.5 shrink-0 text-amber-600" />
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
                                className="mt-1 inline-flex items-center gap-1 font-bold text-brand hover:underline"
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
                                ` (primer turno: ${fechaCorta(resumenVigencia.primerDia)}${resumenVigencia.count > 1 ? ` · último: ${fechaCorta(resumenVigencia.ultimoDia!)}` : ''
                                })`}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-line/60">
                  <Button variant="outline" onClick={cerrarForm} disabled={guardando}>
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

            <SearchInput
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onClear={() => {
                setBusqueda('')
                setPagina(1)
              }}
              loading={buscando}
              placeholder="Buscar por día, hora, doctor o especialidad…"
              aria-label="Buscar cronogramas"
              className="w-full"
            />
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
        ) : totalElementosFinal === 0 ? (
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
                        >
                          <Tooltip content={`Ordenar por ${col.label}`}>
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
                          </Tooltip>
                        </th>
                      )
                    })}
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="py-3.5 pl-4 pr-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {horariosAMostrar.map(horario => {
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
                                  {matchDoc.numeroColegiatura}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ESPECIALIDAD */}
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-ink">
                            {matchDoc?.especialidadNombre ?? '-'}
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
                            {hora12(horario.horaInicio)} - {hora12(horario.horaFin)}
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
              summary={
                totalElementosFinal === 0
                  ? 'No se encontraron cronogramas'
                  : `Mostrando ${(pagina - 1) * PAGE_SIZE + 1}-${Math.min(pagina * PAGE_SIZE, totalElementosFinal)} de ${totalElementosFinal} cronogramas`
              }
            >
              {totalPaginasFinal > 1 && (
                <Pagination
                  page={pagina}
                  totalPages={totalPaginasFinal}
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
