import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AnimatedSelect, Button, Card, ConfirmDialog, Icon, PageHead, Pagination, SearchInput, SedesCardsSkeleton, TableFoot, Toast } from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import { sedesApi, type Sede, type SedeInput } from '../api/sedesApi'
import ubigeoDataRaw from '@/shared/data/ubigeoPeru.json'

type Formulario = { [K in keyof SedeInput]: string }
type Filtro = 'todas' | 'activas' | 'inactivas'
type Aviso = { tipo: 'success' | 'error'; texto: string }

type UbigeoDistrito = {
  ubigeo: string
  id: number
  inei?: string
}

type UbigeoData = Record<string, Record<string, Record<string, UbigeoDistrito>>>
const ubigeoData = ubigeoDataRaw as unknown as UbigeoData

const VACIO: Formulario = {
  nombre: '', direccion: '', distrito: '', provincia: '',
  departamento: '', telefono: '', email: '',
}

function capitalizar(texto: string): string {
  if (!texto) return ''
  const minusculas = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en'])
  return texto
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((palabra, index) => {
      if (index > 0 && minusculas.has(palabra)) {
        return palabra
      }
      return palabra.charAt(0).toUpperCase() + palabra.slice(1)
    })
    .join(' ')
}

const POR_PAGINA = 6
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function SedesPage() {
  const { accessToken } = useAuth()

  const [sedes, setSedes] = useState<Sede[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [pagina, setPagina] = useState(1)

  const [form, setForm] = useState<Formulario>(VACIO)
  const [editando, setEditando] = useState<number | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [confirmar, setConfirmar] = useState<Sede | null>(null)

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)

  // OPCIONES DE UBIGEO Y CASCADA DE DEPARTAMENTO -> PROVINCIA -> DISTRITO
  const opcionesDepartamentos = useMemo(() => [
    { value: '', label: 'Seleccionar departamento' },
    ...Object.keys(ubigeoData)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map(dep => ({
        value: capitalizar(dep),
        label: capitalizar(dep),
      })),
  ], [])

  const deptoKey = useMemo(() => {
    if (!form.departamento) return null
    const depNorm = normalizar(form.departamento)
    return Object.keys(ubigeoData).find(k => normalizar(k) === depNorm) ?? null
  }, [form.departamento])

  const opcionesProvincias = useMemo(() => {
    if (!deptoKey) return [{ value: '', label: 'Seleccionar provincia' }]
    const provincias = Object.keys(ubigeoData[deptoKey] ?? {})
    return [
      { value: '', label: 'Seleccionar provincia' },
      ...provincias
        .sort((a, b) => a.localeCompare(b, 'es'))
        .map(prov => ({
          value: capitalizar(prov),
          label: capitalizar(prov),
        })),
    ]
  }, [deptoKey])

  const provKey = useMemo(() => {
    if (!deptoKey || !form.provincia) return null
    const provNorm = normalizar(form.provincia)
    const provincias = ubigeoData[deptoKey] ?? {}
    return Object.keys(provincias).find(k => normalizar(k) === provNorm) ?? null
  }, [deptoKey, form.provincia])

  const opcionesDistritos = useMemo(() => {
    if (!deptoKey || !provKey) return [{ value: '', label: 'Seleccionar distrito' }]
    const distritos = Object.keys(ubigeoData[deptoKey]?.[provKey] ?? {})
    return [
      { value: '', label: 'Seleccionar distrito' },
      ...distritos
        .sort((a, b) => a.localeCompare(b, 'es'))
        .map(dist => ({
          value: capitalizar(dist),
          label: capitalizar(dist),
        })),
    ]
  }, [deptoKey, provKey])

  const cambiarDepartamento = (depto: string) => {
    setForm(actual => ({
      ...actual,
      departamento: depto,
      provincia: '',
      distrito: '',
    }))
  }

  const cambiarProvincia = (prov: string) => {
    setForm(actual => ({
      ...actual,
      provincia: prov,
      distrito: '',
    }))
  }

  const cambiarDistrito = (dist: string) => {
    setForm(actual => ({
      ...actual,
      distrito: dist,
    }))
  }

  // CONSULTAR SEDES.
  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setError('No se encontró una sesión activa.')
      return
    }

    let activo = true
    setLoading(true)
    setError('')

    sedesApi.listar(accessToken)
      .then(data => { if (activo) setSedes(data) })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar las sedes.')
      })
      .finally(() => { if (activo) setLoading(false) })

    return () => { activo = false }
  }, [accessToken, actualizacion])

  // OCULTAR NOTIFICACIONES AUTOMÁTICAMENTE.
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirEditar = (sede: Sede) => {
    const depKey = sede.departamento
      ? Object.keys(ubigeoData).find(k => normalizar(k) === normalizar(sede.departamento!))
      : null

    const provKey = depKey && sede.provincia
      ? Object.keys(ubigeoData[depKey] ?? {}).find(k => normalizar(k) === normalizar(sede.provincia!))
      : null

    const distKey = depKey && provKey && sede.distrito
      ? Object.keys(ubigeoData[depKey]?.[provKey] ?? {}).find(k => normalizar(k) === normalizar(sede.distrito!))
      : null

    setForm({
      nombre: sede.nombre,
      direccion: sede.direccion,
      departamento: depKey ? capitalizar(depKey) : (sede.departamento ? capitalizar(sede.departamento) : ''),
      provincia: provKey ? capitalizar(provKey) : (sede.provincia ? capitalizar(sede.provincia) : ''),
      distrito: distKey ? capitalizar(distKey) : (sede.distrito ? capitalizar(sede.distrito) : ''),
      telefono: sede.telefono ?? '',
      email: sede.email ?? '',
    })

    setEditando(sede.id)
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

  // GUARDAR SEDE.
  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!accessToken || guardando) return

    setGuardando(true)
    setFormError('')
    setAviso(null)

    try {
      const data: SedeInput = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim(),
        distrito: form.distrito.trim() || null,
        provincia: form.provincia.trim() || null,
        departamento: form.departamento.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
      }

      if (!data.nombre || !data.direccion) {
        throw new Error('El nombre y la dirección de la sede son obligatorios.')
      }

      const esNuevo = editando === null
      const resultado = esNuevo
        ? await sedesApi.crear(accessToken, data)
        : await sedesApi.actualizar(accessToken, editando, data)

      setSedes(actual => esNuevo
        ? [...actual, resultado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        : actual.map(s => s.id === resultado.id ? resultado : s)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      )

      setMostrarForm(false)
      setEditando(null)

      setAviso({
        tipo: 'success',
        texto: esNuevo ? 'Sede registrada correctamente.' : 'Información de la sede actualizada correctamente.',
      })

    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo guardar la sede.'
      setFormError(mensaje)
      setAviso({ tipo: 'error', texto: mensaje })
    } finally {
      setGuardando(false)
    }
  }

  // ACTIVAR O DESACTIVAR SEDE.
  const cambiarEstado = async () => {
    if (!accessToken || !confirmar || procesando) return

    const sede = confirmar
    setProcesando(true)
    setAviso(null)

    try {
      const resultado = await sedesApi.cambiarEstado(accessToken, sede.id, !sede.activo)

      setSedes(actual => actual.map(s => s.id === resultado.id ? resultado : s))
      setConfirmar(null)

      setAviso({
        tipo: 'success',
        texto: resultado.activo ? 'Sede activada correctamente.' : 'Sede desactivada correctamente.',
      })

    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo cambiar el estado de la sede.'
      setConfirmar(null)
      setAviso({ tipo: 'error', texto: mensaje })
    } finally {
      setProcesando(false)
    }
  }

  // BÚSQUEDA, FILTROS Y PAGINACIÓN.
  const filtradas = sedes.filter(s => {
    const texto = `${s.nombre} ${s.direccion} ${s.distrito ?? ''} ${s.provincia ?? ''} ${s.departamento ?? ''}`
    const coincide = normalizar(texto).includes(normalizar(busqueda.trim()))

    if (filtro === 'activas') return coincide && s.activo
    if (filtro === 'inactivas') return coincide && !s.activo
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
        title="Sedes"
        description="Administra las ubicaciones y los datos de atención de NeoDents."
        actions={
          <Button icon="plus" onClick={abrirNuevo} disabled={guardando || procesando}>
            Nueva sede
          </Button>
        }
      />

      {/* NOTIFICACIÓN FLOTANTE */}
      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* FORMULARIO DE SEDE */}
      <AnimatePresence>
        {mostrarForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mb-5">

            <Card className="border-brand/30 p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    {editando === null ? 'Registrar nueva sede' : 'Editar sede'}
                  </h2>
                  <p className="mt-1 text-sm text-muted">Completa la información general de la sede.</p>
                </div>

                <button type="button" aria-label="Cerrar formulario" onClick={cerrarForm}
                  disabled={guardando} className="rounded-lg p-2 text-muted transition hover:bg-alt">
                  <Icon name="x" size={20} />
                </button>
              </div>

              <form onSubmit={e => void guardar(e)} className="space-y-4">
                {/* 1. NOMBRE DE LA SEDE (EXPANDIDO EN TODO EL ANCHO) */}
                <div>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                      Nombre de la sede <span className="text-danger">*</span>
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                        <Icon name="mapPin" size={15} />
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        value={form.nombre}
                        onChange={e => setForm(actual => ({ ...actual, nombre: e.target.value }))}
                        placeholder="Ej. Sede San Isidro - Principal"
                        className="w-full rounded-control border border-line bg-surface py-2.5 pr-4 pl-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                      />
                    </div>
                  </label>
                </div>

                {/* 2. UBICACIÓN: DEPARTAMENTO, PROVINCIA Y DISTRITO EN 3 COMBOS RELACIONADOS */}
                <div className="rounded-xl border border-line/70 bg-alt/30 p-3.5 sm:p-4">
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                      Ubicación geográfica
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Selecciona el departamento para filtrar las provincias y distritos correspondientes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-ink">Departamento</span>
                      <AnimatedSelect
                        label="Departamento"
                        value={form.departamento}
                        options={opcionesDepartamentos}
                        onChange={cambiarDepartamento}
                        disabled={guardando}
                        placeholder="Seleccionar departamento"
                      />
                    </div>

                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-ink">Provincia</span>
                      <AnimatedSelect
                        label="Provincia"
                        value={form.provincia}
                        options={opcionesProvincias}
                        onChange={cambiarProvincia}
                        disabled={guardando || !deptoKey || opcionesProvincias.length <= 1}
                        placeholder={!deptoKey ? 'Elige departamento' : 'Seleccionar provincia'}
                      />
                    </div>

                    <div>
                      <span className="mb-1.5 block text-xs font-semibold text-ink">Distrito</span>
                      <AnimatedSelect
                        label="Distrito"
                        value={form.distrito}
                        options={opcionesDistritos}
                        onChange={cambiarDistrito}
                        disabled={guardando || !provKey || opcionesDistritos.length <= 1}
                        placeholder={!provKey ? 'Elige provincia' : 'Seleccionar distrito'}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. DIRECCIÓN EXACTA */}
                <div>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                      Dirección exacta <span className="text-danger">*</span>
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                        <Icon name="location" size={15} />
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={200}
                        value={form.direccion}
                        onChange={e => setForm(actual => ({ ...actual, direccion: e.target.value }))}
                        placeholder="Ej. Av. Javier Prado Este 1234, Urb. Corpac, Oficina 502"
                        className="w-full rounded-control border border-line bg-surface py-2.5 pr-4 pl-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                      />
                    </div>
                  </label>
                </div>

                {/* 4. TELÉFONO Y CORREO ELECTRÓNICO */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                      Teléfono de contacto
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                        <Icon name="phone" size={15} />
                      </span>
                      <input
                        type="tel"
                        maxLength={20}
                        value={form.telefono}
                        onChange={e => setForm(actual => ({ ...actual, telefono: e.target.value }))}
                        placeholder="Ej. (01) 440-2020 / 999 888 777"
                        className="w-full rounded-control border border-line bg-surface py-2.5 pr-4 pl-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                      Correo electrónico
                    </span>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                        <Icon name="mail" size={15} />
                      </span>
                      <input
                        type="email"
                        maxLength={120}
                        value={form.email}
                        onChange={e => setForm(actual => ({ ...actual, email: e.target.value }))}
                        placeholder="Ej. contacto.sede@neodents.pe"
                        className="w-full rounded-control border border-line bg-surface py-2.5 pr-4 pl-9 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                      />
                    </div>
                  </label>
                </div>

                {formError && (
                  <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
                    {formError}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
                  <Button variant="ghost" onClick={cerrarForm} disabled={guardando}>Cancelar</Button>
                  <Button type="submit" disabled={guardando}>
                    {guardando ? 'Guardando…' : editando === null ? 'Registrar sede' : 'Guardar cambios'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTADO DE SEDES */}
      <Card className="overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 className="font-bold text-ink">Sedes registradas</h2>
            <p className="mt-1 text-xs text-muted">
              {sedes.length} sede{sedes.length === 1 ? '' : 's'} en el sistema
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Buscar sede..."
              aria-label="Buscar sede"
              value={busqueda}
              onChange={e => cambiarBusqueda(e.target.value)}
              onClear={() => cambiarBusqueda('')}
              className="w-full sm:w-64"
            />

            <AnimatedSelect
              label="Filtrar sedes por estado"
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
          <SedesCardsSkeleton count={4} />
        ) : error ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-danger">{error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => setActualizacion(n => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {/* TARJETAS DE SEDES */}
            <div className="grid gap-3 bg-alt/40 p-3 sm:p-4 lg:grid-cols-2">
              {visibles.map((sede, index) => (
                <motion.article
                  key={sede.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                  className={`flex min-w-0 flex-col justify-between rounded-xl border border-l-[3px] bg-surface p-4 shadow-sm transition-all hover:shadow-card ${
                    sede.activo
                      ? 'border-line border-l-brand hover:border-brand/50'
                      : 'border-line border-l-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div>
                    {/* NOMBRE Y ESTADO */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                          sede.activo ? 'bg-brand-soft text-brand' : 'bg-alt text-muted'
                        }`}>
                          <svg viewBox="0 0 24 24" width="21" height="21" fill="none"
                            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden="true">
                            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                        </span>

                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-ink">{sede.nombre}</h3>
                          <p className="mt-1 break-words text-xs leading-relaxed text-muted">{sede.direccion}</p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        sede.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          sede.activo ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                        {sede.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {/* INFORMACIÓN ADICIONAL */}
                    <div className="mt-4 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
                      {(sede.distrito || sede.provincia || sede.departamento) && (
                        <p className="min-w-0 text-muted sm:col-span-2">
                          <span className="font-semibold text-ink">Ubicación: </span>
                          {[sede.distrito, sede.provincia, sede.departamento].filter(Boolean).join(', ')}
                        </p>
                      )}

                      {sede.telefono && (
                        <p className="text-muted">
                          <span className="font-semibold text-ink">Teléfono: </span>{sede.telefono}
                        </p>
                      )}

                      {sede.email && (
                        <p className="min-w-0 break-words text-muted">
                          <span className="font-semibold text-ink">Correo: </span>{sede.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ACCIONES */}
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                    <button
                      type="button"
                      onClick={() => abrirEditar(sede)}
                      disabled={guardando || procesando}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                    >
                      <Icon name="edit" size={15} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmar(sede)}
                      disabled={guardando || procesando}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${
                        sede.activo
                          ? 'border-line text-ink-soft hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                          : 'border-brand text-brand hover:bg-brand-soft'
                      }`}
                    >
                      {sede.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </motion.article>
              ))}

              {visibles.length === 0 && (
                <div className="rounded-xl bg-surface px-5 py-12 text-center lg:col-span-2">
                  <Icon name="search" size={28} className="mx-auto text-muted" />
                  <p className="mt-3 text-sm text-muted">
                    {sedes.length === 0
                      ? 'Todavía no hay sedes registradas.'
                      : 'No se encontraron sedes con los filtros seleccionados.'}
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
        title={confirmar?.activo ? '¿Desactivar sede?' : '¿Activar sede?'}
        description={confirmar
          ? `La sede "${confirmar.nombre}" ${confirmar.activo
            ? 'dejará de estar disponible para nuevas reservas. Las citas existentes no se cancelarán automáticamente.'
            : 'volverá a estar disponible para nuevas reservas.'}`
          : ''}
        confirmLabel={procesando ? 'Procesando…' : confirmar?.activo ? 'Desactivar' : 'Activar'}
        cancelLabel="Cancelar"
        onConfirm={() => void cambiarEstado()}
        onCancel={() => { if (!procesando) setConfirmar(null) }}
      />
    </>
  )
}