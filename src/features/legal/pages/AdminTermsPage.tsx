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
import { legalApi, type TerminosCondicionesItem } from '../api/legalApi'
import { scrollToTopOrElement } from '@/shared/lib/scroll'

const COLUMNS: Column[] = [
  { key: 'version', label: 'Versión', sortable: true },
  { key: 'titulo', label: 'Título / Documento', sortable: true },
  { key: 'claveS3', label: 'Clave S3', sortable: true },
  { key: 'tamanoBytes', label: 'Tamaño', sortable: true },
  { key: 'fechaCreacion', label: 'Fecha de Registro', sortable: true },
  { key: 'activo', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

const POR_PAGINA = 10

type FiltroEstado = '' | 'activas' | 'inactivas'

export function AdminTermsPage() {
  const { accessToken } = useAuth()
  const [versiones, setVersiones] = useState<TerminosCondicionesItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('')
  const [pagina, setPagina] = useState(1)

  // Expandable form state
  const [mostrarForm, setMostrarForm] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [version, setVersion] = useState('')
  const [activarInmediato, setActivarInmediato] = useState(true)

  // Dialog states
  const [itemToggle, setItemToggle] = useState<TerminosCondicionesItem | null>(null)
  const [itemEliminar, setItemEliminar] = useState<TerminosCondicionesItem | null>(null)
  const [procesando, setProcesando] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const cargarVersiones = async () => {
    if (!accessToken) {
      setCargando(false)
      setError('No se encontró una sesión activa.')
      return
    }

    try {
      setCargando(true)
      setError('')
      const data = await legalApi.listarVersiones(accessToken)
      setVersiones(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las versiones de términos.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarVersiones()
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
    setArchivoSeleccionado(null)
    setTitulo('')
    setVersion(`v${versiones.length + 1}.0`)
    setActivarInmediato(true)
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const cerrarForm = () => {
    if (subiendo) return
    setMostrarForm(false)
    setArchivoSeleccionado(null)
    setTitulo('')
    setVersion('')
  }

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setAviso({ tipo: 'error', texto: 'Solo se permiten archivos en formato PDF.' })
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
    if (!archivoSeleccionado || !accessToken) {
      setAviso({ tipo: 'error', texto: 'Selecciona un archivo PDF válido.' })
      return
    }

    const versionLimpia = version.trim() || `v${versiones.length + 1}.0`
    const tituloLimpio = titulo.trim() || `Términos y Condiciones ${versionLimpia}`

    try {
      setSubiendo(true)
      const res = await legalApi.subirVersion(
        archivoSeleccionado,
        tituloLimpio,
        versionLimpia,
        activarInmediato,
        accessToken,
      )

      setAviso({
        tipo: 'success',
        texto: `Versión ${res.version} subida y almacenada en S3 exitosamente.`,
      })

      cerrarForm()
      cargarVersiones()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir la versión a S3.'
      setAviso({ tipo: 'error', texto: msg })
    } finally {
      setSubiendo(false)
    }
  }

  const confirmarToggleEstado = async () => {
    if (!itemToggle || !accessToken) return
    const nuevoEstado = !itemToggle.activo

    try {
      setProcesando(true)
      await legalApi.cambiarEstado(itemToggle.id, nuevoEstado, accessToken)
      setAviso({
        tipo: 'success',
        texto: nuevoEstado
          ? `Versión ${itemToggle.version} activada como la oficial para los pacientes.`
          : `Versión ${itemToggle.version} desactivada.`,
      })
      setItemToggle(null)
      cargarVersiones()
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo actualizar el estado de la versión.',
      })
      setItemToggle(null)
    } finally {
      setProcesando(false)
    }
  }

  const confirmarEliminarVersion = async () => {
    if (!itemEliminar || !accessToken) return

    try {
      setProcesando(true)
      await legalApi.eliminarVersion(itemEliminar.id, accessToken)
      setAviso({
        tipo: 'success',
        texto: `Versión ${itemEliminar.version} eliminada de S3 y del sistema.`,
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
      setProcesando(false)
    }
  }

  const formatoTamano = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
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

  // Filtrado
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return versiones.filter(item => {
      if (q) {
        const busqMatch =
          item.version.toLowerCase().includes(q) ||
          item.titulo.toLowerCase().includes(q) ||
          item.claveS3.toLowerCase().includes(q) ||
          item.nombreArchivo.toLowerCase().includes(q)
        if (!busqMatch) return false
      }
      if (filtroEstado === 'activas' && !item.activo) return false
      if (filtroEstado === 'inactivas' && item.activo) return false
      return true
    })
  }, [versiones, busqueda, filtroEstado])

  // Ordenamiento con useTableSort
  const { sortColumn, sortDirection, handleSort, sortedItems } = useTableSort(filtrados, {
    initialColumn: 'version',
    initialDirection: 'desc',
  })

  // Paginación
  const totalPaginas = Math.max(1, Math.ceil(sortedItems.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const visibles = sortedItems.slice(inicio, inicio + POR_PAGINA)

  return (
    <>
      <PageHead
        title="Legales (S3)"
        description="Gestiona y versiona los documentos oficiales de Términos y Condiciones en S3 / Cloudflare R2."
        actions={
          <Button icon="plus" onClick={abrirNuevo} disabled={subiendo || procesando}>
            Subir versión
          </Button>
        }
      />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* FORMULARIO EXPANDIBLE (PATRÓN ESTÁNDAR DEL PROYECTO) */}
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
                  <h2 className="text-lg font-bold text-ink">Subir nueva versión de términos</h2>
                  <p className="mt-1 text-sm text-muted">
                    Carga el archivo PDF directamente a tu almacenamiento en S3 y defínelo como oficial.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar formulario"
                  onClick={cerrarForm}
                  disabled={subiendo}
                  className="rounded-lg p-2 text-muted transition hover:bg-alt"
                >
                  <Icon name="x" size={20} />
                </button>
              </div>

              <form onSubmit={handleGuardar} className="grid gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Documento PDF <span className="text-danger">*</span>
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
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line hover:border-brand/50 hover:bg-brand-soft/20 cursor-pointer p-5 transition-colors text-center"
                  >
                    <Icon name="file" size={28} className="text-brand" />
                    {archivoSeleccionado ? (
                      <div>
                        <span className="text-sm font-bold text-ink block">{archivoSeleccionado.name}</span>
                        <span className="text-xs text-brand font-medium">{formatoTamano(archivoSeleccionado.size)}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-brand hover:underline block">
                          Haz clic aquí para seleccionar el archivo PDF
                        </span>
                        <span className="text-[11px] text-muted">Tamaño máximo permitido: 10 MB</span>
                      </div>
                    )}
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Código de versión *">
                    <Input
                      icon="lock"
                      required
                      placeholder="Ej. v1.1 o v2.0"
                      value={version}
                      onChange={e => setVersion(e.target.value)}
                      disabled={subiendo}
                    />
                  </Field>

                  <Field label="Título descriptivo">
                    <Input
                      icon="file"
                      placeholder="Ej. Términos y Condiciones 2026"
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      disabled={subiendo}
                    />
                  </Field>
                </div>

                <div className="rounded-xl border border-line bg-alt/40 p-3.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={activarInmediato}
                      onChange={e => setActivarInmediato(e.target.checked)}
                      disabled={subiendo}
                    />
                    <div className="text-xs">
                      <span className="font-bold text-ink block">Activar inmediatamente</span>
                      <span className="text-muted">
                        Esta versión se convertirá en la oficial para los pacientes durante el registro.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
                  <Button variant="ghost" onClick={cerrarForm} disabled={subiendo}>
                    Cancelar
                  </Button>

                  <Button type="submit" disabled={subiendo || !archivoSeleccionado}>
                    {subiendo ? 'Subiendo a S3…' : 'Subir y guardar en S3'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLA PRINCIPAL (PATRÓN ESTÁNDAR DEL PROYECTO) */}
      <Card>
        <Toolbar>
          <SearchInput
            placeholder="Buscar por versión, título o clave S3…"
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
            label="Estado"
            value={filtroEstado}
            onChange={val => {
              setFiltroEstado(val as FiltroEstado)
              setPagina(1)
            }}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'activas', label: 'Activas' },
              { value: 'inactivas', label: 'Inactivas' },
            ]}
            className="w-full sm:w-44"
          />
        </Toolbar>

        <Table
          columns={COLUMNS}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        >
          {cargando ? (
            <TableSkeletonRows rows={POR_PAGINA} cols={COLUMNS.length} />
          ) : (
            <>
              <TableState
                colSpan={COLUMNS.length}
                error={error && !mostrarForm ? error : null}
                empty={!error && filtrados.length === 0}
                emptyLabel="No hay versiones de términos registradas en el sistema."
              />

              {visibles.map(item => (
                <tr key={item.id}>
                  <td>
                    <span className="font-mono font-bold text-xs bg-brand-soft text-brand px-2 py-0.5 rounded">
                      {item.version}
                    </span>
                  </td>

                  <td>
                    <div className="font-bold text-ink">{item.titulo}</div>
                    <div className="text-xs text-muted">{item.nombreArchivo}</div>
                  </td>

                  <td>
                    <code className="text-xs text-ink-soft bg-alt px-2 py-0.5 rounded border border-line max-w-[220px] truncate block font-mono">
                      {item.claveS3}
                    </code>
                  </td>

                  <td className="text-xs text-ink-soft whitespace-nowrap">
                    {formatoTamano(item.tamanoBytes)}
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
                          label: 'Ver documento PDF',
                          icon: 'externalLink',
                          onClick: () => window.open(legalApi.getUrlDescarga(item.id), '_blank'),
                        },
                        {
                          label: item.activo ? 'Desactivar versión' : 'Activar como oficial',
                          icon: item.activo ? 'xCircle' : 'checkCircle',
                          onClick: () => setItemToggle(item),
                          variant: item.activo ? 'danger' : 'success',
                        },
                        {
                          label: 'Eliminar de S3',
                          icon: 'trash',
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

        {filtrados.length > 0 && (
          <TableFoot
            summary={`Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAGINA, filtrados.length)} de ${filtrados.length} versiones`}
          >
            <Pagination page={paginaActual} totalPages={totalPaginas} onChange={setPagina} />
          </TableFoot>
        )}
      </Card>

      {/* DIÁLOGOS DE CONFIRMACIÓN */}
      <ConfirmDialog
        open={itemToggle !== null}
        title={itemToggle?.activo ? '¿Desactivar versión?' : '¿Activar versión como oficial?'}
        description={
          itemToggle
            ? itemToggle.activo
              ? `La versión ${itemToggle.version} dejará de ser la oficial para los pacientes.`
              : `La versión ${itemToggle.version} (${itemToggle.nombreArchivo}) será la que acepten los pacientes al registrarse.`
            : ''
        }
        confirmLabel={procesando ? 'Procesando…' : itemToggle?.activo ? 'Desactivar' : 'Activar'}
        cancelLabel="Cancelar"
        onConfirm={confirmarToggleEstado}
        onCancel={() => setItemToggle(null)}
      />

      <ConfirmDialog
        open={itemEliminar !== null}
        title="¿Eliminar versión de términos?"
        description={
          itemEliminar
            ? `¿Estás seguro de eliminar la versión ${itemEliminar.version} (${itemEliminar.nombreArchivo}) de S3 y de la base de datos?`
            : ''
        }
        confirmLabel={procesando ? 'Eliminando…' : 'Sí, eliminar de S3'}
        cancelLabel="Cancelar"
        onConfirm={confirmarEliminarVersion}
        onCancel={() => setItemEliminar(null)}
      />
    </>
  )
}
