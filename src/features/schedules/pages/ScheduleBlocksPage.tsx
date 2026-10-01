import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AnimatedDatePicker,
  AnimatedSelect,
  Badge,
  Button,
  Card,
  Checkbox,
  ClockTimePicker,
  ConfirmDialog,
  Icon,
  PageHead,
  Pagination,
  TableFoot,
  Toast,
  type ToastAviso,
} from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/model/useAuth'
import { bookingApi, type BookingBranch } from '@/features/appointments/api/bookingApi'
import { blocksApi, type AgendaBlock, type CreateAgendaBlock } from '../api/blocksApi'
import { blockTypesApi, type BlockType } from '../api/blockTypesApi'
import { schedulesApi, type HorarioOdontologoCatalogo } from '../api/schedulesApi'
import { ScheduleAgendaTabs } from '../components/ScheduleAgendaTabs'

type Formulario = {
  tipoBloqueoId: string
  odontologoId: string
  sedeId: string
  diaCompleto: boolean
  fechaInicio: string
  fechaFin: string
  horaInicio: string
  horaFin: string
  motivo: string
}

const FORM_INICIAL: Formulario = {
  tipoBloqueoId: '',
  odontologoId: '',
  sedeId: '',
  diaCompleto: true,
  fechaInicio: '',
  fechaFin: '',
  horaInicio: '08:00',
  horaFin: '18:00',
  motivo: '',
}

const PAGE_SIZE = 6

const pad = (value: number) => String(value).padStart(2, '0')

const hoyIso = () => {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const sumarDias = (iso: string, dias: number) => {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + dias)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const nombreOdontologo = (item: HorarioOdontologoCatalogo) =>
  [item.nombres, item.apellidoPaterno, item.apellidoMaterno].filter(Boolean).join(' ')

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))

const fechaHoraCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

const esMedianoche = (fecha: string) => {
  const hora = fecha.split('T')[1] ?? ''
  return hora === '00:00' || hora === '00:00:00'
}

const tonoTipo = (codigo: string): 'blue' | 'amber' | 'green' | 'red' | 'gray' => {
  if (codigo === 'FERIADO') return 'red'
  if (codigo === 'VACACIONES') return 'amber'
  if (codigo === 'CAPACITACION') return 'blue'
  if (codigo === 'PERMISO') return 'blue'
  if (codigo === 'CIERRE_SEDE') return 'gray'
  return 'gray'
}

export function ScheduleBlocksPage() {
  const { accessToken } = useAuth()
  const [tipos, setTipos] = useState<BlockType[]>([])
  const [catalogo, setCatalogo] = useState<HorarioOdontologoCatalogo[]>([])
  const [sedes, setSedes] = useState<BookingBranch[]>([])
  const [bloqueos, setBloqueos] = useState<AgendaBlock[]>([])

  const [filtroOdontologo, setFiltroOdontologo] = useState('')
  const [filtroSede, setFiltroSede] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<'vigentes' | 'pasados' | 'todos'>('vigentes')
  const [pagina, setPagina] = useState(1)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<number | null>(null)
  const [form, setForm] = useState<Formulario>(FORM_INICIAL)
  const [eliminar, setEliminar] = useState<AgendaBlock | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [refresh, setRefresh] = useState(0)

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
      blockTypesApi.listarActivos(accessToken),
      schedulesApi.catalogoOdontologos(accessToken),
      bookingApi.sedes(accessToken),
      blocksApi.listar(accessToken),
    ])
      .then(([tiposData, catalogoData, sedesData, bloqueosData]) => {
        if (!activo) return
        setTipos(tiposData)
        setCatalogo(catalogoData)
        setSedes(sedesData)
        setBloqueos(bloqueosData)
      })
      .catch(e => {
        if (!activo) return
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los bloqueos de agenda.')
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, refresh])

  const odontologos = useMemo(() => {
    const porId = new Map<number, HorarioOdontologoCatalogo>()
    catalogo.forEach(item => {
      if (!porId.has(item.odontologoId)) {
        porId.set(item.odontologoId, item)
      }
    })
    return [...porId.values()].sort((a, b) =>
      nombreOdontologo(a).localeCompare(nombreOdontologo(b)),
    )
  }, [catalogo])

  const tipoSeleccionado = useMemo(
    () => tipos.find(tipo => String(tipo.id) === form.tipoBloqueoId) ?? null,
    [tipos, form.tipoBloqueoId],
  )

  const { bloqueosFiltrados, conteoVigentes, conteoPasados, conteoTodos } = useMemo(() => {
    const hoy = hoyIso()
    let vigentes = 0
    let pasados = 0
    let todos = 0

    const filtrados = bloqueos.filter(bloqueo => {
      if (
        filtroOdontologo &&
        bloqueo.odontologoId !== null &&
        bloqueo.odontologoId !== Number(filtroOdontologo)
      ) {
        return false
      }
      if (filtroSede && bloqueo.sedeId !== null && bloqueo.sedeId !== Number(filtroSede)) {
        return false
      }

      todos++
      const fechaFinStr = bloqueo.fechaFin.slice(0, 10)
      const esVigente = fechaFinStr >= hoy

      if (esVigente) vigentes++
      else pasados++

      if (filtroPeriodo === 'vigentes' && !esVigente) return false
      if (filtroPeriodo === 'pasados' && esVigente) return false

      return true
    })

    return {
      bloqueosFiltrados: filtrados,
      conteoVigentes: vigentes,
      conteoPasados: pasados,
      conteoTodos: todos,
    }
  }, [bloqueos, filtroOdontologo, filtroSede, filtroPeriodo])

  const totalPaginas = Math.max(1, Math.ceil(bloqueosFiltrados.length / PAGE_SIZE))

  const bloqueosPaginados = useMemo(() => {
    const start = (pagina - 1) * PAGE_SIZE
    return bloqueosFiltrados.slice(start, start + PAGE_SIZE)
  }, [bloqueosFiltrados, pagina])

  const opcionesOdontologos = odontologos.map(item => ({
    value: String(item.odontologoId),
    label: nombreOdontologo(item),
  }))

  const opcionesSedes = sedes.map(sede => ({
    value: String(sede.id),
    label: sede.nombre,
  }))

  const obtenerNombreOdontologo = (id: number | null) => {
    if (id === null) return 'Todos los odontólogos'
    const item = odontologos.find(o => o.odontologoId === id)
    return item ? nombreOdontologo(item) : `Odontólogo #${id}`
  }

  const obtenerNombreSede = (id: number | null) => {
    if (id === null) return 'Todas las sedes'
    return sedes.find(s => s.id === id)?.nombre ?? `Sede #${id}`
  }

  const abrirNuevo = () => {
    const hoy = hoyIso()
    setForm({
      ...FORM_INICIAL,
      tipoBloqueoId: tipos[0] ? String(tipos[0].id) : '',
      fechaInicio: hoy,
      fechaFin: hoy,
    })
    setEditando(null)
    setMostrarForm(true)
    setAviso(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirEditar = (bloqueo: AgendaBlock) => {
    const todoElDia = esMedianoche(bloqueo.fechaInicio) && esMedianoche(bloqueo.fechaFin)
    const fechaFinVisual = todoElDia
      ? sumarDias(bloqueo.fechaFin.slice(0, 10), -1)
      : bloqueo.fechaFin.slice(0, 10)

    setForm({
      tipoBloqueoId: String(bloqueo.tipoBloqueoId),
      odontologoId: bloqueo.odontologoId ? String(bloqueo.odontologoId) : '',
      sedeId: bloqueo.sedeId ? String(bloqueo.sedeId) : '',
      diaCompleto: todoElDia,
      fechaInicio: bloqueo.fechaInicio.slice(0, 10),
      fechaFin: fechaFinVisual,
      horaInicio: todoElDia ? '08:00' : bloqueo.fechaInicio.slice(11, 16),
      horaFin: todoElDia ? '18:00' : bloqueo.fechaFin.slice(11, 16),
      motivo: bloqueo.motivo ?? '',
    })
    setEditando(bloqueo.id)
    setMostrarForm(true)
    setAviso(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cerrarForm = () => {
    if (guardando) return
    setMostrarForm(false)
    setEditando(null)
  }

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken || !tipoSeleccionado || guardando) return

    setGuardando(true)
    setAviso(null)

    try {
      if (!form.fechaInicio || !form.fechaFin) {
        throw new Error('Selecciona la fecha de inicio y la fecha de fin.')
      }

      if (tipoSeleccionado.requiereOdontologo && !form.odontologoId) {
        throw new Error('Selecciona el odontólogo para este tipo de bloqueo.')
      }

      if (tipoSeleccionado.requiereSede && !form.sedeId) {
        throw new Error('Selecciona la sede para este tipo de bloqueo.')
      }

      const odontologoId =
        tipoSeleccionado.permiteOdontologo && form.odontologoId ? Number(form.odontologoId) : null
      const sedeId = tipoSeleccionado.permiteSede && form.sedeId ? Number(form.sedeId) : null

      let fechaInicio: string
      let fechaFin: string

      if (form.diaCompleto) {
        fechaInicio = `${form.fechaInicio}T00:00:00`
        fechaFin = `${sumarDias(form.fechaFin, 1)}T00:00:00`
      } else {
        fechaInicio = `${form.fechaInicio}T${form.horaInicio}:00`
        fechaFin = `${form.fechaFin}T${form.horaFin}:00`
      }

      if (new Date(fechaFin).getTime() <= new Date(fechaInicio).getTime()) {
        throw new Error('La fecha y hora de fin debe ser posterior al inicio.')
      }

      const data: CreateAgendaBlock = {
        tipoBloqueoId: tipoSeleccionado.id,
        odontologoId,
        sedeId,
        fechaInicio,
        fechaFin,
        motivo: form.motivo.trim() || null,
      }

      if (editando !== null) {
        const actualizado = await blocksApi.actualizar(accessToken, editando, data)
        setBloqueos(actual => actual.map(b => (b.id === actualizado.id ? actualizado : b)))
        setMostrarForm(false)
        setEditando(null)
        setAviso({ tipo: 'success', texto: 'Bloqueo de agenda actualizado correctamente.' })
      } else {
        const creado = await blocksApi.crear(accessToken, data)
        setBloqueos(actual => [creado, ...actual])
        setMostrarForm(false)
        setAviso({ tipo: 'success', texto: 'Bloqueo de agenda registrado correctamente.' })
      }
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo registrar el bloqueo.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const confirmarEliminacion = async () => {
    if (!accessToken || !eliminar || procesando) return

    const actual = eliminar
    setProcesando(true)
    setAviso(null)

    try {
      await blocksApi.eliminar(accessToken, actual.id)
      setBloqueos(lista => lista.filter(item => item.id !== actual.id))
      setEliminar(null)
      setAviso({ tipo: 'success', texto: 'Bloqueo eliminado correctamente.' })
    } catch (e) {
      setEliminar(null)
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo eliminar el bloqueo.',
      })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <PageHead
        title="Agenda de odontólogos"
        description="Administra jornadas habituales, ausencias, feriados y excepciones de agenda."
        actions={
          <Button icon="plus" onClick={abrirNuevo} disabled={loading || tipos.length === 0}>
            Registrar bloqueo
          </Button>
        }
      />

      <ScheduleAgendaTabs />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <Card className="border-brand/30 p-5 shadow-md sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    {editando !== null ? 'Editar bloqueo de agenda' : 'Registrar bloqueo o feriado'}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    El alcance del formulario cambia según el tipo de bloqueo configurado.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar formulario"
                  onClick={cerrarForm}
                  disabled={guardando}
                  className="rounded-lg p-2 text-muted transition hover:bg-alt hover:text-ink"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <form onSubmit={event => void guardar(event)} className="grid gap-4 lg:grid-cols-2">
                <label className="min-w-0 lg:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Tipo de bloqueo
                  </span>
                  <AnimatedSelect
                    value={form.tipoBloqueoId}
                    options={tipos.map(tipo => ({
                      value: String(tipo.id),
                      label: tipo.nombre,
                    }))}
                    onChange={value => {
                      const siguiente = tipos.find(tipo => String(tipo.id) === value)
                      setForm(actual => ({
                        ...actual,
                        tipoBloqueoId: value,
                        odontologoId: siguiente?.permiteOdontologo ? actual.odontologoId : '',
                        sedeId: siguiente?.permiteSede ? actual.sedeId : '',
                      }))
                    }}
                    label="Tipo de bloqueo"
                    placeholder="Selecciona un tipo"
                    disabled={guardando}
                  />
                  {tipoSeleccionado?.descripcion && (
                    <p className="mt-1.5 text-xs text-muted">{tipoSeleccionado.descripcion}</p>
                  )}
                </label>

                {tipoSeleccionado?.permiteOdontologo && (
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-sm font-semibold text-ink">
                      Odontólogo {tipoSeleccionado.requiereOdontologo ? '*' : '(opcional)'}
                    </span>
                    <AnimatedSelect
                      value={form.odontologoId}
                      options={[
                        ...(!tipoSeleccionado.requiereOdontologo
                          ? [{ value: '', label: 'Todos los odontólogos' }]
                          : []),
                        ...opcionesOdontologos,
                      ]}
                      onChange={value => setForm(actual => ({ ...actual, odontologoId: value }))}
                      label="Odontólogo"
                      placeholder="Selecciona un odontólogo"
                      disabled={guardando}
                    />
                  </label>
                )}

                {tipoSeleccionado?.permiteSede && (
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-sm font-semibold text-ink">
                      Sede {tipoSeleccionado.requiereSede ? '*' : '(opcional)'}
                    </span>
                    <AnimatedSelect
                      value={form.sedeId}
                      options={[
                        ...(!tipoSeleccionado.requiereSede
                          ? [{ value: '', label: 'Todas las sedes' }]
                          : []),
                        ...opcionesSedes,
                      ]}
                      onChange={value => setForm(actual => ({ ...actual, sedeId: value }))}
                      label="Sede"
                      placeholder="Selecciona una sede"
                      disabled={guardando}
                    />
                  </label>
                )}

                <div className="lg:col-span-2">
                  <Checkbox
                    checked={form.diaCompleto}
                    onChange={event =>
                      setForm(actual => ({
                        ...actual,
                        diaCompleto: event.target.checked,
                      }))
                    }
                    label="Bloquear día completo"
                    disabled={guardando}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                  <div className="min-w-0">
                    <span className="mb-1.5 block text-sm font-semibold text-ink">
                      Fecha de inicio
                    </span>
                    <AnimatedDatePicker
                      value={form.fechaInicio}
                      onChange={value =>
                        setForm(actual => ({
                          ...actual,
                          fechaInicio: value,
                          fechaFin:
                            actual.fechaFin && actual.fechaFin >= value ? actual.fechaFin : value,
                        }))
                      }
                      min={hoyIso()}
                      label="Fecha de inicio"
                      disabled={guardando}
                    />
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1.5 block text-sm font-semibold text-ink">
                      Fecha de fin
                    </span>
                    <AnimatedDatePicker
                      value={form.fechaFin}
                      onChange={value => setForm(actual => ({ ...actual, fechaFin: value }))}
                      min={form.fechaInicio || hoyIso()}
                      label="Fecha de fin"
                      disabled={guardando}
                    />
                  </div>
                </div>

                {!form.diaCompleto && (
                  <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                    <div className="min-w-0">
                      <span className="mb-1.5 block text-sm font-semibold text-ink">
                        Hora de inicio
                      </span>
                      <ClockTimePicker
                        value={form.horaInicio}
                        onChange={value => setForm(actual => ({ ...actual, horaInicio: value }))}
                        label="Hora de inicio"
                        disabled={guardando}
                      />
                    </div>

                    <div className="min-w-0">
                      <span className="mb-1.5 block text-sm font-semibold text-ink">
                        Hora de fin
                      </span>
                      <ClockTimePicker
                        value={form.horaFin}
                        onChange={value => setForm(actual => ({ ...actual, horaFin: value }))}
                        label="Hora de fin"
                        disabled={guardando}
                      />
                    </div>
                  </div>
                )}

                <label className="min-w-0 lg:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Motivo o detalle
                  </span>
                  <textarea
                    value={form.motivo}
                    onChange={event => setForm(actual => ({ ...actual, motivo: event.target.value }))}
                    maxLength={255}
                    rows={3}
                    disabled={guardando}
                    placeholder="Ej. Combate de Angamos, capacitación interna, vacaciones programadas…"
                    className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="mt-1 text-right text-xs text-muted">{form.motivo.length}/255</div>
                </label>

                <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5 lg:col-span-2">
                  <Button variant="ghost" onClick={cerrarForm} disabled={guardando}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={guardando || !tipoSeleccionado}>
                    {guardando
                      ? editando !== null
                        ? 'Guardando…'
                        : 'Registrando…'
                      : editando !== null
                        ? 'Guardar cambios'
                        : 'Registrar bloqueo'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-visible">
        <div className="border-b border-line p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-ink sm:text-lg">Bloqueos y feriados</h2>
              <p className="mt-1 text-xs text-muted">
                Consulta feriados, vacaciones, permisos, capacitaciones y cierres que afectan la disponibilidad.
              </p>
            </div>

            <div className="grid w-full gap-2.5 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(16rem,20rem)_12rem]">
              <AnimatedSelect
                value={filtroOdontologo}
                options={[{ value: '', label: 'Todos los odontólogos' }, ...opcionesOdontologos]}
                onChange={value => {
                  setFiltroOdontologo(value)
                  setPagina(1)
                }}
                label="Filtrar por odontólogo"
              />

              <AnimatedSelect
                value={filtroSede}
                options={[{ value: '', label: 'Todas las sedes' }, ...opcionesSedes]}
                onChange={value => {
                  setFiltroSede(value)
                  setPagina(1)
                }}
                label="Filtrar por sede"
              />
            </div>
          </div>

          {/* SELECTOR DE ESTADO TEMPORAL */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
            <span className="text-xs font-semibold text-muted mr-1">Periodo:</span>
            <button
              type="button"
              onClick={() => {
                setFiltroPeriodo('vigentes')
                setPagina(1)
              }}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                filtroPeriodo === 'vigentes'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-alt text-muted hover:text-ink hover:bg-alt/80',
              )}
            >
              Próximos / Vigentes ({conteoVigentes})
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltroPeriodo('pasados')
                setPagina(1)
              }}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                filtroPeriodo === 'pasados'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-alt text-muted hover:text-ink hover:bg-alt/80',
              )}
            >
              Historial / Pasados ({conteoPasados})
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltroPeriodo('todos')
                setPagina(1)
              }}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                filtroPeriodo === 'todos'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-alt text-muted hover:text-ink hover:bg-alt/80',
              )}
            >
              Todos ({conteoTodos})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted">
            <Icon name="spinner" size={22} className="animate-spin text-brand" />
            Cargando bloqueos de agenda…
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
            <Button variant="ghost" className="mt-4" onClick={() => setRefresh(n => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : bloqueosFiltrados.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="calendar" size={36} className="mx-auto text-muted" />
            <p className="mt-3 font-semibold text-ink">
              {filtroPeriodo === 'vigentes'
                ? 'No hay bloqueos o feriados vigentes.'
                : filtroPeriodo === 'pasados'
                  ? 'No hay registros en el historial de bloqueos.'
                  : 'No hay bloqueos registrados con los filtros seleccionados.'}
            </p>
            <p className="mt-1 text-sm text-muted">
              Los nuevos bloqueos aparecerán aquí y afectarán automáticamente la disponibilidad.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
              {bloqueosPaginados.map(bloqueo => {
                const todoElDia = esMedianoche(bloqueo.fechaInicio) && esMedianoche(bloqueo.fechaFin)
                const fechaFinVisual = todoElDia
                  ? sumarDias(bloqueo.fechaFin.slice(0, 10), -1)
                  : bloqueo.fechaFin

                return (
                  <motion.article
                    key={bloqueo.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge tone={tonoTipo(bloqueo.tipoBloqueoCodigo)}>
                          {bloqueo.tipoBloqueoNombre}
                        </Badge>

                        <h3 className="mt-3 font-bold text-ink">
                          {todoElDia
                            ? `${fechaCorta(bloqueo.fechaInicio)}${
                                bloqueo.fechaInicio.slice(0, 10) !== fechaFinVisual
                                  ? ` – ${fechaCorta(`${fechaFinVisual}T00:00:00`)}`
                                  : ''
                              }`
                            : `${fechaHoraCorta(bloqueo.fechaInicio)} – ${fechaHoraCorta(bloqueo.fechaFin)}`}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title="Editar bloqueo"
                          aria-label="Editar bloqueo"
                          onClick={() => abrirEditar(bloqueo)}
                          disabled={guardando || procesando}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:bg-alt hover:text-brand disabled:opacity-50"
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar bloqueo"
                          aria-label="Eliminar bloqueo"
                          onClick={() => setEliminar(bloqueo)}
                          disabled={guardando || procesando}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Icon name="user" size={16} />
                        {obtenerNombreOdontologo(bloqueo.odontologoId)}
                      </div>

                      <div className="flex items-center gap-2">
                        <Icon name="mapPin" size={16} />
                        {obtenerNombreSede(bloqueo.sedeId)}
                      </div>
                    </div>

                    {bloqueo.motivo && (
                      <p className="mt-4 rounded-xl bg-alt/60 px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
                        {bloqueo.motivo}
                      </p>
                    )}
                  </motion.article>
                )
              })}
            </div>

            {bloqueosFiltrados.length > 0 && (
              <TableFoot
                summary={`Mostrando ${(pagina - 1) * PAGE_SIZE + 1}–${Math.min(pagina * PAGE_SIZE, bloqueosFiltrados.length)} de ${bloqueosFiltrados.length} bloqueos`}
              >
                <Pagination page={pagina} totalPages={totalPaginas} onChange={setPagina} />
              </TableFoot>
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={eliminar !== null}
        title="¿Eliminar bloqueo de agenda?"
        description="El intervalo volverá a estar disponible si existe un horario de atención válido y no hay citas u otras reservas que lo ocupen."
        confirmLabel={procesando ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Regresar"
        onCancel={() => {
          if (!procesando) setEliminar(null)
        }}
        onConfirm={() => void confirmarEliminacion()}
      />
    </>
  )
}