import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AnimatedSelect, Button, Card, Checkbox, ConfirmDialog, Icon, PageHead, Pagination, SearchInput, ServicesCardsSkeleton, TableFoot, Toast, Toolbar } from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import { serviciosApi, type Servicio, type ServicioInput, type EspecialidadOption } from '../api/serviciosApi'
import { sedesApi, type Sede } from '@/features/sedes/api/sedesApi'
import { cn } from '@/shared/lib/cn'
import { scrollToTopOrElement } from '@/shared/lib/scroll'

type Filtro = 'todos' | 'destacados' | 'activos' | 'inactivos'
type Aviso = { tipo: 'success' | 'error'; texto: string }
type Formulario = {
  especialidadId: string
  nombre: string
  descripcion: string
  duracionMinutos: string
  precioReferencial: string
  sedeIds: number[]
  destacado: boolean
}

const VACIO: Formulario = {
  especialidadId: '',
  nombre: '',
  descripcion: '',
  duracionMinutos: '30',
  precioReferencial: '',
  sedeIds: [],
  destacado: false,
}

const POR_PAGINA = 10
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const moneda = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

export function ServiciosPage() {
  const { accessToken } = useAuth()

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [especialidades, setEspecialidades] = useState<EspecialidadOption[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('')
  const [filtroSede, setFiltroSede] = useState('')
  const [pagina, setPagina] = useState(1)

  const [form, setForm] = useState<Formulario>(VACIO)
  const [editando, setEditando] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [confirmar, setConfirmar] = useState<Servicio | null>(null)

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)
  const [mostrarSelectorSedes, setMostrarSelectorSedes] = useState(false)
  const [busquedaSede, setBusquedaSede] = useState('')

  // CARGAR SERVICIOS, ESPECIALIDADES Y SEDES REALES.
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
      serviciosApi.listar(accessToken),
      serviciosApi.especialidades(accessToken),
      sedesApi.listar(accessToken),
    ])
      .then(([listaServicios, listaEspecialidades, listaSedes]) => {
        if (!activo) return
        setServicios(listaServicios)
        setEspecialidades(listaEspecialidades)
        setSedes(listaSedes)
      })
      .catch((e: unknown) => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los servicios.')
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, actualizacion])

  // OCULTAR NOTIFICACIONES AUTOMÁTICAMENTE.
  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(null), aviso.tipo === 'error' ? 7000 : 4000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  const abrirNuevo = () => {
    setForm({ ...VACIO })
    setEditando(null)
    setFormError('')
    setMostrarForm(true)
    scrollToTopOrElement()
    setMostrarSelectorSedes(true)
    setBusquedaSede('')
  }

  const abrirEditar = (servicio: Servicio) => {
    setForm({
      especialidadId: String(servicio.especialidadId),
      nombre: servicio.nombre,
      descripcion: servicio.descripcion ?? '',
      duracionMinutos: String(servicio.duracionMinutos),
      precioReferencial: servicio.precioReferencial === null ? '' : servicio.precioReferencial.toFixed(2),
      sedeIds: [...servicio.sedeIds],
      destacado: Boolean(servicio.destacado),
    })

    setEditando(servicio.id)
    setFormError('')
    setMostrarForm(true)
    scrollToTopOrElement()
    setMostrarSelectorSedes(true)
    setBusquedaSede('')
  }

  const cerrarForm = () => {
    if (guardando) return
    setMostrarForm(false)
    setEditando(null)
    setFormError('')
  }

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(',', '.')
    if (val.startsWith('.')) val = '0' + val
    if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
      setForm(actual => ({ ...actual, precioReferencial: val }))
    }
  }

  const handlePrecioKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return
    }
    if (!/[\d.,]/.test(e.key)) {
      e.preventDefault()
    }
  }

  // REGISTRAR O EDITAR SERVICIO.
  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!accessToken || guardando || procesando) return

    setGuardando(true)
    setFormError('')
    setAviso(null)

    try {
      const especialidadId = Number(form.especialidadId)
      const duracion = Number(form.duracionMinutos)
      const precioTexto = form.precioReferencial.trim().replace(',', '.')
      const precio = precioTexto === '' ? null : Number(precioTexto)

      if (!Number.isSafeInteger(especialidadId) || especialidadId <= 0) {
        throw new Error('Selecciona una especialidad.')
      }

      if (!especialidades.some(e => e.id === especialidadId && e.activo)) {
        throw new Error('La especialidad seleccionada no está activa.')
      }

      if (!form.nombre.trim()) throw new Error('Ingresa el nombre del servicio.')

      if (!Number.isInteger(duracion) || duracion < 1 || duracion > 1440) {
        throw new Error('La duración debe estar entre 1 y 1440 minutos.')
      }

      if (precio !== null && (!/^\d{1,8}(\.\d{1,2})?$/.test(precioTexto) || !Number.isFinite(precio))) {
        throw new Error('Ingresa un precio válido con un máximo de dos decimales.')
      }

      const data: ServicioInput = {
        especialidadId,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        duracionMinutos: duracion,
        precioReferencial: precio,
        sedeIds: [...form.sedeIds],
        destacado: form.destacado,
      }

      const esNuevo = editando === null
      const resultado = esNuevo
        ? await serviciosApi.crear(accessToken, data)
        : await serviciosApi.actualizar(accessToken, editando, data)

      setServicios(actual =>
        esNuevo
          ? [...actual, resultado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
          : actual
              .map(s => (s.id === resultado.id ? resultado : s))
              .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      )

      setMostrarForm(false)
      setEditando(null)
      setBusqueda('')
      setFiltro('todos')
      setPagina(1)

      setAviso({
        tipo: 'success',
        texto: esNuevo ? 'Servicio registrado correctamente.' : 'Servicio actualizado correctamente.',
      })
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo guardar el servicio.'
      setFormError(mensaje)
      setAviso({ tipo: 'error', texto: mensaje })
    } finally {
      setGuardando(false)
    }
  }

  // ACTIVAR O DESACTIVAR SERVICIO.
  const cambiarEstado = async () => {
    if (!accessToken || !confirmar || procesando) return

    setProcesando(true)
    setAviso(null)

    try {
      const resultado = await serviciosApi.cambiarEstado(accessToken, confirmar.id, !confirmar.activo)

      setServicios(actual => actual.map(s => (s.id === resultado.id ? resultado : s)))
      setConfirmar(null)

      setAviso({
        tipo: 'success',
        texto: resultado.activo ? 'Servicio activado correctamente.' : 'Servicio desactivado correctamente.',
      })
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo cambiar el estado del servicio.'
      setConfirmar(null)
      setAviso({ tipo: 'error', texto: mensaje })
    } finally {
      setProcesando(false)
    }
  }

  // MARCAR O DESMARCAR COMO DESTACADO
  const toggleDestacado = async (servicio: Servicio) => {
    if (!accessToken || procesando || guardando) return

    setProcesando(true)
    setAviso(null)

    try {
      const resultado = await serviciosApi.alternarDestacado(accessToken, servicio.id)
      setServicios(actual => actual.map(s => (s.id === resultado.id ? resultado : s)))
      setAviso({
        tipo: 'success',
        texto: resultado.destacado
          ? `"${servicio.nombre}" marcado como destacado.`
          : `"${servicio.nombre}" retirado de destacados.`,
      })
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo cambiar el estado destacado.'
      setAviso({ tipo: 'error', texto: mensaje })
    } finally {
      setProcesando(false)
    }
  }

  // OPCIONES PARA LOS SELECTORES DE FILTRO
  const opcionesEspecialidades = useMemo(() => [
    { value: '', label: 'Todas las especialidades' },
    ...especialidades.map(e => ({ value: String(e.id), label: e.nombre })),
  ], [especialidades])

  const opcionesSedes = useMemo(() => [
    { value: '', label: 'Todas las sedes' },
    ...sedes.map(s => ({ value: String(s.id), label: s.nombre })),
  ], [sedes])

  // FILTROS Y PAGINACIÓN.
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())

    return servicios.filter(s => {
      const texto = normalizar(`${s.nombre} ${s.especialidadNombre} ${s.descripcion ?? ''}`)
      if (q && !texto.includes(q)) return false

      if (filtro === 'destacados' && !s.destacado) return false
      if (filtro === 'activos' && !s.activo) return false
      if (filtro === 'inactivos' && s.activo) return false

      if (filtroEspecialidad && s.especialidadId !== Number(filtroEspecialidad)) {
        return false
      }

      if (filtroSede && !s.sedeIds.includes(Number(filtroSede))) {
        return false
      }

      return true
    })
  }, [servicios, busqueda, filtro, filtroEspecialidad, filtroSede])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const visibles = filtrados.slice(inicio, inicio + POR_PAGINA)

  return (
    <>
      <PageHead
        title="Servicios odontológicos"
        description="Administra los tratamientos, sus especialidades, duraciones y precios referenciales."
        actions={
          <Button icon="plus" onClick={abrirNuevo} disabled={guardando || procesando || loading}>
            Nuevo servicio
          </Button>
        }
      />

      {/* NOTIFICACIONES */}
      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* FORMULARIO */}
      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-5"
          >
            <Card className="border-brand/30 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    {editando === null ? 'Registrar nuevo servicio' : 'Editar servicio'}
                  </h2>
                  <p className="mt-1 text-sm text-muted">Completa los datos generales del tratamiento.</p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar formulario"
                  onClick={cerrarForm}
                  disabled={guardando}
                  className="rounded-lg p-2 text-muted hover:bg-alt"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <form onSubmit={e => void guardar(e)} className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Nombre del servicio <span className="text-danger">*</span>
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <Icon name="tooth" size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={form.nombre}
                      onChange={e => setForm(actual => ({ ...actual, nombre: e.target.value }))}
                      placeholder="Ej. Limpieza dental"
                      className="w-full rounded-control border border-line bg-surface py-3 pr-4 pl-9 text-sm outline-none focus:border-brand"
                    />
                  </div>
                </label>

                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Especialidad <span className="text-danger">*</span>
                  </span>

                  <AnimatedSelect
                    label="Selecciona una especialidad"
                    placeholder="Selecciona una especialidad"
                    value={form.especialidadId}
                    options={especialidades.map(especialidad => ({
                      value: String(especialidad.id),
                      label: `${especialidad.nombre}${especialidad.activo ? '' : ' (Inactiva)'}`,
                      disabled: !especialidad.activo,
                    }))}
                    onChange={valor =>
                      setForm(actual => ({ ...actual, especialidadId: valor }))
                    }
                    className="w-full"
                  />
                </div>

                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Descripción</span>
                  <textarea
                    rows={2}
                    maxLength={255}
                    value={form.descripcion}
                    onChange={e => setForm(actual => ({ ...actual, descripcion: e.target.value }))}
                    placeholder="Describe brevemente el tratamiento..."
                    className="w-full resize-y rounded-control border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
                  />
                  <span className="mt-1 block text-right text-xs text-muted">
                    {form.descripcion.length}/255
                  </span>
                </label>

                <label>
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    Duración (minutos) <span className="text-danger">*</span>
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <Icon name="clock" size={16} />
                    </span>
                    <input
                      type="number"
                      required
                      min={1}
                      max={1440}
                      step={1}
                      value={form.duracionMinutos}
                      onChange={e => setForm(actual => ({ ...actual, duracionMinutos: e.target.value }))}
                      className="w-full rounded-control border border-line bg-surface py-3 pr-4 pl-9 text-sm outline-none focus:border-brand"
                    />
                  </div>
                </label>

                <label>
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Precio referencial (S/)</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-muted">
                      S/
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.precioReferencial}
                      onChange={handlePrecioChange}
                      onKeyDown={handlePrecioKeyDown}
                      placeholder="0.00"
                      className="w-full rounded-control border border-line bg-surface py-3 pr-4 pl-9 text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <span className="mt-1 block text-xs text-muted">
                    Opcional. Valor decimal numérico (máx. 2 decimales).
                  </span>
                </label>

                {/* MARCAR COMO DESTACADO */}
                <div className="rounded-xl border border-line bg-surface/60 p-4 sm:col-span-2">
                  <Checkbox
                    id="chk-destacado"
                    checked={form.destacado}
                    onChange={e => setForm(actual => ({ ...actual, destacado: e.target.checked }))}
                    label={
                      <div>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                          <Icon name="starFilled" size={15} className="text-amber-500" />
                          <span>Marcar como servicio destacado</span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          Aparecerá priorizado en la pestaña principal &ldquo;Destacados&rdquo; durante la reserva de citas.
                        </span>
                      </div>
                    }
                  />
                </div>

                {/* SEDES DONDE SE OFRECE EL SERVICIO */}
                <div className="sm:col-span-2">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-ink">
                      Sedes donde se ofrece el servicio
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      Selecciona los establecimientos donde estará disponible este tratamiento.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-line bg-surface">
                    {/* RESUMEN: SIEMPRE VISIBLE */}
                    <button
                      type="button"
                      aria-expanded={mostrarSelectorSedes}
                      onClick={() => setMostrarSelectorSedes(actual => !actual)}
                      disabled={guardando}
                      className={cn(
                        'flex w-full items-center justify-between gap-4 p-4 text-left transition-colors',
                        'hover:bg-alt disabled:cursor-not-allowed disabled:opacity-60',
                        mostrarSelectorSedes && 'bg-brand-soft/40',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {form.sedeIds.length === 0
                            ? 'Seleccionar sedes'
                            : `${form.sedeIds.length} ${
                                form.sedeIds.length === 1
                                  ? 'sede seleccionada'
                                  : 'sedes seleccionadas'
                              }`}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted">
                          {form.sedeIds.length === 0
                            ? 'Haz clic para buscar y seleccionar establecimientos'
                            : sedes
                                .filter(sede => form.sedeIds.includes(sede.id))
                                .slice(0, 2)
                                .map(sede => sede.nombre)
                                .join(' · ') +
                              (form.sedeIds.length > 2 ? ` · +${form.sedeIds.length - 2} más` : '')}
                        </p>
                      </div>

                      <motion.span
                        aria-hidden="true"
                        animate={{ rotate: mostrarSelectorSedes ? 180 : 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="flex shrink-0 items-center justify-center text-muted"
                      >
                        <Icon name="chevronDown" size={18} />
                      </motion.span>
                    </button>

                    {/* PANEL DESPLEGABLE CON ANIMACIÓN FLUIDA */}
                    <AnimatePresence>
                      {mostrarSelectorSedes && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: 'easeInOut' }}
                          className="overflow-hidden border-t border-line"
                        >
                          {/* BUSCADOR */}
                          <div className="border-b border-line p-3">
                            <SearchInput
                              value={busquedaSede}
                              onChange={e => setBusquedaSede(e.target.value)}
                              onClear={() => setBusquedaSede('')}
                              placeholder="Buscar por nombre, distrito o provincia..."
                              aria-label="Buscar sede"
                              className="w-full"
                            />
                          </div>

                          {/* LISTA CON SEPARACIÓN Y ALTURA MÁXIMA */}
                          <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto overscroll-contain p-2.5">
                            {sedes
                              .filter(sede => {
                                const texto = normalizar(
                                  `${sede.nombre} ${sede.distrito ?? ''} ${sede.provincia ?? ''}`,
                                )
                                return texto.includes(normalizar(busquedaSede.trim()))
                              })
                              .map(sede => {
                                const seleccionada = form.sedeIds.includes(sede.id)

                                return (
                                  <label
                                    key={sede.id}
                                    className={cn(
                                      'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors duration-150',
                                      seleccionada
                                        ? 'border-brand/40 bg-brand-soft/70 shadow-xs'
                                        : 'border-line/70 bg-surface hover:border-brand/30 hover:bg-alt/80',
                                    )}
                                  >
                                    <Checkbox
                                      checked={seleccionada}
                                      disabled={guardando}
                                      onChange={e => {
                                        setForm(actual => ({
                                          ...actual,
                                          sedeIds: e.target.checked
                                            ? [...actual.sedeIds, sede.id]
                                            : actual.sedeIds.filter(id => id !== sede.id),
                                        }))
                                      }}
                                    />

                                    <span className="min-w-0 flex-1">
                                      <span
                                        className={cn(
                                          'block text-sm font-semibold',
                                          seleccionada ? 'text-brand' : 'text-ink',
                                        )}
                                      >
                                        {sede.nombre}
                                      </span>

                                      <span className="block truncate text-xs text-muted">
                                        {[sede.distrito, sede.provincia].filter(Boolean).join(', ') ||
                                          sede.direccion}
                                      </span>
                                    </span>

                                    {!sede.activo && (
                                      <span className="shrink-0 rounded-full bg-alt px-2 py-0.5 text-[0.7rem] font-medium text-muted">
                                        Inactiva
                                      </span>
                                    )}
                                  </label>
                                )
                              })}

                            {sedes.length === 0 && (
                              <p className="px-3 py-5 text-center text-sm text-muted">
                                No hay sedes registradas.
                              </p>
                            )}

                            {sedes.length > 0 &&
                              !sedes.some(sede =>
                                normalizar(
                                  `${sede.nombre} ${sede.distrito ?? ''} ${sede.provincia ?? ''}`,
                                ).includes(normalizar(busquedaSede.trim())),
                              ) && (
                                <p className="px-3 py-5 text-center text-sm text-muted">
                                  No se encontraron sedes con esa búsqueda.
                                </p>
                              )}
                          </div>

                          {/* PIE DEL SELECTOR */}
                          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                            <span className="text-xs text-muted">
                              {form.sedeIds.length} de {sedes.length} seleccionadas
                            </span>

                            <button
                              type="button"
                              onClick={() => setMostrarSelectorSedes(false)}
                              className="text-xs font-semibold text-brand hover:underline"
                            >
                              Listo
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {form.sedeIds.length === 0 && (
                    <p className="mt-2 text-xs text-muted">
                      Sin sedes asignadas, el servicio no estará disponible para nuevas reservas.
                    </p>
                  )}
                </div>

                {formError && (
                  <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger sm:col-span-2">
                    {formError}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5 sm:col-span-2">
                  <Button variant="ghost" onClick={cerrarForm} disabled={guardando}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={guardando}>
                    {guardando ? 'Guardando…' : editando === null ? 'Registrar servicio' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTADO */}
      <Card className="overflow-visible">
        <div className="border-b border-line">
          <div className="p-5 pb-3">
            <h2 className="font-bold text-ink">Servicios registrados</h2>
            <p className="mt-1 text-xs text-muted">
              {servicios.length} servicio{servicios.length === 1 ? '' : 's'} en el sistema
            </p>
          </div>

          <Toolbar className="border-t border-line/60">
            <SearchInput
              placeholder="Buscar por servicio, especialidad o descripción…"
              aria-label="Buscar servicio"
              value={busqueda}
              onChange={e => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
              onClear={() => {
                setBusqueda('')
                setPagina(1)
              }}
              className="w-full sm:min-w-56 sm:flex-1"
            />

            <AnimatedSelect
              label="Especialidad"
              value={filtroEspecialidad}
              options={opcionesEspecialidades}
              onChange={valor => {
                setFiltroEspecialidad(valor)
                setPagina(1)
              }}
              className="w-full sm:w-52"
            />

            <AnimatedSelect
              label="Sede"
              value={filtroSede}
              options={opcionesSedes}
              onChange={valor => {
                setFiltroSede(valor)
                setPagina(1)
              }}
              className="w-full sm:w-44"
            />

            <AnimatedSelect
              label="Estado"
              value={filtro}
              options={[
                { value: 'todos', label: 'Todos los estados' },
                { value: 'destacados', label: '⭐ Destacados' },
                { value: 'activos', label: 'Activos' },
                { value: 'inactivos', label: 'Inactivos' },
              ]}
              onChange={valor => {
                setFiltro(valor as Filtro)
                setPagina(1)
              }}
              className="w-full sm:w-44"
            />
          </Toolbar>
        </div>

        {loading ? (
          <ServicesCardsSkeleton count={4} />
        ) : error ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
            <Button variant="ghost" className="mt-4" onClick={() => setActualizacion(n => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {/* TARJETAS COMPACTAS */}
            <div className="grid items-start gap-3 bg-alt/40 p-3 sm:p-4 lg:grid-cols-2">
              {visibles.map((servicio, index) => {
                const sedesAsignadas = sedes.filter(s =>
                  servicio.sedeIds.includes(s.id),
                )

                return (
                  <motion.article
                    key={servicio.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: Math.min(index * 0.03, 0.15),
                    }}
                    className={cn(
                      'min-w-0 rounded-xl border border-l-[3px] bg-surface p-3 shadow-sm transition-shadow hover:shadow-card sm:p-4',
                      servicio.activo
                        ? 'border-line border-l-brand'
                        : 'border-line border-l-slate-300',
                    )}
                  >
                    {/* ENCABEZADO */}
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                        <Icon name="tooth" size={19} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-sm font-bold leading-snug text-ink"
                          title={servicio.nombre}
                        >
                          {servicio.nombre}
                        </h3>

                        <p className="mt-0.5 text-xs text-muted">
                          {servicio.especialidadNombre}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {servicio.destacado && (
                          <span
                            title="Servicio destacado"
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-0.5 text-[0.7rem] font-semibold text-amber-800"
                          >
                            <Icon name="starFilled" size={11} className="text-amber-500" />
                            Destacado
                          </span>
                        )}

                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[0.7rem] font-semibold',
                            servicio.activo
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {servicio.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <p
                      className="mt-2 line-clamp-1 text-xs leading-relaxed text-muted"
                      title={servicio.descripcion ?? undefined}
                    >
                      {servicio.descripcion || 'Sin descripción registrada.'}
                    </p>

                    {/* DURACIÓN Y PRECIO */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-alt px-2.5 py-1 text-xs font-semibold text-ink">
                        <Icon name="clock" size={13} className="shrink-0 text-muted" />
                        {servicio.duracionMinutos} min
                      </span>

                      <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                        {servicio.precioReferencial === null
                          ? 'Precio por definir'
                          : moneda(servicio.precioReferencial)}
                      </span>
                    </div>

                    {/* SEDES ASIGNADAS */}
                    <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="mr-0.5 text-xs text-muted">
                        Sedes:
                      </span>

                      {sedesAsignadas.slice(0, 2).map(sede => (
                        <span
                          key={sede.id}
                          title={
                            sede.activo
                              ? sede.nombre
                              : `${sede.nombre} (inactiva)`
                          }
                          className={cn(
                            'max-w-[11rem] truncate rounded-full px-2 py-1 text-[0.7rem] font-medium',
                            sede.activo
                              ? 'bg-brand-soft text-brand'
                              : 'bg-alt text-muted',
                          )}
                        >
                          {sede.nombre}
                          {!sede.activo && ' (Inactiva)'}
                        </span>
                      ))}

                      {sedesAsignadas.length > 2 && (
                        <span className="rounded-full bg-alt px-2 py-1 text-[0.7rem] text-muted">
                          +{sedesAsignadas.length - 2} más
                        </span>
                      )}

                      {sedesAsignadas.length === 0 && (
                        <span className="text-xs text-muted">
                          Sin sedes asignadas
                        </span>
                      )}
                    </div>

                    {/* ACCIONES */}
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                      <button
                        type="button"
                        onClick={() => void toggleDestacado(servicio)}
                        disabled={guardando || procesando}
                        title={servicio.destacado ? 'Quitar de destacados' : 'Marcar como destacado'}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50',
                          servicio.destacado
                            ? 'border-amber-300/80 bg-surface text-amber-900 shadow-2xs hover:bg-amber-50/50 hover:border-amber-400'
                            : 'border-line bg-surface text-ink-soft hover:border-line-hover hover:text-ink',
                        )}
                      >
                        <Icon
                          name={servicio.destacado ? 'starFilled' : 'star'}
                          size={13}
                          className={servicio.destacado ? 'text-amber-500' : 'text-muted'}
                        />
                        <span>{servicio.destacado ? 'Destacado' : 'Destacar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => abrirEditar(servicio)}
                        disabled={guardando || procesando}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                      >
                        <Icon name="edit" size={15} />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmar(servicio)}
                        disabled={guardando || procesando}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50',
                          servicio.activo
                            ? 'border-line text-ink-soft hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                            : 'border-brand text-brand hover:bg-brand-soft',
                        )}
                      >
                        {servicio.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </motion.article>
                )
              })}

              {visibles.length === 0 && (
                <div className="rounded-xl bg-surface px-5 py-10 text-center text-sm text-muted lg:col-span-2">
                  No se encontraron servicios con los filtros seleccionados.
                </div>
              )}
            </div>

            {/* PAGINACIÓN */}
            {filtrados.length > 0 && (
              <TableFoot summary={`Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAGINA, filtrados.length)} de ${filtrados.length}`}>
                <Pagination page={paginaActual} totalPages={totalPaginas} onChange={setPagina} />
              </TableFoot>
            )}
          </>
        )}
      </Card>

      {/* CONFIRMACIÓN PERSONALIZADA */}
      <ConfirmDialog
        open={confirmar !== null}
        title={confirmar?.activo ? '¿Desactivar servicio?' : '¿Activar servicio?'}
        description={
          confirmar
            ? `El servicio "${confirmar.nombre}" ${
                confirmar.activo
                  ? 'dejará de estar disponible para nuevas reservas. Las citas existentes no se cancelarán.'
                  : 'volverá a estar disponible para nuevas reservas.'
              }`
            : ''
        }
        confirmLabel={procesando ? 'Procesando…' : confirmar?.activo ? 'Desactivar' : 'Activar'}
        cancelLabel="Cancelar"
        onConfirm={() => void cambiarEstado()}
        onCancel={() => {
          if (!procesando) setConfirmar(null)
        }}
      />
    </>
  )
}