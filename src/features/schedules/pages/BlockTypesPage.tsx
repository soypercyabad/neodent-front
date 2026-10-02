import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AnimatedSelect,
  BlockTypesSkeleton,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Icon,
  PageHead,
  Pagination,
  SearchInput,
  TableFoot,
  Toast,
  type ToastAviso,
} from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/model/useAuth'
import {
  blockTypesApi,
  type BlockType,
  type BlockTypeInput,
} from '../api/blockTypesApi'

type Filtro = 'todas' | 'activas' | 'inactivas'
const POR_PAGINA = 6

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

type Formulario = {
  codigo: string
  nombre: string
  descripcion: string
  requiereOdontologo: boolean
  requiereSede: boolean
  permiteOdontologo: boolean
  permiteSede: boolean
}

const VACIO: Formulario = {
  codigo: '',
  nombre: '',
  descripcion: '',
  requiereOdontologo: false,
  requiereSede: false,
  permiteOdontologo: true,
  permiteSede: true,
}

const normalizarCodigo = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

export function BlockTypesPage() {
  const { accessToken } = useAuth()

  const [tipos, setTipos] = useState<BlockType[]>([])
  const [form, setForm] = useState<Formulario>(VACIO)
  const [editando, setEditando] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [confirmarEstado, setConfirmarEstado] = useState<BlockType | null>(null)

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [refresh, setRefresh] = useState(0)

  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setError('No se encontró una sesión activa.')
      return
    }

    let activo = true
    setLoading(true)
    setError('')

    blockTypesApi
      .listarTodos(accessToken)
      .then(data => {
        if (activo) setTipos(data)
      })
      .catch(e => {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los tipos de bloqueo.')
        }
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, refresh])

  const cambiarBusqueda = (valor: string) => {
    setBusqueda(valor)
    setPagina(1)
  }

  const cambiarFiltro = (valor: Filtro) => {
    setFiltro(valor)
    setPagina(1)
  }

  const filtradas = useMemo(() => {
    return tipos.filter(t => {
      const texto = `${t.nombre} ${t.codigo} ${t.descripcion ?? ''}`
      const coincide = normalizar(texto).includes(normalizar(busqueda.trim()))

      if (filtro === 'activas') return coincide && t.activo
      if (filtro === 'inactivas') return coincide && !t.activo
      return coincide
    })
  }, [tipos, busqueda, filtro])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const visibles = useMemo(
    () => filtradas.slice(inicio, inicio + POR_PAGINA),
    [filtradas, inicio],
  )

  const abrirNuevo = () => {
    setForm(VACIO)
    setEditando(null)
    setMostrarForm(true)
    setAviso(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirEditar = (tipo: BlockType) => {
    setForm({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion ?? '',
      requiereOdontologo: tipo.requiereOdontologo,
      requiereSede: tipo.requiereSede,
      permiteOdontologo: tipo.permiteOdontologo,
      permiteSede: tipo.permiteSede,
    })
    setEditando(tipo.id)
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

    if (!accessToken || guardando) return

    setGuardando(true)
    setAviso(null)

    try {
      const nombre = form.nombre.trim()
      if (!nombre) throw new Error('Ingresa el nombre del tipo de bloqueo.')

      const codigo = editando !== null && form.codigo ? form.codigo : normalizarCodigo(nombre)
      if (!codigo) throw new Error('No se pudo generar un código válido a partir del nombre.')

      if (form.requiereOdontologo && !form.permiteOdontologo) {
        throw new Error('Si el odontólogo es obligatorio, también debe estar permitido.')
      }

      if (form.requiereSede && !form.permiteSede) {
        throw new Error('Si la sede es obligatoria, también debe estar permitida.')
      }

      const data: BlockTypeInput = {
        codigo,
        nombre,
        descripcion: form.descripcion.trim() || null,
        requiereOdontologo: form.requiereOdontologo,
        requiereSede: form.requiereSede,
        permiteOdontologo: form.permiteOdontologo,
        permiteSede: form.permiteSede,
      }

      const esNuevo = editando === null
      const resultado = esNuevo
        ? await blockTypesApi.crear(accessToken, data)
        : await blockTypesApi.actualizar(accessToken, editando, data)

      setTipos(actual => {
        const siguiente = esNuevo
          ? [...actual, resultado]
          : actual.map(tipo => (tipo.id === resultado.id ? resultado : tipo))

        return siguiente.sort((a, b) => a.nombre.localeCompare(b.nombre))
      })

      setMostrarForm(false)
      setEditando(null)
      setAviso({
        tipo: 'success',
        texto: esNuevo
          ? 'Tipo de bloqueo creado correctamente.'
          : 'Tipo de bloqueo actualizado correctamente.',
      })
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo guardar el tipo de bloqueo.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const cambiarEstado = async () => {
    if (!accessToken || !confirmarEstado || procesando) return

    const actual = confirmarEstado
    setProcesando(true)
    setAviso(null)

    try {
      const actualizado = await blockTypesApi.cambiarEstado(
        accessToken,
        actual.id,
        !actual.activo,
      )

      setTipos(lista => lista.map(tipo => (tipo.id === actualizado.id ? actualizado : tipo)))
      setConfirmarEstado(null)
      setAviso({
        tipo: 'success',
        texto: actualizado.activo
          ? 'Tipo de bloqueo activado correctamente.'
          : 'Tipo de bloqueo desactivado correctamente.',
      })
    } catch (e) {
      setConfirmarEstado(null)
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo cambiar el estado.',
      })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <PageHead
        title="Tipos de bloqueo"
        description="Administra los tipos de excepción disponibles para feriados, vacaciones, permisos, capacitaciones y cierres."
        actions={
          <Button icon="plus" onClick={abrirNuevo} disabled={guardando || procesando}>
            Nuevo tipo de bloqueo
          </Button>
        }
      />

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
                    {editando === null ? 'Crear tipo de bloqueo' : 'Editar tipo de bloqueo'}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Las reglas determinan qué campos aparecerán al registrar una excepción de agenda.
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
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Nombre</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                      <Icon name="calendarEdit" size={16} />
                    </span>
                    <input
                      value={form.nombre}
                      onChange={event => setForm(actual => ({ ...actual, nombre: event.target.value }))}
                      maxLength={80}
                      disabled={guardando}
                      placeholder="Ej. Licencia médica"
                      className="w-full rounded-control border border-line bg-surface py-2.5 pr-3 pl-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </label>

                <label className="min-w-0 lg:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Descripción</span>
                  <textarea
                    value={form.descripcion}
                    onChange={event => setForm(actual => ({ ...actual, descripcion: event.target.value }))}
                    rows={3}
                    maxLength={255}
                    disabled={guardando}
                    placeholder="Describe cuándo debe usarse este tipo de bloqueo."
                    className="w-full resize-none rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
                      <Icon name="user" size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">Reglas para odontólogo</p>
                      <p className="text-[11px] text-muted">Alcance y obligatoriedad en la excepción</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Checkbox
                      checked={form.permiteOdontologo}
                      onChange={event =>
                        setForm(actual => ({
                          ...actual,
                          permiteOdontologo: event.target.checked,
                          requiereOdontologo: event.target.checked
                            ? actual.requiereOdontologo
                            : false,
                        }))
                      }
                      disabled={guardando}
                      className={cn(
                        'w-full rounded-xl border p-3 transition-colors',
                        form.permiteOdontologo
                          ? 'border-brand/40 bg-brand-soft/20'
                          : 'border-line bg-surface hover:bg-alt/40',
                      )}
                      label={
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">Permitir seleccionar odontólogo</span>
                          <span className="block text-xs text-muted mt-0.5">Permite vincular la excepción a un profesional específico</span>
                        </div>
                      }
                    />
                    <Checkbox
                      checked={form.requiereOdontologo}
                      onChange={event =>
                        setForm(actual => ({
                          ...actual,
                          requiereOdontologo: event.target.checked,
                          permiteOdontologo: event.target.checked
                            ? true
                            : actual.permiteOdontologo,
                        }))
                      }
                      disabled={guardando}
                      className={cn(
                        'w-full rounded-xl border p-3 transition-colors',
                        form.requiereOdontologo
                          ? 'border-brand/40 bg-brand-soft/20'
                          : 'border-line bg-surface hover:bg-alt/40',
                      )}
                      label={
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">Odontólogo obligatorio</span>
                          <span className="block text-xs text-muted mt-0.5">La excepción requerirá seleccionar obligatoriamente un odontólogo</span>
                        </div>
                      }
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
                      <Icon name="mapPin" size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">Reglas para sede</p>
                      <p className="text-[11px] text-muted">Alcance y obligatoriedad en la excepción</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Checkbox
                      checked={form.permiteSede}
                      onChange={event =>
                        setForm(actual => ({
                          ...actual,
                          permiteSede: event.target.checked,
                          requiereSede: event.target.checked ? actual.requiereSede : false,
                        }))
                      }
                      disabled={guardando}
                      className={cn(
                        'w-full rounded-xl border p-3 transition-colors',
                        form.permiteSede
                          ? 'border-brand/40 bg-brand-soft/20'
                          : 'border-line bg-surface hover:bg-alt/40',
                      )}
                      label={
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">Permitir seleccionar sede</span>
                          <span className="block text-xs text-muted mt-0.5">Permite vincular la excepción a una sede en particular</span>
                        </div>
                      }
                    />
                    <Checkbox
                      checked={form.requiereSede}
                      onChange={event =>
                        setForm(actual => ({
                          ...actual,
                          requiereSede: event.target.checked,
                          permiteSede: event.target.checked ? true : actual.permiteSede,
                        }))
                      }
                      disabled={guardando}
                      className={cn(
                        'w-full rounded-xl border p-3 transition-colors',
                        form.requiereSede
                          ? 'border-brand/40 bg-brand-soft/20'
                          : 'border-line bg-surface hover:bg-alt/40',
                      )}
                      label={
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">Sede obligatoria</span>
                          <span className="block text-xs text-muted mt-0.5">La excepción requerirá seleccionar obligatoriamente una sede</span>
                        </div>
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5 lg:col-span-2">
                  <Button variant="ghost" onClick={cerrarForm} disabled={guardando}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={guardando}>
                    {guardando
                      ? 'Guardando…'
                      : editando === null
                        ? 'Crear tipo'
                        : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 className="font-bold text-ink">Catálogo de tipos</h2>
            <p className="mt-1 text-xs text-muted">
              {tipos.length} tipo{tipos.length === 1 ? '' : 's'} en el sistema
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Buscar tipo de bloqueo..."
              aria-label="Buscar tipo de bloqueo"
              value={busqueda}
              onChange={e => cambiarBusqueda(e.target.value)}
              onClear={() => cambiarBusqueda('')}
              className="w-full sm:w-64"
            />

            <AnimatedSelect
              label="Filtrar tipos por estado"
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
          <BlockTypesSkeleton count={4} />
        ) : error ? (
          <div className="p-10 text-center">
            <p role="alert" className="text-sm text-danger">{error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => setRefresh(n => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : tipos.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="calendarEdit" size={36} className="mx-auto text-muted" />
            <p className="mt-3 font-semibold text-ink">No hay tipos de bloqueo registrados.</p>
            <p className="mt-1 text-sm text-muted">Comienza registrando el primer tipo de excepción de agenda.</p>
            <Button icon="plus" className="mt-4" onClick={abrirNuevo} disabled={guardando || procesando}>
              Nuevo tipo de bloqueo
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 bg-alt/40 p-3 sm:p-4 lg:grid-cols-2">
              {visibles.map((tipo, index) => (
                <motion.article
                  key={tipo.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                  className={cn(
                    'flex min-w-0 flex-col justify-between rounded-xl border border-l-[3px] bg-surface p-4 shadow-sm transition-all hover:shadow-card',
                    tipo.activo
                      ? 'border-line border-l-brand hover:border-brand/50'
                      : 'border-line border-l-slate-300 hover:border-slate-400',
                  )}
                >
                  <div>
                    {/* ENCABEZADO CON ICONO, TÍTULO, ESTADO Y DESCRIPCIÓN */}
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
                          tipo.activo ? 'bg-brand-soft text-brand' : 'bg-alt text-muted',
                        )}
                      >
                        <Icon name="calendarEdit" size={20} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-ink">{tipo.nombre}</h3>

                          <span
                            className={cn(
                              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                              tipo.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                tipo.activo ? 'bg-emerald-500' : 'bg-slate-400',
                              )}
                            />
                            {tipo.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        {/* DESCRIPCIÓN: Debajo del título, a la derecha del icono */}
                        {tipo.descripcion && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                            {tipo.descripcion}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ALCANCE: ODONTÓLOGO Y SEDE */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-alt/60 p-2.5">
                        <span className="block text-[11px] font-semibold text-ink">Odontólogo</span>
                        <span className="text-xs text-muted">
                          {!tipo.permiteOdontologo
                            ? 'No permitido'
                            : tipo.requiereOdontologo
                              ? 'Obligatorio'
                              : 'Opcional'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-alt/60 p-2.5">
                        <span className="block text-[11px] font-semibold text-ink">Sede</span>
                        <span className="text-xs text-muted">
                          {!tipo.permiteSede
                            ? 'No permitida'
                            : tipo.requiereSede
                              ? 'Obligatoria'
                              : 'Opcional'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACCIONES */}
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                    <button
                      type="button"
                      onClick={() => abrirEditar(tipo)}
                      disabled={guardando || procesando}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                    >
                      <Icon name="edit" size={15} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmarEstado(tipo)}
                      disabled={guardando || procesando}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50',
                        tipo.activo
                          ? 'border-line text-ink-soft hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                          : 'border-brand text-brand hover:bg-brand-soft',
                      )}
                    >
                      {tipo.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </motion.article>
              ))}

              {visibles.length === 0 && (
                <div className="rounded-xl bg-surface px-5 py-12 text-center lg:col-span-2">
                  <Icon name="calendarEdit" size={28} className="mx-auto text-muted" />
                  <p className="mt-2 text-sm text-ink">
                    {busqueda || filtro !== 'todas'
                      ? 'No se encontraron tipos de bloqueo con los filtros seleccionados.'
                      : 'No hay tipos de bloqueo registrados.'}
                  </p>
                  <Button icon="plus" className="mt-4" onClick={abrirNuevo} disabled={guardando || procesando}>
                    Nuevo tipo de bloqueo
                  </Button>
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

      <ConfirmDialog
        open={confirmarEstado !== null}
        title={confirmarEstado?.activo ? '¿Desactivar tipo de bloqueo?' : '¿Activar tipo de bloqueo?'}
        description={
          confirmarEstado?.activo
            ? 'El tipo dejará de aparecer para nuevos bloqueos, pero los registros históricos conservarán su referencia.'
            : 'El tipo volverá a estar disponible para registrar nuevas excepciones de agenda.'
        }
        confirmLabel={procesando
          ? 'Procesando…'
          : confirmarEstado?.activo
            ? 'Desactivar'
            : 'Activar'}
        cancelLabel="Cancelar"
        onCancel={() => {
          if (!procesando) setConfirmarEstado(null)
        }}
        onConfirm={() => void cambiarEstado()}
      />
    </>
  )
}
