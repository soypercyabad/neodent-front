import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ActionsCell, AnimatedSelect, Badge, Button, Card, ConfirmDialog,
  Icon, Input, PageHead, Pagination, RowActions, SearchInput,
  Table, TableFoot, TableState, Toast, Toolbar, useTableSort,
  type Column, type IconName,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { scrollToTopOrElement } from '@/shared/lib/scroll'
import { ApiError } from '@/shared/api/apiClient'
import { cn } from '@/shared/lib/cn'
import { modulosApi, type ModuloItem, type ModuloInput } from '../api/modulosApi'

interface IconOption {
  value: IconName
  label: string
  tags: string
}

const ICON_CATALOG: IconOption[] = [
  { value: 'calendar', label: 'Calendario', tags: 'dashboard agenda tiempo citas' },
  { value: 'calendarEdit', label: 'Editar Agenda', tags: 'agenda programar' },
  { value: 'citas', label: 'Citas', tags: 'citas atencion pacientes' },
  { value: 'pacientes', label: 'Pacientes', tags: 'personas clientes directorio' },
  { value: 'user', label: 'Personal / Usuario', tags: 'empleados usuario perfil' },
  { value: 'usuarios', label: 'Grupo Usuarios', tags: 'equipo personal lista' },
  { value: 'clock', label: 'Horarios / Reloj', tags: 'turnos horas agenda' },
  { value: 'lock', label: 'Roles / Candado', tags: 'candado permisos acceso' },
  { value: 'shield', label: 'Escudo / Permisos', tags: 'seguridad auditoria permisos' },
  { value: 'settings', label: 'Configuración', tags: 'ajustes opciones sistema engranaje' },
  { value: 'menu', label: 'Menú / Módulos', tags: 'navegacion lista modulos' },
  { value: 'location', label: 'Sedes / Ubicación', tags: 'clinica local direccion' },
  { value: 'mapPin', label: 'Punto de Mapa', tags: 'gps sucursal lugar' },
  { value: 'tooth', label: 'Especialidades', tags: 'diente odontologia especialidad' },
  { value: 'toothCracked', label: 'Tratamientos', tags: 'servicios cirugia molar' },
  { value: 'braces', label: 'Ortodoncia', tags: 'brackets estética' },
  { value: 'stethoscope', label: 'Atención Médica', tags: 'salud doctor clinica' },
  { value: 'heart', label: 'Salud / Bienestar', tags: 'favoritos corazon vida' },
  { value: 'briefcase', label: 'Administración', tags: 'gestion maletin oficina trabajo' },
  { value: 'dollarSign', label: 'Finanzas', tags: 'dinero contabilidad caja precio' },
  { value: 'wallet', label: 'Caja / Billetera', tags: 'pagos ingresos egresos' },
  { value: 'creditCard', label: 'Tarjetas / Cobros', tags: 'pagos pos facturacion' },
  { value: 'chartBar', label: 'Reportes / Gráficos', tags: 'estadisticas graficos barras' },
  { value: 'activity', label: 'Actividad', tags: 'rendimiento pulso signos' },
  { value: 'clipboard', label: 'Historias Clínicas', tags: 'registros fichas formularios' },
  { value: 'fileText', label: 'Documentos / Textos', tags: 'archivos contratos informes' },
  { value: 'file', label: 'Archivos / Legales', tags: 'terminos documentos pdf' },
  { value: 'folder', label: 'Carpetas', tags: 'archivos almacenamiento' },
  { value: 'package', label: 'Inventario / Almacén', tags: 'suministros stock paquetes' },
  { value: 'database', label: 'Base de Datos', tags: 'respaldos almacenamiento tablas' },
  { value: 'layers', label: 'Catálogos / Niveles', tags: 'capas categorias' },
  { value: 'printer', label: 'Impresión / Reportes', tags: 'imprimir tickets facturas' },
  { value: 'bell', label: 'Notificaciones', tags: 'alertas avisos campana' },
  { value: 'mail', label: 'Mensajería / Correo', tags: 'email buzon contacto' },
  { value: 'phone', label: 'Teléfono / Contacto', tags: 'llamadas contacto soporte' },
  { value: 'whatsapp', label: 'WhatsApp', tags: 'whatsapp chat mensajes contacto soporte' },
  { value: 'star', label: 'Destacados', tags: 'favoritos estrellas' },
  { value: 'search', label: 'Búsqueda / Consultas', tags: 'lupa buscar filtros' },
  { value: 'home', label: 'Inicio', tags: 'principal home casa dashboard' },
  { value: 'building', label: 'Edificio / Sede', tags: 'empresa clinica local sucursal' },
  { value: 'receipt', label: 'Recibos / Boletas', tags: 'comprobantes facturacion pagos caja' },
  { value: 'percent', label: 'Descuentos / Promociones', tags: 'ofertas porcentajes rebajas' },
  { value: 'truck', label: 'Proveedores / Logística', tags: 'envios pedidos almacen transporte' },
  { value: 'shoppingCart', label: 'Ventas / Carrito', tags: 'compras tienda pagos' },
  { value: 'shoppingBag', label: 'Productos / Bolsa', tags: 'tienda insumos articulos' },
  { value: 'tag', label: 'Etiquetas / Precios', tags: 'categorias ofertas precios' },
  { value: 'award', label: 'Calidad / Certificados', tags: 'premio distincion logros' },
  { value: 'bookmark', label: 'Marcadores / Guardados', tags: 'favoritos guardados notas' },
  { value: 'camera', label: 'Cámara / Rayos X', tags: 'fotos radiografias imagenes' },
  { value: 'image', label: 'Imágenes / Radiografías', tags: 'fotos placas escaneos' },
  { value: 'key', label: 'Credenciales / Claves', tags: 'acceso tokens password login' },
  { value: 'link', label: 'Enlaces / Integraciones', tags: 'conexiones apis url' },
  { value: 'pieChart', label: 'Gráficos Circulares', tags: 'estadisticas torta reportes finanzas' },
  { value: 'shieldCheck', label: 'Seguridad Verificada', tags: 'auditoria cumplimiento proteccion' },
  { value: 'sliders', label: 'Parámetros / Filtros', tags: 'ajustes configuracion controles' },
  { value: 'tool', label: 'Herramientas / Mantenimiento', tags: 'soporte tecnico ajustes taller' },
  { value: 'umbrella', label: 'Seguros Médicos', tags: 'eps poliza proteccion cobertura' },
  { value: 'userCheck', label: 'Asistencia / Validado', tags: 'personal presente verificado' },
  { value: 'userPlus', label: 'Nuevo Usuario', tags: 'registro contratacion alta' },
  { value: 'zap', label: 'Acciones Rápidas', tags: 'automatizacion velocidad rayos' },
  { value: 'cpu', label: 'Sistema / Procesos', tags: 'tecnologia servidor computo' },
  { value: 'archive', label: 'Archivo Histórico', tags: 'expedientes historicos guardado' },
  { value: 'bookOpen', label: 'Guías / Manuales', tags: 'protocolos capacitacion lectura' },
  { value: 'globe', label: 'Portal Web / Global', tags: 'internet web online' },
  { value: 'helpCircle', label: 'Ayuda / Soporte', tags: 'preguntas faq asistencia tickets' },
  { value: 'messageSquare', label: 'Mensajes / Chat', tags: 'conversaciones comentarios sms' },
  { value: 'send', label: 'Envíos / Difusión', tags: 'mensajeria campañas recordatorios' },
  { value: 'flag', label: 'Metas / Objetivos', tags: 'hitos prioridades banderas' },
  { value: 'target', label: 'Objetivos / KPIs', tags: 'metas rendimiento diana' },
  { value: 'thermometer', label: 'Triaje / Signos', tags: 'temperatura salud clinica' },
  { value: 'pill', label: 'Medicamentos / Farmacia', tags: 'recetas pastillas farmacos' },
  { value: 'syringe', label: 'Inyectables / Anestesia', tags: 'vacunas jeringa procedimiento' },
  { value: 'lockOpen', label: 'Desbloqueado', tags: 'permisos abiertos libre' },
  { value: 'filter', label: 'Filtros Avanzados', tags: 'busqueda embudo criterios' },
  { value: 'download', label: 'Descargas / Exportación', tags: 'excel pdf reportes' },
  { value: 'upload', label: 'Importación / Subidas', tags: 'carga archivos importar' },
  { value: 'share', label: 'Derivaciones / Compartir', tags: 'referencias interconsultas' },
]

const COLUMNS: Column[] = [
  { key: 'orden', label: 'Orden', align: 'center', sortable: true },
  { label: 'Ícono', align: 'center' },
  { key: 'nombre', label: 'Nombre', sortable: true },
  { key: 'ruta', label: 'Ruta (URL)', sortable: true },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'activo', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

const POR_PAGINA = 10

type Aviso = { tipo: 'success' | 'error'; texto: string }

function normalizarCodigo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function ModulosPage() {
  const { accessToken, recargarPerfil } = useAuth()
  const [modulos, setModulos] = useState<ModuloItem[]>([])
  const [query, setQuery] = useState('')
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [editando, setEditando] = useState<ModuloItem | null>(null)
  const [confirmar, setConfirmar] = useState<ModuloItem | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Selector de ícono
  const [mostrarIconPicker, setMostrarIconPicker] = useState(false)
  const [busquedaIcono, setBusquedaIcono] = useState('')

  // Campos del formulario
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [rutaSlug, setRutaSlug] = useState('')
  const [icono, setIcono] = useState<IconName>('file')
  const [orden, setOrden] = useState<number>(1)
  const [actualizacion, setActualizacion] = useState(0)

  useEffect(() => {
    if (!accessToken) return

    let activo = true
    setLoading(true)
    setError('')

    modulosApi.listar(accessToken)
      .then(data => {
        if (activo) setModulos(data)
      })
      .catch(e => {
        if (activo) setError(
          e instanceof Error ? e.message : 'No se pudieron cargar los módulos.',
        )
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, actualizacion])

  useEffect(() => {
    if (!aviso) return

    const timer = window.setTimeout(
      () => setAviso(null),
      aviso.tipo === 'error' ? 7000 : 4000,
    )

    return () => window.clearTimeout(timer)
  }, [aviso])

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()

    return modulos.filter(m => {
      if (q && !`${m.codigo} ${m.nombre} ${m.ruta} ${m.descripcion ?? ''}`.toLowerCase().includes(q)) {
        return false
      }
      if (estado === 'ACTIVO' && !m.activo) return false
      if (estado === 'INACTIVO' && m.activo) return false
      return true
    })
  }, [modulos, query, estado])

  const { sortColumn, sortDirection, handleSort, sortedItems } = useTableSort(filtrados, {
    initialColumn: 'orden',
    initialDirection: 'asc',
  })

  const totalPaginas = Math.max(1, Math.ceil(sortedItems.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const visibles = useMemo(() => sortedItems.slice(inicio, inicio + POR_PAGINA), [sortedItems, inicio])

  const iconosFiltrados = useMemo(() => {
    const b = busquedaIcono.trim().toLowerCase()
    if (!b) return ICON_CATALOG
    return ICON_CATALOG.filter(
      i => i.label.toLowerCase().includes(b) || i.value.toLowerCase().includes(b) || i.tags.toLowerCase().includes(b),
    )
  }, [busquedaIcono])

  const codigoCalculado = useMemo(() => normalizarCodigo(nombre), [nombre])

  const handleNombreChange = (val: string) => {
    setNombre(val)
    if (!editando) {
      if (!rutaSlug || rutaSlug === normalizarSlug(nombre)) {
        setRutaSlug(normalizarSlug(val))
      }
    }
  }

  const abrirNuevo = () => {
    setEditando(null)
    setNombre('')
    setDescripcion('')
    setRutaSlug('')
    setIcono('file')
    const maxOrden = modulos.reduce((max, m) => Math.max(max, m.orden), 0)
    setOrden(maxOrden + 1)
    setError('')
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const abrirEditar = (mod: ModuloItem) => {
    setEditando(mod)
    setNombre(mod.nombre)
    setDescripcion(mod.descripcion ?? '')
    setRutaSlug(mod.ruta.replace(/^\/+/, ''))
    setIcono((mod.icono as IconName) || 'file')
    setOrden(mod.orden)
    setError('')
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()

    if (!accessToken || guardandoRef.current) return

    const codFinal = editando ? editando.codigo : codigoCalculado
    const slugLimpio = rutaSlug.replace(/^\/+/, '').trim()

    if (!codFinal) {
      setError('El nombre ingresado debe generar un código de módulo válido.')
      return
    }

    if (!nombre.trim()) {
      setError('El nombre visible del módulo es obligatorio.')
      return
    }

    if (!slugLimpio) {
      setError('La ruta de navegación es obligatoria.')
      return
    }

    if (!orden || orden < 1) {
      setError('El orden en la barra lateral debe ser un número mayor o igual a 1.')
      return
    }

    const payload: ModuloInput = {
      codigo: codFinal,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      ruta: `/${slugLimpio}`,
      icono,
      orden,
    }

    guardandoRef.current = true
    setGuardando(true)
    setError('')

    try {
      if (editando) {
        await modulosApi.actualizar(accessToken, editando.id, payload)
      } else {
        await modulosApi.crear(accessToken, payload)
      }

      await recargarPerfil()

      setMostrarForm(false)
      setAviso({
        tipo: 'success',
        texto: editando
          ? 'Módulo actualizado correctamente.'
          : 'Módulo registrado exitosamente.',
      })
      setActualizacion(n => n + 1)
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'No se pudo guardar el módulo.',
      )
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  const cambiarEstado = async () => {
    if (!accessToken || !confirmar) return

    const activar = !confirmar.activo

    try {
      if (activar) {
        await modulosApi.activar(accessToken, confirmar.id)
      } else {
        await modulosApi.desactivar(accessToken, confirmar.id)
      }

      await recargarPerfil()

      setAviso({
        tipo: 'success',
        texto: activar
          ? 'Módulo activado correctamente.'
          : 'Módulo desactivado correctamente.',
      })

      setConfirmar(null)
      setActualizacion(n => n + 1)
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error
          ? e.message
          : 'No se pudo cambiar el estado del módulo.',
      })

      setConfirmar(null)
    }
  }

  return (
    <>
      <PageHead
        title="Módulos y Permisos"
        description="Administra los módulos del sistema, sus rutas de navegación y su disponibilidad en roles."
        actions={
          <Button icon="plus" onClick={abrirNuevo}>
            Nuevo módulo
          </Button>
        }
      />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <Card className="p-5">
              <form onSubmit={guardar} className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="text-base font-bold text-ink">
                    {editando ? 'Editar módulo' : 'Registrar nuevo módulo'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMostrarForm(false)}
                    className="text-muted hover:text-ink text-sm font-semibold"
                  >
                    ✕ Cerrar
                  </button>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs font-semibold text-red-600">
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-[0.92rem] font-bold text-ink">
                      Nombre visible *
                    </label>
                    <Input
                      icon="file"
                      value={nombre}
                      onChange={e => handleNombreChange(e.target.value)}
                      placeholder="Ej: Contabilidad General"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[0.92rem] font-bold text-ink">
                      Ruta en frontend (URL) *
                    </label>
                    <div className="flex h-[42px] items-center rounded-control border border-line bg-surface overflow-hidden focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition">
                      <span className="flex h-full items-center justify-center bg-surface-muted px-3.5 text-sm font-bold text-muted border-r border-line select-none">
                        /
                      </span>
                      <input
                        type="text"
                        value={rutaSlug}
                        onChange={e => setRutaSlug(e.target.value.replace(/^\/+/, '').toLowerCase().replace(/\s+/g, '-'))}
                        placeholder="contabilidad"
                        required
                        className="h-full w-full bg-transparent px-3 text-sm text-ink placeholder:text-muted focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[0.92rem] font-bold text-ink">
                      Ícono visual *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setBusquedaIcono('')
                        setMostrarIconPicker(true)
                      }}
                      className="flex h-[42px] w-full items-center justify-between rounded-control border border-line bg-surface px-3.5 text-sm text-ink hover:border-brand/50 hover:bg-alt transition select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon name={icono} className="size-4.5 text-brand shrink-0" />
                        <span className="truncate text-sm font-medium text-ink">
                          {ICON_CATALOG.find(i => i.value === icono)?.label ?? icono}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-brand bg-brand-soft px-2 py-0.5 rounded shrink-0">
                        Cambiar
                      </span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-[0.92rem] font-bold text-ink">
                      Orden en barra lateral *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={orden}
                      onChange={e => setOrden(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-[0.92rem] font-bold text-ink">
                      Descripción breve
                    </label>
                    <Input
                      icon="fileText"
                      value={descripcion}
                      onChange={e => setDescripcion(e.target.value)}
                      placeholder="Descripción o propósito del módulo"
                      maxLength={150}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setMostrarForm(false)}
                    disabled={guardando}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={guardando}>
                    {guardando
                      ? 'Guardando…'
                      : editando
                        ? 'Actualizar módulo'
                        : 'Guardar módulo'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <Toolbar>
          <SearchInput
            placeholder="Buscar módulo por nombre, ruta o descripción…"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setPagina(1)
            }}
            className="w-full sm:max-w-xs"
          />

          <AnimatedSelect
            label="Estado"
            value={estado}
            onChange={val => {
              setEstado(val)
              setPagina(1)
            }}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'ACTIVO', label: 'Activos' },
              { value: 'INACTIVO', label: 'Inactivos' },
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
          {loading ? (
            <tr>
              <td colSpan={COLUMNS.length} className="p-8 text-center text-muted">
                Cargando módulos…
              </td>
            </tr>
          ) : (
            <>
              <TableState
                colSpan={COLUMNS.length}
                error={error && !mostrarForm ? error : null}
                empty={!error && filtrados.length === 0}
                emptyLabel="No hay módulos registrados."
              />

              {visibles.map(m => (
                <tr key={m.id}>
                  <td className="text-center font-bold text-muted">
                    #{m.orden}
                  </td>

                  <td className="text-center">
                    <div className="flex justify-center">
                      <div className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
                        <Icon name={(m.icono as IconName) || 'file'} className="size-4" />
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="font-bold text-ink">{m.nombre}</span>
                  </td>

                  <td>
                    <code className="rounded bg-surface-muted px-2 py-1 text-xs text-ink-soft border border-line">
                      {m.ruta}
                    </code>
                  </td>

                  <td className="max-w-xs truncate text-xs text-muted" title={m.descripcion ?? ''}>
                    {m.descripcion || '-'}
                  </td>

                  <td className="text-center">
                    <div className="flex justify-center">
                      <Badge tone={m.activo ? 'green' : 'gray'}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </td>

                  <ActionsCell align="center">
                    <RowActions
                      actions={[
                        {
                          label: 'Editar módulo',
                          icon: 'edit',
                          onClick: () => abrirEditar(m),
                        },
                        {
                          label: m.activo ? 'Desactivar módulo' : 'Activar módulo',
                          icon: m.activo ? 'xCircle' : 'checkCircle',
                          variant: m.activo ? 'danger' : 'success',
                          danger: m.activo,
                          onClick: () => setConfirmar(m),
                        },
                      ]}
                    />
                  </ActionsCell>
                </tr>
              ))}
            </>
          )}
        </Table>

        <TableFoot summary={`Mostrando ${visibles.length} de ${filtrados.length} módulos`}>
          <Pagination
            totalPages={totalPaginas}
            page={paginaActual}
            onChange={setPagina}
          />
        </TableFoot>
      </Card>

      {/* Modal interactivo de selección de iconos */}
      <AnimatePresence>
        {mostrarIconPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-2xl border border-line flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h4 className="text-base font-bold text-ink">Catálogo de íconos</h4>
                <button
                  type="button"
                  onClick={() => setMostrarIconPicker(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-ink text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="pt-3 pb-2">
                <SearchInput
                  placeholder="Buscar por nombre o palabra clave (ej: salud, finanzas, citas)…"
                  value={busquedaIcono}
                  onChange={e => setBusquedaIcono(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-6 sm:grid-cols-7 md:grid-cols-9 gap-2.5 py-3">
                {iconosFiltrados.map(opt => {
                  const isSelected = icono === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      onClick={() => {
                        setIcono(opt.value)
                        setMostrarIconPicker(false)
                      }}
                      className={cn(
                        'grid size-12 place-items-center rounded-xl border transition cursor-pointer select-none',
                        isSelected
                          ? 'border-brand bg-brand text-white shadow-xs ring-2 ring-brand/30'
                          : 'border-line bg-surface text-ink-soft hover:border-brand/40 hover:bg-alt hover:text-brand'
                      )}
                    >
                      <Icon name={opt.value} className="size-5" />
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-end pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMostrarIconPicker(false)}
                >
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(confirmar)}
        onCancel={() => setConfirmar(null)}
        onConfirm={cambiarEstado}
        title={confirmar?.activo ? 'Desactivar módulo' : 'Activar módulo'}
        description={
          confirmar?.activo
            ? `¿Estás seguro de desactivar el módulo "${confirmar.nombre}"? Los usuarios no podrán acceder a esta sección mientras esté inactivo.`
            : `¿Deseas activar el módulo "${confirmar?.nombre}"? Volverá a estar disponible para los roles que lo tengan asignado.`
        }
        confirmLabel={confirmar?.activo ? 'Desactivar' : 'Activar'}
      />
    </>
  )
}
