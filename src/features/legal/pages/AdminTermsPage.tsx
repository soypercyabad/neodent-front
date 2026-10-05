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
  Toast,
  Toolbar,
  useTableSort,
  type Column,
  type ToastAviso,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import {
  legalApi,
  type TerminosCondicionesItem,
  type AceptacionTerminosItem,
} from '../api/legalApi'
import { scrollToTopOrElement } from '@/shared/lib/scroll'

const COLUMNS_VERSIONES: Column[] = [
  { key: 'version', label: 'Versión', sortable: true },
  { key: 'titulo', label: 'Nombre', sortable: true },
  { key: 'fechaCreacion', label: 'Fecha de Registro', sortable: true },
  { key: 'activo', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

const COLUMNS_ACEPTACIONES: Column[] = [
  { key: 'nombreCompleto', label: 'Persona / Usuario', sortable: true },
  { key: 'versionTerminos', label: 'Versión', align: 'center', sortable: true },
  { key: 'aceptadoEn', label: 'Fecha de Aceptación', sortable: true },
  { key: 'ip', label: 'IP', sortable: true },
]

const POR_PAGINA_VERSIONES = 8
const POR_PAGINA_ACEPTACIONES = 8

type FiltroEstado = '' | 'activas' | 'inactivas'

export function AdminTermsPage() {
  const { accessToken } = useAuth()

  // Versiones states
  const [versiones, setVersiones] = useState<TerminosCondicionesItem[]>([])
  const [cargandoVersiones, setCargandoVersiones] = useState(true)
  const [errorVersiones, setErrorVersiones] = useState('')
  const [busquedaVersiones, setBusquedaVersiones] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('')
  const [paginaVersiones, setPaginaVersiones] = useState(1)

  // Aceptaciones states (solo visual)
  const [aceptaciones, setAceptaciones] = useState<AceptacionTerminosItem[]>([])
  const [cargandoAceptaciones, setCargandoAceptaciones] = useState(true)
  const [errorAceptaciones, setErrorAceptaciones] = useState('')
  const [busquedaAceptaciones, setBusquedaAceptaciones] = useState('')
  const [filtroVersionAceptacion, setFiltroVersionAceptacion] = useState('')
  const [paginaAceptaciones, setPaginaAceptaciones] = useState(1)

  // Toast aviso
  const [aviso, setAviso] = useState<ToastAviso | null>(null)

  // Expandable form state (Crear / Editar)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoItem, setEditandoItem] = useState<TerminosCondicionesItem | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [version, setVersion] = useState('')
  const [activarInmediato, setActivarInmediato] = useState(true)

  // Confirm dialogs
  const [itemActivar, setItemActivar] = useState<TerminosCondicionesItem | null>(null)
  const [itemEliminar, setItemEliminar] = useState<TerminosCondicionesItem | null>(null)
  const [procesandoAccion, setProcesandoAccion] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargarVersiones = async () => {
    if (!accessToken) return
    try {
      setCargandoVersiones(true)
      setErrorVersiones('')
      const data = await legalApi.listarVersiones(accessToken)
      setVersiones(data)
    } catch (e) {
      setErrorVersiones(e instanceof Error ? e.message : 'No se pudieron cargar las versiones.')
    } finally {
      setCargandoVersiones(false)
    }
  }

  const cargarAceptaciones = async () => {
    if (!accessToken) return
    try {
      setCargandoAceptaciones(true)
      setErrorAceptaciones('')
      const data = await legalApi.listarAceptaciones(accessToken)
      setAceptaciones(data)
    } catch (e) {
      setErrorAceptaciones(e instanceof Error ? e.message : 'No se pudieron cargar las aceptaciones.')
    } finally {
      setCargandoAceptaciones(false)
    }
  }

  useEffect(() => {
    cargarVersiones()
    cargarAceptaciones()
  }, [accessToken])

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
    setVersion(`v${versiones.length + 1}.0`)
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
      await legalApi.abrirDocumento(item.id, accessToken || undefined)
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo abrir el documento PDF de términos y condiciones.' })
    }
  }

  const cerrarForm = () => {
    if (guardando) return
    setMostrarForm(false)
    setEditandoItem(null)
    setArchivoSeleccionado(null)
    setTitulo('')
    setVersion('')
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
    if (!accessToken) return

    if (!editandoItem && !archivoSeleccionado) {
      setAviso({ tipo: 'error', texto: 'Debes seleccionar un archivo PDF para la nueva versión.' })
      return
    }

    const versionLimpia = version.trim() || `v${versiones.length + 1}.0`
    const tituloLimpio = titulo.trim() || `Términos y Condiciones ${versionLimpia}`

    try {
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

      cerrarForm()
      cargarVersiones()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar la versión en S3.'
      setAviso({ tipo: 'error', texto: msg })
    } finally {
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
    if (!fechaStr) return '—'
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

  // Filtrado y ordenamiento de Versiones
  const versionesFiltradas = useMemo(() => {
    const q = busquedaVersiones.trim().toLowerCase()
    return versiones.filter(item => {
      if (q) {
        const coincide =
          item.version.toLowerCase().includes(q) ||
          item.titulo.toLowerCase().includes(q)
        if (!coincide) return false
      }
      if (filtroEstado === 'activas' && !item.activo) return false
      if (filtroEstado === 'inactivas' && item.activo) return false
      return true
    })
  }, [versiones, busquedaVersiones, filtroEstado])

  const {
    sortColumn: sortColVer,
    sortDirection: sortDirVer,
    handleSort: handleSortVer,
    sortedItems: sortedVersiones,
  } = useTableSort(versionesFiltradas, {
    initialColumn: 'version',
    initialDirection: 'desc',
  })

  const totalPagsVer = Math.max(1, Math.ceil(sortedVersiones.length / POR_PAGINA_VERSIONES))
  const pagActVer = Math.min(paginaVersiones, totalPagsVer)
  const inicioVer = (pagActVer - 1) * POR_PAGINA_VERSIONES
  const versionesVisibles = sortedVersiones.slice(inicioVer, inicioVer + POR_PAGINA_VERSIONES)

  // Filtrado y ordenamiento de Aceptaciones (solo visual)
  const aceptacionesFiltradas = useMemo(() => {
    const q = busquedaAceptaciones.trim().toLowerCase()
    return aceptaciones.filter(item => {
      if (q) {
        const coincide =
          item.nombreCompleto.toLowerCase().includes(q) ||
          item.correo.toLowerCase().includes(q) ||
          (item.numeroDocumento && item.numeroDocumento.toLowerCase().includes(q))
        if (!coincide) return false
      }
      if (filtroVersionAceptacion && item.versionTerminos !== filtroVersionAceptacion) {
        return false
      }
      return true
    })
  }, [aceptaciones, busquedaAceptaciones, filtroVersionAceptacion])

  const {
    sortColumn: sortColAcep,
    sortDirection: sortDirAcep,
    handleSort: handleSortAcep,
    sortedItems: sortedAceptaciones,
  } = useTableSort(aceptacionesFiltradas, {
    initialColumn: 'aceptadoEn',
    initialDirection: 'desc',
  })

  const totalPagsAcep = Math.max(1, Math.ceil(sortedAceptaciones.length / POR_PAGINA_ACEPTACIONES))
  const pagActAcep = Math.min(paginaAceptaciones, totalPagsAcep)
  const inicioAcep = (pagActAcep - 1) * POR_PAGINA_ACEPTACIONES
  const aceptacionesVisibles = sortedAceptaciones.slice(inicioAcep, inicioAcep + POR_PAGINA_ACEPTACIONES)

  const opcionesVersionesAceptacion = useMemo(() => {
    const setVers = new Set(versiones.map(v => v.version))
    return [
      { value: '', label: 'Todas las versiones' },
      ...Array.from(setVers).map(v => ({ value: v, label: `Versión ${v}` })),
    ]
  }, [versiones])

  return (
    <>
      <PageHead
        title="Legales (S3)"
        description="Gestiona los documentos oficiales de Términos y Condiciones en S3/R2 y audita las aceptaciones de pacientes."
        actions={
          <Button icon="plus" onClick={abrirNuevo} disabled={guardando || procesandoAccion}>
            Subir versión
          </Button>
        }
      />

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
            <Card className="border-brand/30 p-4 sm:p-6 min-w-0 max-w-full overflow-hidden">
              <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-ink truncate">
                    {editandoItem ? `Editar versión ${editandoItem.version}` : 'Subir nueva versión de términos'}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-muted">
                    {editandoItem
                      ? 'Actualiza el nombre, código o reemplaza el PDF oficial en S3.'
                      : 'Carga el documento PDF directamente a tu almacenamiento en S3.'}
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
                        Esta versión será la que firmen o acepten los pacientes durante su registro.
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

      {/* LAYOUT EN 2 PANELES: VERSIONES (IZQUIERDA) Y ACEPTACIONES (DERECHA) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 min-w-0 max-w-full">
        {/* PANEL IZQUIERDO: VERSIONES DE TÉRMINOS (CRUD) */}
        <div className="xl:col-span-7 min-w-0 max-w-full">
          <Card className="min-w-0 max-w-full overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-bold text-ink">Versiones de Términos</h2>
              <p className="mt-0.5 text-xs text-muted">
                Documentos registrados en S3. La versión activa no puede eliminarse ni desactivarse directamente.
              </p>
            </div>

            <Toolbar>
              <SearchInput
                placeholder="Buscar por versión o nombre…"
                value={busquedaVersiones}
                onChange={e => {
                  setBusquedaVersiones(e.target.value)
                  setPaginaVersiones(1)
                }}
                onClear={() => {
                  setBusquedaVersiones('')
                  setPaginaVersiones(1)
                }}
                className="w-full sm:min-w-44 sm:flex-1"
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
                className="w-full sm:w-40"
              />
            </Toolbar>

            <Table
              columns={COLUMNS_VERSIONES}
              sortColumn={sortColVer}
              sortDirection={sortDirVer}
              onSort={handleSortVer}
            >
              {cargandoVersiones ? (
                <TableSkeletonRows rows={POR_PAGINA_VERSIONES} cols={COLUMNS_VERSIONES.length} />
              ) : (
                <>
                  <TableState
                    colSpan={COLUMNS_VERSIONES.length}
                    error={errorVersiones}
                    empty={!errorVersiones && versionesFiltradas.length === 0}
                    emptyLabel="No hay versiones de términos registradas."
                  />

                  {versionesVisibles.map(item => (
                      <tr key={item.id}>
                        <td>
                          <span className="font-mono font-bold text-xs bg-brand-soft text-brand px-2 py-0.5 rounded">
                            {item.version}
                          </span>
                        </td>

                        <td>
                          <div className="text-xs text-black">{item.titulo}</div>
                        </td>

                        <td className="text-xs text-muted whitespace-nowrap">
                          {formatoFecha(item.fechaCreacion)}
                        </td>

                        <td className="text-center">
                          <div className="flex justify-center">
                            <Badge tone={item.activo ? 'green' : 'gray'}>
                              {item.activo ? 'Activa' : 'Inactiva'}
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

            {versionesFiltradas.length > 0 && (
              <TableFoot
                summary={`Mostrando ${inicioVer + 1}–${Math.min(inicioVer + POR_PAGINA_VERSIONES, versionesFiltradas.length)} de ${versionesFiltradas.length} versiones`}
              >
                <Pagination page={pagActVer} totalPages={totalPagsVer} onChange={setPaginaVersiones} />
              </TableFoot>
            )}
          </Card>
        </div>

        {/* PANEL DERECHO: PERSONAS QUE ACEPTARON LOS TÉRMINOS (SOLO VISUAL) */}
        <div className="xl:col-span-5 min-w-0 max-w-full">
          <Card className="min-w-0 max-w-full overflow-hidden">
            <div className="border-b border-line px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-ink">Aceptaciones Registradas</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Registro de auditoría de pacientes y usuarios que aceptaron los términos.
                </p>
              </div>
              <span className="text-xs font-semibold text-brand bg-brand-soft px-2.5 py-1 rounded-full whitespace-nowrap">
                {aceptaciones.length} {aceptaciones.length === 1 ? 'firma' : 'firmas'}
              </span>
            </div>

            <Toolbar>
              <SearchInput
                placeholder="Buscar persona o correo…"
                value={busquedaAceptaciones}
                onChange={e => {
                  setBusquedaAceptaciones(e.target.value)
                  setPaginaAceptaciones(1)
                }}
                onClear={() => {
                  setBusquedaAceptaciones('')
                  setPaginaAceptaciones(1)
                }}
                className="w-full sm:min-w-44 sm:flex-1"
              />

              {opcionesVersionesAceptacion.length > 2 && (
                <AnimatedSelect
                  label="Versión"
                  value={filtroVersionAceptacion}
                  onChange={val => {
                    setFiltroVersionAceptacion(val)
                    setPaginaAceptaciones(1)
                  }}
                  options={opcionesVersionesAceptacion}
                  className="w-full sm:w-36"
                />
              )}
            </Toolbar>

            <Table
              columns={COLUMNS_ACEPTACIONES}
              sortColumn={sortColAcep}
              sortDirection={sortDirAcep}
              onSort={handleSortAcep}
            >
              {cargandoAceptaciones ? (
                <TableSkeletonRows rows={POR_PAGINA_ACEPTACIONES} cols={COLUMNS_ACEPTACIONES.length} />
              ) : (
                <>
                  <TableState
                    colSpan={COLUMNS_ACEPTACIONES.length}
                    error={errorAceptaciones}
                    empty={!errorAceptaciones && aceptacionesFiltradas.length === 0}
                    emptyLabel="No hay aceptaciones de términos registradas."
                  />

                  {aceptacionesVisibles.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-bold text-ink">{item.nombreCompleto}</div>
                        <div className="text-xs text-muted truncate max-w-[170px]" title={item.correo}>
                          {item.correo}
                        </div>
                      </td>

                      <td className="text-center whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold bg-alt text-ink-soft px-2 py-0.5 rounded border border-line">
                          {item.versionTerminos}
                        </span>
                      </td>

                      <td className="text-xs text-muted whitespace-nowrap">
                        {formatoFecha(item.aceptadoEn)}
                      </td>

                      <td className="text-xs font-mono text-ink-soft whitespace-nowrap">
                        {item.ip || '—'}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </Table>

            {aceptacionesFiltradas.length > 0 && (
              <TableFoot
                summary={`Mostrando ${inicioAcep + 1}–${Math.min(inicioAcep + POR_PAGINA_ACEPTACIONES, aceptacionesFiltradas.length)} de ${aceptacionesFiltradas.length} aceptaciones`}
              >
                <Pagination page={pagActAcep} totalPages={totalPagsAcep} onChange={setPaginaAceptaciones} />
              </TableFoot>
            )}
          </Card>
        </div>
      </div>

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
