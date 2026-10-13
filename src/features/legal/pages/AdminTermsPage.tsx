import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ActionsCell,
  AnimatedSelect,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Field,
  Icon,
  Input,
  PageHead,
  Pagination,
  RowActions,
  SearchInput,
  Table,
  TableFoot,
  TableSkeletonRows,
  TableState,
  Tabs,
  Toast,
  Toolbar,
  type Column,
  type TabItem,
  type ToastAviso,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import {
  legalApi,
  type TerminosCondicionesItem,
  type AceptacionTerminosItem,
} from '../api/legalApi'
import { scrollToTopOrElement } from '@/shared/lib/scroll'

type TabType = 'versiones' | 'aceptaciones'

const TABS: readonly TabItem<TabType>[] = [
  { value: 'versiones', label: 'Gestión de Documentos' },
  { value: 'aceptaciones', label: 'Auditoría de Aceptaciones' },
] as const

const COLUMNS_VERSIONES: Column[] = [
  { key: 'version', label: 'Versión', align: 'left', sortable: true },
  { key: 'titulo', label: 'Tipo', align: 'left', sortable: true },
  { key: 'fechaCreacion', label: 'Fecha de Registro', align: 'left', sortable: true },
  { key: 'activo', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

const COLUMNS_ACEPTACIONES: Column[] = [
  { key: 'usuario', label: 'Usuario', align: 'left' },
  { key: 'terminoFirmado', label: 'Documento', align: 'left' },
  { key: 'version', label: 'Version', align: 'center' },
  { key: 'dispositivo', label: 'Dispositivo', align: 'center' },
  { key: 'ip', label: 'Dirección IP', align: 'left' },
  { key: 'fechaAceptacion', label: 'Fecha de Aceptación', align: 'left' },
]

const POR_PAGINA = 10

type FiltroEstado = '' | 'activas' | 'inactivas'

function detectarDispositivo(ua?: string | null) {
  if (!ua || ua.trim() === '') {
    return null
  }
  const uaLower = ua.toLowerCase()
  const esApp = /okhttp|dart|flutter|dalvik|cfnetwork|neodent-app|neodentapp/i.test(uaLower)
  if (esApp) {
    return { tipo: 'app', label: 'App', tone: 'purple' as const, icon: 'phone' as const }
  }
  const esMovil = /mobile|android|iphone|ipad|ipod/i.test(uaLower)
  if (esMovil) {
    return { tipo: 'movil', label: 'Móvil', tone: 'blue' as const, icon: 'phone' as const }
  }
  return { tipo: 'escritorio', label: 'Web', tone: 'gray' as const, icon: 'globe' as const }
}

export function AdminTermsPage() {
  const { accessToken } = useAuth()

  // Tabs state
  const [tabActual, setTabActual] = useState<TabType>('versiones')

  // Versiones states (Backend Paginado)
  const [versiones, setVersiones] = useState<TerminosCondicionesItem[]>([])
  const [cargandoVersiones, setCargandoVersiones] = useState(true)
  const [errorVersiones, setErrorVersiones] = useState('')
  const [busquedaVersiones, setBusquedaVersiones] = useState('')
  const [busquedaDebouncedVersiones, setBusquedaDebouncedVersiones] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('')
  const [paginaVersiones, setPaginaVersiones] = useState(1)
  const [totalElementosVersiones, setTotalElementosVersiones] = useState(0)
  const [totalPaginasVersiones, setTotalPaginasVersiones] = useState(1)

  // Aceptaciones states (Backend Paginado)
  const [aceptaciones, setAceptaciones] = useState<AceptacionTerminosItem[]>([])
  const [cargandoAceptaciones, setCargandoAceptaciones] = useState(true)
  const [errorAceptaciones, setErrorAceptaciones] = useState('')
  const [busquedaAceptaciones, setBusquedaAceptaciones] = useState('')
  const [busquedaDebouncedAceptaciones, setBusquedaDebouncedAceptaciones] = useState('')
  const [paginaAceptaciones, setPaginaAceptaciones] = useState(1)
  const [totalElementosAceptaciones, setTotalElementosAceptaciones] = useState(0)
  const [totalPaginasAceptaciones, setTotalPaginasAceptaciones] = useState(1)

  // Toast aviso
  const [aviso, setAviso] = useState<ToastAviso | null>(null)

  // Expandable form state (Crear / Editar)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoItem, setEditandoItem] = useState<TerminosCondicionesItem | null>(null)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [version, setVersion] = useState('')
  const [activarInmediato, setActivarInmediato] = useState(true)

  // Confirm dialogs
  const [itemActivar, setItemActivar] = useState<TerminosCondicionesItem | null>(null)
  const [itemEliminar, setItemEliminar] = useState<TerminosCondicionesItem | null>(null)
  const [procesandoAccion, setProcesandoAccion] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // DEBOUNCE BÚSQUEDA VERSIONES
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusquedaDebouncedVersiones(busquedaVersiones)
      setPaginaVersiones(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [busquedaVersiones])

  // DEBOUNCE BÚSQUEDA ACEPTACIONES (POR NÚMERO DE DOCUMENTO)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusquedaDebouncedAceptaciones(busquedaAceptaciones)
      setPaginaAceptaciones(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [busquedaAceptaciones])

  // CARGAR VERSIONES PAGINADAS
  const cargarVersiones = async () => {
    if (!accessToken) return
    try {
      setCargandoVersiones(true)
      setErrorVersiones('')

      const activoParam =
        filtroEstado === 'activas' ? true : filtroEstado === 'inactivas' ? false : undefined

      const data = await legalApi.listarVersionesPaginado(accessToken, {
        buscar: busquedaDebouncedVersiones.trim() || undefined,
        activo: activoParam,
        page: paginaVersiones - 1,
        size: POR_PAGINA,
      })

      setVersiones(data.contenido)
      setTotalElementosVersiones(data.totalElementos)
      setTotalPaginasVersiones(Math.max(1, data.totalPaginas))
    } catch (e) {
      setErrorVersiones(e instanceof Error ? e.message : 'No se pudieron cargar las versiones.')
    } finally {
      setCargandoVersiones(false)
    }
  }

  // CARGAR ACEPTACIONES PAGINADAS (BÚSQUEDA EXCLUSIVA POR NÚMERO DE DOCUMENTO)
  const cargarAceptaciones = async () => {
    if (!accessToken) return
    try {
      setCargandoAceptaciones(true)
      setErrorAceptaciones('')

      const data = await legalApi.listarAceptacionesPaginado(accessToken, {
        buscar: busquedaDebouncedAceptaciones.trim() || undefined,
        page: paginaAceptaciones - 1,
        size: POR_PAGINA,
      })

      setAceptaciones(data.contenido)
      setTotalElementosAceptaciones(data.totalElementos)
      setTotalPaginasAceptaciones(Math.max(1, data.totalPaginas))
    } catch (e) {
      setErrorAceptaciones(e instanceof Error ? e.message : 'No se pudieron cargar las aceptaciones.')
    } finally {
      setCargandoAceptaciones(false)
    }
  }

  // REACCIONAR A CAMBIOS DE FILTROS EN VERSIONES
  useEffect(() => {
    if (tabActual === 'versiones') {
      cargarVersiones()
    }
  }, [accessToken, tabActual, busquedaDebouncedVersiones, filtroEstado, paginaVersiones])

  // REACCIONAR A CAMBIOS DE FILTROS EN ACEPTACIONES
  useEffect(() => {
    if (tabActual === 'aceptaciones') {
      cargarAceptaciones()
    }
  }, [accessToken, tabActual, busquedaDebouncedAceptaciones, paginaAceptaciones])

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(
      () => setAviso(null),
      aviso.tipo === 'error' ? 7000 : 4000,
    )
    return () => window.clearTimeout(timer)
  }, [aviso])

  const abrirNuevo = () => {
    setEditandoItem(null)
    setArchivoSeleccionado(null)
    setTitulo('')
    setVersion(`v${totalElementosVersiones + 1}.0`)
    setActivarInmediato(true)
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const abrirEditar = (item: TerminosCondicionesItem) => {
    setEditandoItem(item)
    setArchivoSeleccionado(null)
    setTitulo(item.titulo)
    setVersion(item.version)
    setActivarInmediato(item.activo)
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const handleVerDocumento = async (item: TerminosCondicionesItem) => {
    try {
      await legalApi.abrirDocumento(item.id, item.urlVisualizar)
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo abrir el documento PDF de términos y condiciones.' })
    }
  }

  const limpiarYCerrarForm = () => {
    setMostrarForm(false)
    setEditandoItem(null)
    setArchivoSeleccionado(null)
    setTitulo('')
    setVersion('')
  }

  const cerrarForm = () => {
    if (guardandoRef.current) return
    limpiarYCerrarForm()
  }

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setAviso({ tipo: 'error', texto: 'Solo se admiten documentos en formato PDF.' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setAviso({ tipo: 'error', texto: 'El documento no puede superar los 10 MB.' })
      return
    }

    setArchivoSeleccionado(file)
    if (!titulo) {
      setTitulo(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
    }
  }

  const handleGuardar = async (e: FormEvent) => {
    e.preventDefault()
    if (!accessToken || guardandoRef.current) return

    if (!editandoItem && !archivoSeleccionado) {
      setAviso({ tipo: 'error', texto: 'Debes seleccionar un archivo PDF para la nueva versión.' })
      return
    }

    const versionLimpia = version.trim() || `v${totalElementosVersiones + 1}.0`
    const tituloLimpio = titulo.trim() || `Términos y Condiciones ${versionLimpia}`

    try {
      guardandoRef.current = true
      setGuardando(true)

      if (editandoItem) {
        await legalApi.editarVersion(
          editandoItem.id,
          tituloLimpio,
          versionLimpia,
          archivoSeleccionado,
          activarInmediato,
          accessToken,
        )
        setAviso({
          tipo: 'success',
          texto: `Versión ${versionLimpia} actualizada exitosamente.`,
        })
      } else {
        const res = await legalApi.subirVersion(
          archivoSeleccionado!,
          tituloLimpio,
          versionLimpia,
          activarInmediato,
          accessToken,
        )
        setAviso({
          tipo: 'success',
          texto: `Versión ${res.version} subida y guardada en S3 exitosamente.`,
        })
      }

      limpiarYCerrarForm()
      void cargarVersiones()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar la versión en S3.'
      setAviso({ tipo: 'error', texto: msg })
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  const confirmarActivar = async () => {
    if (!itemActivar || !accessToken) return

    try {
      setProcesandoAccion(true)
      await legalApi.cambiarEstado(itemActivar.id, true, accessToken)
      setAviso({
        tipo: 'success',
        texto: `Versión ${itemActivar.version} activada como la oficial para los pacientes.`,
      })
      setItemActivar(null)
      cargarVersiones()
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo activar la versión.',
      })
      setItemActivar(null)
    } finally {
      setProcesandoAccion(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!itemEliminar || !accessToken) return

    if (itemEliminar.activo) {
      setAviso({
        tipo: 'error',
        texto: 'No se puede eliminar la versión oficial activa.',
      })
      setItemEliminar(null)
      return
    }

    try {
      setProcesandoAccion(true)
      await legalApi.eliminarVersion(itemEliminar.id, accessToken)
      setAviso({
        tipo: 'success',
        texto: `Versión ${itemEliminar.version} eliminada correctamente de S3 y del sistema.`,
      })
      setItemEliminar(null)
      cargarVersiones()
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo eliminar la versión seleccionada.',
      })
      setItemEliminar(null)
    } finally {
      setProcesandoAccion(false)
    }
  }

  const formatoFecha = (fechaStr: string) => {
    if (!fechaStr) return '-'
    try {
      const d = new Date(fechaStr)
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return fechaStr
    }
  }

  const inicioVer = (paginaVersiones - 1) * POR_PAGINA
  const inicioAcep = (paginaAceptaciones - 1) * POR_PAGINA

  return (
    <>
      <PageHead
        title="Documentos legales"
        description="Administra los documentos legales de la plataforma, controla sus versiones y consulta el historial de aceptación de los usuarios."
        actions={
          tabActual === 'versiones' ? (
            <Button icon="plus" onClick={abrirNuevo} disabled={guardando || procesandoAccion}>
              Subir versión
            </Button>
          ) : undefined
        }
      />

      {/* PESTAÑAS PRINCIPALES DEL MÓDULO */}
      <div className="mb-6">
        <Tabs<TabType>
          items={TABS}
          value={tabActual}
          label="Pestañas de términos y políticas"
          onChange={nuevaTab => {
            setTabActual(nuevaTab)
          }}
        />
      </div>

      {/* Notificaciones Toast flotantes en la esquina inferior derecha */}
      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* FORMULARIO EXPANDIBLE DE SUBIDA / EDICIÓN */}
      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-6 min-w-0 max-w-full"
          >
            <Card className="border-brand/30 p-4 sm:p-6 min-w-0 max-w-full overflow-hidden shadow-sm">
              <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-ink truncate">
                    {editandoItem ? `Editar versión ${editandoItem.version}` : 'Subir nueva versión de términos'}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-muted">
                    {editandoItem
                      ? 'Actualiza el nombre, código o reemplaza el PDF oficial en almacenamiento seguro S3.'
                      : 'Carga el documento PDF directamente al almacenamiento S3/R2 para su publicación oficial.'}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar formulario"
                  onClick={cerrarForm}
                  disabled={guardando}
                  className="rounded-lg p-1.5 sm:p-2 text-muted transition hover:bg-alt shrink-0"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <form onSubmit={handleGuardar} className="grid gap-4 min-w-0 max-w-full">
                <label className="block min-w-0 max-w-full">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Documento PDF {editandoItem ? '(Opcional para reemplazar)' : <span className="text-danger">*</span>}
                  </span>

                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    ref={fileInputRef}
                    onChange={handleSeleccionarArchivo}
                    className="hidden"
                    id="terminos-pdf-input"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line hover:border-brand/50 hover:bg-brand-soft/20 cursor-pointer p-3 sm:p-4 transition-colors text-center min-w-0 max-w-full overflow-hidden"
                  >
                    <Icon name="file" size={26} className="text-brand shrink-0" />
                    {archivoSeleccionado ? (
                      <div className="min-w-0 max-w-full px-2">
                        <span className="text-sm font-bold text-ink block truncate max-w-[260px] sm:max-w-md mx-auto">{archivoSeleccionado.name}</span>
                        <span className="text-xs text-brand font-medium block mt-0.5">Archivo seleccionado listo para subir</span>
                      </div>
                    ) : editandoItem ? (
                      <div className="min-w-0 max-w-full px-2">
                        <span className="text-xs font-bold text-brand hover:underline block break-all text-center">
                          Archivo actual: {editandoItem.nombreArchivo}
                        </span>
                        <span className="text-[11px] text-muted block mt-0.5">Haz clic aquí si deseas subir un PDF de reemplazo</span>
                      </div>
                    ) : (
                      <div className="min-w-0 max-w-full px-2">
                        <span className="text-xs font-bold text-brand hover:underline block">
                          Haz clic aquí para seleccionar el archivo PDF
                        </span>
                        <span className="text-[11px] text-muted block mt-0.5">Tamaño máximo permitido: 10 MB</span>
                      </div>
                    )}
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2 min-w-0 max-w-full">
                  <Field label="Código de versión *">
                    <Input
                      icon="lock"
                      required
                      placeholder="Ej. v1.1 o v2.0"
                      value={version}
                      onChange={e => setVersion(e.target.value)}
                      disabled={guardando}
                    />
                  </Field>

                  <Field label="Nombre del documento *">
                    <Input
                      icon="file"
                      required
                      placeholder="Ej. Términos y Condiciones 2026"
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      disabled={guardando}
                    />
                  </Field>
                </div>

                <div className="rounded-xl border border-line bg-alt/40 p-3 sm:p-3.5 min-w-0 max-w-full">
                  <label className="flex items-start sm:items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={activarInmediato}
                      onChange={e => setActivarInmediato(e.target.checked)}
                      disabled={guardando}
                    />
                    <div className="text-xs min-w-0 flex-1">
                      <span className="font-bold text-ink block">Activar como versión oficial</span>
                      <span className="text-muted block mt-0.5">
                        Esta versión será la vigente que deberán aceptar los pacientes durante su registro digital.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-line pt-4">
                  <Button variant="ghost" onClick={cerrarForm} disabled={guardando} className="w-full sm:w-auto">
                    Cancelar
                  </Button>

                  <Button type="submit" disabled={guardando || (!editandoItem && !archivoSeleccionado)} className="w-full sm:w-auto">
                    {guardando ? 'Guardando en S3…' : editandoItem ? 'Guardar cambios' : 'Subir y guardar en S3'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENIDO SEGÚN TAB SELECCIONADA */}
      {tabActual === 'versiones' ? (
        <Card className="min-w-0 max-w-full overflow-hidden">
          <div className="border-b border-line px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-bold text-ink">Gestión de Documentos</h2>
              <p className="mt-0.5 text-xs text-muted">
                Publica, actualiza y administra las versiones de los documentos legales disponibles para los usuarios.
              </p>
            </div>
          </div>

          <Toolbar>
            <SearchInput
              placeholder="Buscar por código de versión o nombre…"
              value={busquedaVersiones}
              onChange={e => setBusquedaVersiones(e.target.value)}
              onClear={() => setBusquedaVersiones('')}
              className="w-full sm:min-w-64 sm:flex-1"
            />

            <AnimatedSelect
              label="Estado"
              value={filtroEstado}
              onChange={val => {
                setFiltroEstado(val as FiltroEstado)
                setPaginaVersiones(1)
              }}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'activas', label: 'Activas' },
                { value: 'inactivas', label: 'Inactivas' },
              ]}
              className="w-full sm:w-44"
            />
          </Toolbar>

          <Table columns={COLUMNS_VERSIONES}>
            {cargandoVersiones ? (
              <TableSkeletonRows rows={POR_PAGINA} cols={COLUMNS_VERSIONES.length} />
            ) : (
              <>
                <TableState
                  colSpan={COLUMNS_VERSIONES.length}
                  error={errorVersiones}
                  empty={!errorVersiones && versiones.length === 0}
                  emptyLabel="No hay versiones de términos registradas."
                />

                {versiones.map(item => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-mono font-bold text-xs bg-brand-soft text-brand px-2.5 py-1 rounded-md border border-brand/20">
                        {item.version}
                      </span>
                    </td>

                    <td>
                      <div className="font-semibold text-xs text-ink">{item.titulo}</div>
                    </td>

                    <td className="text-xs text-muted whitespace-nowrap">
                      {formatoFecha(item.fechaCreacion)}
                    </td>

                    <td className="text-center">
                      <div className="flex justify-center">
                        <Badge tone={item.activo ? 'green' : 'gray'}>
                          {item.activo ? 'Vigente Oficial' : 'Inactiva'}
                        </Badge>
                      </div>
                    </td>

                    <ActionsCell align="center">
                      <RowActions
                        actions={[
                          {
                            label: 'Ver documento (PDF)',
                            icon: 'externalLink',
                            onClick: () => handleVerDocumento(item),
                          },
                          {
                            label: 'Editar versión',
                            icon: 'edit',
                            onClick: () => abrirEditar(item),
                          },
                          {
                            label: 'Activar como oficial',
                            icon: 'checkCircle',
                            show: !item.activo,
                            onClick: () => setItemActivar(item),
                            variant: 'success',
                          },
                          {
                            label: 'Eliminar de S3',
                            icon: 'trash',
                            show: !item.activo,
                            onClick: () => setItemEliminar(item),
                            variant: 'danger',
                          },
                        ]}
                      />
                    </ActionsCell>
                  </tr>
                ))}
              </>
            )}
          </Table>

          {totalElementosVersiones > 0 && (
            <TableFoot
              summary={`Mostrando ${inicioVer + 1}-${Math.min(inicioVer + POR_PAGINA, totalElementosVersiones)} de ${totalElementosVersiones} versiones`}
            >
              <Pagination
                page={paginaVersiones}
                totalPages={totalPaginasVersiones}
                onChange={setPaginaVersiones}
              />
            </TableFoot>
          )}
        </Card>
      ) : (
        /* TAB DE AUDITORÍA DE ACEPTACIONES */
        <Card className="min-w-0 max-w-full overflow-hidden">
          <div className="border-b border-line px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-bold text-ink">Registro de Aceptaciones y Consentimiento</h2>
              <p className="mt-0.5 text-xs text-muted">
                Consulta y verifica las aceptaciones registradas por los usuarios, garantizando la trazabilidad de cada versión.
              </p>
            </div>
          </div>

          <Toolbar>
            <SearchInput
              placeholder="Buscar por número de documento…"
              value={busquedaAceptaciones}
              onChange={e => setBusquedaAceptaciones(e.target.value)}
              onClear={() => setBusquedaAceptaciones('')}
              className="w-full sm:min-w-64 sm:max-w-md"
            />
          </Toolbar>

          <Table columns={COLUMNS_ACEPTACIONES}>
            {cargandoAceptaciones ? (
              <TableSkeletonRows rows={POR_PAGINA} cols={COLUMNS_ACEPTACIONES.length} />
            ) : (
              <>
                <TableState
                  colSpan={COLUMNS_ACEPTACIONES.length}
                  error={errorAceptaciones}
                  empty={!errorAceptaciones && aceptaciones.length === 0}
                  emptyLabel="No hay consentimientos de términos registrados."
                />

                {aceptaciones.map(item => {
                  const disp = detectarDispositivo(item.agenteUsuario)
                  return (
                    <tr key={item.id}>
                      {/* USUARIO */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-ink">
                            {item.tipoDocumento || 'DNI'}. 
                            {item.numeroDocumento && item.numeroDocumento.trim() !== '' && item.numeroDocumento !== '-'
                              ? item.numeroDocumento
                              : 'No registrado'}
                          </span>
                        </div>
                      </td>

                      {/* TÉRMINO FIRMADO */}
                      <td>
                        <div className="font-semibold text-xs text-ink">{item.terminoFirmado}</div>
                      </td>

                      {/* VERSIÓN */}
                      <td className="text-center whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold bg-brand-soft text-brand px-2.5 py-0.5 rounded border border-brand/20">
                          {item.version}
                        </span>
                      </td>

                      {/* DISPOSITIVO */}
                      <td className="text-center whitespace-nowrap">
                        <div className="flex justify-center">
                          {disp ? (
                            <Badge tone={disp.tone} className="gap-1.5 py-0.5">
                              <Icon name={disp.icon} size={12} />
                              <span>{disp.label}</span>
                            </Badge>
                          ) : (
                            <span className="text-muted italic">-</span>
                          )}
                        </div>
                      </td>

                      {/* DIRECCIÓN IP */}
                      <td className="text-xs font-mono text-ink-soft whitespace-nowrap">
                        {item.ip ? (
                          <span className="bg-alt/70 px-2 py-0.5 rounded border border-line/60">
                            {item.ip}
                          </span>
                        ) : (
                          <span className="text-muted italic">-</span>
                        )}
                      </td>

                      {/* FECHA DE ACEPTACIÓN */}
                      <td className="text-xs text-muted whitespace-nowrap">
                        {formatoFecha(item.fechaAceptacion)}
                      </td>
                    </tr>
                  )
                })}
              </>
            )}
          </Table>

          {totalElementosAceptaciones > 0 && (
            <TableFoot
              summary={`Mostrando ${inicioAcep + 1}-${Math.min(inicioAcep + POR_PAGINA, totalElementosAceptaciones)} de ${totalElementosAceptaciones} aceptaciones`}
            >
              <Pagination
                page={paginaAceptaciones}
                totalPages={totalPaginasAceptaciones}
                onChange={setPaginaAceptaciones}
              />
            </TableFoot>
          )}
        </Card>
      )}

      {/* DIÁLOGO PARA ACTIVAR COMO OFICIAL */}
      <ConfirmDialog
        open={itemActivar !== null}
        title="¿Activar versión como oficial?"
        description={
          itemActivar
            ? `La versión ${itemActivar.version} (${itemActivar.titulo}) se convertirá en la oficial vigente para todos los pacientes al registrarse.`
            : ''
        }
        confirmLabel={procesandoAccion ? 'Activando…' : 'Activar como oficial'}
        cancelLabel="Cancelar"
        onConfirm={confirmarActivar}
        onCancel={() => setItemActivar(null)}
      />

      {/* DIÁLOGO PARA ELIMINAR (SOLO INACTIVAS) */}
      <ConfirmDialog
        open={itemEliminar !== null}
        title="¿Eliminar versión de términos?"
        description={
          itemEliminar
            ? `¿Estás seguro de eliminar permanentemente la versión ${itemEliminar.version} (${itemEliminar.nombreArchivo}) de S3 y del sistema?`
            : ''
        }
        confirmLabel={procesandoAccion ? 'Eliminando…' : 'Sí, eliminar de S3'}
        cancelLabel="Cancelar"
        onConfirm={confirmarEliminar}
        onCancel={() => setItemEliminar(null)}
      />
    </>
  )
}
