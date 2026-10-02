import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AnimatedSelect, Button, Card, ConfirmDialog, EspecialidadesSkeleton, Icon, PageHead, Pagination, SearchInput, TableFoot, Toast } from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import { especialidadesApi, type Especialidad, type EspecialidadInput } from '../api/especialidadesApi'
import { cn } from '@/shared/lib/cn'

type Filtro = 'todas' | 'activas' | 'inactivas'
type Aviso = { tipo: 'success' | 'error'; texto: string }

const VACIO = { nombre: '', descripcion: '' }
const POR_PAGINA = 10

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function EspecialidadesPage() {
  const { accessToken } = useAuth()

  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [pagina, setPagina] = useState(1)

  const [form, setForm] = useState(VACIO)
  const [editando, setEditando] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [confirmar, setConfirmar] = useState<Especialidad | null>(null)

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)

  // CONSULTAR ESPECIALIDADES.
  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setError('No se encontró una sesión activa.')
      return
    }

    let activo = true
    setLoading(true)
    setError('')

    especialidadesApi.listar(accessToken)
      .then(data => { if (activo) setEspecialidades(data) })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar las especialidades.')
      })
      .finally(() => { if (activo) setLoading(false) })

    return () => { activo = false }
  }, [accessToken, actualizacion])

  // OCULTAR AUTOMÁTICAMENTE LAS NOTIFICACIONES.
  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(null), aviso.tipo === 'error' ? 7000 : 4000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  // ABRIR FORMULARIO.
  const abrirNuevo = () => {
    setForm({ ...VACIO })
    setEditando(null)
    setFormError('')
    setMostrarForm(true)
  }

  const abrirEditar = (especialidad: Especialidad) => {
    setForm({ nombre: especialidad.nombre, descripcion: especialidad.descripcion ?? '' })
    setEditando(especialidad.id)
    setFormError('')
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cerrarForm = () => {
    if (guardando) return
    setMostrarForm(false)
    setEditando(null)
    setFormError('')
  }

  // GUARDAR ESPECIALIDAD.
  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!accessToken || guardando) return

    setGuardando(true)
    setFormError('')
    setAviso(null)

    try {
      const data: EspecialidadInput = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
      }

      if (!data.nombre) throw new Error('Ingresa el nombre de la especialidad.')

      const resultado = editando === null
        ? await especialidadesApi.crear(accessToken, data)
        : await especialidadesApi.actualizar(accessToken, editando, data)

      setEspecialidades(actual => editando === null
        ? [...actual, resultado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        : actual.map(e => e.id === resultado.id ? resultado : e)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      )

      setMostrarForm(false)
      setEditando(null)
      setAviso({
        tipo: 'success',
        texto: editando === null
          ? 'Especialidad registrada correctamente.'
          : 'Especialidad actualizada correctamente.',
      })

    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo guardar la especialidad.'
      setFormError(mensaje)
      setAviso({ tipo: 'error', texto: mensaje })
    } finally {
      setGuardando(false)
    }
  }

  // ACTIVAR O DESACTIVAR ESPECIALIDAD.
  const cambiarEstado = async () => {
    if (!accessToken || !confirmar || procesando) return

    const especialidad = confirmar
    setProcesando(true)
    setAviso(null)

    try {
      const resultado = await especialidadesApi.cambiarEstado(
        accessToken, especialidad.id, !especialidad.activo
      )

      setEspecialidades(actual => actual.map(e => e.id === resultado.id ? resultado : e))
      setConfirmar(null)

      setAviso({
        tipo: 'success',
        texto: resultado.activo
          ? 'Especialidad activada correctamente.'
          : 'Especialidad desactivada correctamente.',
      })

    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo cambiar el estado de la especialidad.'
      setConfirmar(null)
      setAviso({ tipo: 'error', texto: mensaje })
    } finally {
      setProcesando(false)
    }
  }

  // FILTROS Y PAGINACIÓN.
  const filtradas = especialidades.filter(e => {
    const coincide = normalizar(`${e.nombre} ${e.descripcion ?? ''}`)
      .includes(normalizar(busqueda.trim()))

    if (filtro === 'activas') return coincide && e.activo
    if (filtro === 'inactivas') return coincide && !e.activo
    return coincide
  })

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA)

  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor)
    setPagina(1)
  }

  const cambiarFiltro = (valor: Filtro) => {
    setFiltro(valor)
    setPagina(1)
  }

  return (
    <>
      <PageHead
        title="Especialidades"
        description="Administra las especialidades odontológicas de NeoDents."
        actions={
          <Button icon="plus" onClick={abrirNuevo} disabled={guardando || procesando}>
            Nueva especialidad
          </Button>
        }
      />

      {/* NOTIFICACIONES FLOTANTES */}
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
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    {editando === null ? 'Registrar especialidad' : 'Editar especialidad'}
                  </h2>
                  <p className="mt-1 text-sm text-muted">Completa la información de la especialidad odontológica.</p>
                </div>

                <button type="button" aria-label="Cerrar formulario" onClick={cerrarForm}
                  disabled={guardando} className="rounded-lg p-2 text-muted transition hover:bg-alt">
                  <Icon name="x" size={20} />
                </button>
              </div>

              <form onSubmit={e => void guardar(e)} className="grid gap-4">
                <label>
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Nombre de la especialidad <span className="text-danger">*</span>
                  </span>

                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <Icon name="tooth" size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={form.nombre}
                      onChange={e => setForm(actual => ({ ...actual, nombre: e.target.value }))}
                      placeholder="Ej. Ortodoncia"
                      className="w-full rounded-control border border-line bg-surface py-3 pr-4 pl-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                    />
                  </div>
                </label>

                <label>
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Descripción</span>

                  <textarea
                    rows={3}
                    maxLength={255}
                    value={form.descripcion}
                    onChange={e => setForm(actual => ({ ...actual, descripcion: e.target.value }))}
                    placeholder="Describe brevemente la especialidad..."
                    className="w-full resize-y rounded-control border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                  />

                  <span className="mt-1 block text-right text-xs text-muted">{form.descripcion.length}/255</span>
                </label>

                {formError && (
                  <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{formError}</p>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
                  <Button variant="ghost" onClick={cerrarForm} disabled={guardando}>Cancelar</Button>

                  <Button type="submit" disabled={guardando}>
                    {guardando ? 'Guardando…' : editando === null ? 'Registrar especialidad' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTADO DE ESPECIALIDADES */}
      <Card className="overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 className="font-bold text-ink">Especialidades registradas</h2>
            <p className="mt-1 text-xs text-muted">
              {especialidades.length} especialidad{especialidades.length === 1 ? '' : 'es'} en el sistema
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Buscar especialidad..."
              aria-label="Buscar especialidad"
              value={busqueda}
              onChange={e => cambiarBusqueda(e.target.value)}
              onClear={() => cambiarBusqueda('')}
              className="w-full sm:w-64"
            />

            <AnimatedSelect
              label="Filtrar especialidades por estado"
              value={filtro}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'activas', label: 'Activas' },
                { value: 'inactivas', label: 'Inactivas' },
              ]}
              onChange={valor => cambiarFiltro(valor as Filtro)}
              className="w-full sm:w-36 sm:shrink-0"
            />
          </div>
        </div>

        {loading ? (
          <EspecialidadesSkeleton count={4} />
        ) : error ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-danger">{error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => setActualizacion(n => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {/* FILAS COMPACTAS */}
            <div className="space-y-2 bg-alt/40 p-3 sm:p-4">
              {visibles.map((especialidad, index) => (
                <motion.article
                  key={especialidad.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                  className="rounded-xl border border-line bg-surface p-3 shadow-sm transition-colors hover:border-brand/50 hover:shadow-card sm:px-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">

                    {/* INFORMACIÓN */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                        <Icon name="tooth" size={21} strokeWidth={1.5} />
                      </span>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink">{especialidad.nombre}</h3>

                        <p className="mt-0.5 line-clamp-2 break-words text-xs leading-relaxed text-muted"
                          title={especialidad.descripcion ?? undefined}>
                          {especialidad.descripcion || 'Sin descripción registrada.'}
                        </p>
                      </div>
                    </div>

                    {/* ESTADO Y ACCIONES */}
                    <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-line pt-3 sm:w-auto sm:justify-end sm:border-0 sm:pt-0">

                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        especialidad.activo
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          especialidad.activo ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                        {especialidad.activo ? 'Activa' : 'Inactiva'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(especialidad)}
                          disabled={guardando || procesando}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                        >
                          <Icon name="edit" size={15} />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmar(especialidad)}
                          disabled={guardando || procesando}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50',
                            especialidad.activo
                              ? 'border-line text-ink-soft hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                              : 'border-brand text-brand hover:bg-brand-soft',
                          )}
                        >
                          {especialidad.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}

              {visibles.length === 0 && (
                <div className="rounded-xl bg-surface px-5 py-12 text-center">
                  <Icon name="search" size={28} className="mx-auto text-muted" />
                  <p className="mt-3 text-sm text-muted">
                    {especialidades.length === 0
                      ? 'Todavía no hay especialidades registradas.'
                      : 'No se encontraron especialidades con los filtros seleccionados.'}
                  </p>
                </div>
              )}
            </div>

            {/* PAGINACIÓN */}
            {filtradas.length > 0 && (
              <TableFoot summary={`Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAGINA, filtradas.length)} de ${filtradas.length}`}>
                <Pagination page={paginaActual} totalPages={totalPaginas} onChange={setPagina} />
              </TableFoot>
            )}
          </>
        )}
      </Card>

      {/* CONFIRMACIÓN PERSONALIZADA */}
      <ConfirmDialog
        open={confirmar !== null}
        title={confirmar?.activo ? '¿Desactivar especialidad?' : '¿Activar especialidad?'}
        description={confirmar
          ? `La especialidad "${confirmar.nombre}" ${confirmar.activo
            ? 'dejará de estar disponible para nuevas asignaciones y servicios.'
            : 'volverá a estar disponible en el sistema.'}`
          : ''}
        confirmLabel={procesando ? 'Procesando…' : confirmar?.activo ? 'Desactivar' : 'Activar'}
        cancelLabel="Cancelar"
        onConfirm={() => void cambiarEstado()}
        onCancel={() => { if (!procesando) setConfirmar(null) }}
      />
    </>
  )
}