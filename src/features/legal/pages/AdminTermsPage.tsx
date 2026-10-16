import { useEffect, useState, useRef, type FormEvent } from 'react'
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
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/model/useAuth'
import {
  legalApi,
  type TerminosCondicionesItem,
  type AceptacionTerminosItem,
  type DocumentoLegalTipo,
} from '../api/legalApi'
import { scrollToTopOrElement } from '@/shared/lib/scroll'

type TabType = 'tipos' | 'versiones' | 'aceptaciones'

const TABS: readonly TabItem<TabType>[] = [
  { value: 'tipos', label: 'Tipos de Documentos' },
  { value: 'versiones', label: 'Gestión de Versiones' },
  { value: 'aceptaciones', label: 'Auditoría de Aceptaciones' },
] as const

const COLUMNS_TIPOS: Column[] = [
  { key: 'codigo', label: 'Código', align: 'left', sortable: true },
  { key: 'descripcion', label: 'Descripción / Nombre Oficial', align: 'left', sortable: true },
  { key: 'grupo', label: 'Grupo', align: 'center', sortable: true },
  { key: 'activo', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

const COLUMNS_VERSIONES: Column[] = [
  { key: 'tipo', label: 'Tipo de Documento', align: 'left', sortable: true },
  { key: 'version', label: 'Versión', align: 'center', sortable: true },
  { key: 'archivo', label: 'Archivo PDF', align: 'left' },
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
  const [tabActual, setTabActual] = useState<TabType>('tipos')

  // Toast aviso
  const [aviso, setAviso] = useState<ToastAviso | null>(null)

  /* =========================================================
   * 1. ESTADOS PARA TIPOS DE DOCUMENTOS LEGALES (CATÁLOGO)
   * ========================================================= */
  const [tipos, setTipos] = useState<DocumentoLegalTipo[]>([])
  const [cargandoTipos, setCargandoTipos] = useState(true)
  const [errorTipos, setErrorTipos] = useState('')
  const [busquedaTipos, setBusquedaTipos] = useState('')

  // Formulario de tipos (Crear / Editar)
  const [mostrarFormTipo, setMostrarFormTipo] = useState(false)
  const [editandoTipo, setEditandoTipo] = useState<DocumentoLegalTipo | null>(null)
  const [tipoCodigo, setTipoCodigo] = useState('')
  const [tipoDescripcion, setTipoDescripcion] = useState('')
  const [tipoGrupo, setTipoGrupo] = useState('1')
  const [tipoActivo, setTipoActivo] = useState(true)
  const [guardandoTipo, setGuardandoTipo] = useState(false)
  const [tipoCambiarEstado, setTipoCambiarEstado] = useState<DocumentoLegalTipo | null>(null)

  /* =========================================================
   * 2. ESTADOS PARA VERSIONES DE DOCUMENTOS
   * ========================================================= */
  const [versiones, setVersiones] = useState<TerminosCondicionesItem[]>([])
  const [cargandoVersiones, setCargandoVersiones] = useState(true)
  const [errorVersiones, setErrorVersiones] = useState('')
  const [busquedaVersiones, setBusquedaVersiones] = useState('')
  const [busquedaDebouncedVersiones, setBusquedaDebouncedVersiones] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('')
  const [filtroTipoCodigo, setFiltroTipoCodigo] = useState<string>('')
  const [paginaVersiones, setPaginaVersiones] = useState(1)
  const [totalElementosVersiones, setTotalElementosVersiones] = useState(0)
  const [totalPaginasVersiones, setTotalPaginasVersiones] = useState(1)

  // Formulario expandible de versión (Subir / Editar)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoItem, setEditandoItem] = useState<TerminosCondicionesItem | null>(null)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [titulo, setTitulo] = useState('')
  const [version, setVersion] = useState('')
  const [activarInmediato, setActivarInmediato] = useState(true)

  // Metadatos de plantilla dinámica
  const [idTipoSeleccionado, setIdTipoSeleccionado] = useState<number | undefined>(undefined)
  const [textoPlantilla, setTextoPlantilla] = useState('Acepto los {0} de NeoDent.')
  const [linkTexto, setLinkTexto] = useState('Términos y condiciones')
  const [textoAgrupado, setTextoAgrupado] = useState('los {0} de NeoDent')

  // Confirm dialogs para versión
  const [itemActivar, setItemActivar] = useState<TerminosCondicionesItem | null>(null)
  const [itemEliminar, setItemEliminar] = useState<TerminosCondicionesItem | null>(null)
  const [procesandoAccion, setProcesandoAccion] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /* =========================================================
   * 3. ESTADOS PARA AUDITORÍA DE ACEPTACIONES
   * ========================================================= */
  const [aceptaciones, setAceptaciones] = useState<AceptacionTerminosItem[]>([])
  const [cargandoAceptaciones, setCargandoAceptaciones] = useState(true)
  const [errorAceptaciones, setErrorAceptaciones] = useState('')
  const [busquedaAceptaciones, setBusquedaAceptaciones] = useState('')
  const [busquedaDebouncedAceptaciones, setBusquedaDebouncedAceptaciones] = useState('')
  const [paginaAceptaciones, setPaginaAceptaciones] = useState(1)
  const [totalElementosAceptaciones, setTotalElementosAceptaciones] = useState(0)
  const [totalPaginasAceptaciones, setTotalPaginasAceptaciones] = useState(1)

  // Cargar catálogo de tipos
  const cargarTipos = async () => {
    if (!accessToken) return
    try {
      setCargandoTipos(true)
      setErrorTipos('')
      const res = await legalApi.listarTodosLosTipos(accessToken)
      setTipos(res)
      if (res.length > 0 && !idTipoSeleccionado) {
        setIdTipoSeleccionado(res[0].id)
      }
    } catch (e) {
      setErrorTipos(e instanceof Error ? e.message : 'No se pudieron cargar los tipos de documentos.')
    } finally {
      setCargandoTipos(false)
    }
  }

  useEffect(() => {
    cargarTipos()
  }, [accessToken])

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

  // CARGAR ACEPTACIONES PAGINADAS
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

  useEffect(() => {
    if (tabActual === 'tipos') {
      cargarTipos()
    } else if (tabActual === 'versiones') {
      cargarVersiones()
    } else if (tabActual === 'aceptaciones') {
      cargarAceptaciones()
    }
  }, [accessToken, tabActual, busquedaDebouncedVersiones, filtroEstado, paginaVersiones, busquedaDebouncedAceptaciones, paginaAceptaciones])

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(
      () => setAviso(null),
      aviso.tipo === 'error' ? 7000 : 4000,
    )
    return () => window.clearTimeout(timer)
  }, [aviso])

  /* =========================================================
   * ACCIONES PARA TIPOS DE DOCUMENTO (CATÁLOGO)
   * ========================================================= */
  const abrirNuevoTipo = () => {
    setEditandoTipo(null)
    setTipoCodigo('')
    setTipoDescripcion('')
    setTipoGrupo('1')
    setTipoActivo(true)
    setMostrarFormTipo(true)
    scrollToTopOrElement()
  }

  const abrirEditarTipo = (t: DocumentoLegalTipo) => {
    setEditandoTipo(t)
    setTipoCodigo(t.codigo)
    setTipoDescripcion(t.descripcion)
    setTipoGrupo(String(t.grupo ?? 1))
    setTipoActivo(t.activo)
    setMostrarFormTipo(true)
    scrollToTopOrElement()
  }

  const cerrarFormTipo = () => {
    setMostrarFormTipo(false)
    setEditandoTipo(null)
    setTipoCodigo('')
    setTipoDescripcion('')
    setTipoGrupo('1')
  }

  const handleGuardarTipo = async (e: FormEvent) => {
    e.preventDefault()
    if (!accessToken || guardandoTipo) return

    const cod = tipoCodigo.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    const desc = tipoDescripcion.trim()
    const grp = parseInt(tipoGrupo, 10) || 1

    if (!editandoTipo && !cod) {
      setAviso({ tipo: 'error', texto: 'El código del documento legal es obligatorio.' })
      return
    }
    if (!desc) {
      setAviso({ tipo: 'error', texto: 'La descripción del tipo de documento es obligatoria.' })
      return
    }

    try {
      setGuardandoTipo(true)
      if (editandoTipo) {
        await legalApi.editarTipo(accessToken, editandoTipo.id, {
          descripcion: desc,
          grupo: grp,
          activo: tipoActivo,
        })
        setAviso({ tipo: 'success', texto: `Tipo de documento ${desc} actualizado exitosamente.` })
      } else {
        await legalApi.crearTipo(accessToken, {
          codigo: cod,
          descripcion: desc,
          grupo: grp,
          activo: tipoActivo,
        })
        setAviso({ tipo: 'success', texto: `Tipo de documento ${cod} creado exitosamente.` })
      }
      cerrarFormTipo()
      await cargarTipos()
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo guardar el tipo de documento.' })
    } finally {
      setGuardandoTipo(false)
    }
  }

  const confirmarToggleEstadoTipo = async () => {
    if (!tipoCambiarEstado || !accessToken) return
    try {
      setProcesandoAccion(true)
      await legalApi.cambiarEstadoTipo(accessToken, tipoCambiarEstado.id, !tipoCambiarEstado.activo)
      setAviso({
        tipo: 'success',
        texto: `El tipo ${tipoCambiarEstado.codigo} ahora está ${!tipoCambiarEstado.activo ? 'Activo' : 'Inactivo'}.`,
      })
      setTipoCambiarEstado(null)
      await cargarTipos()
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo actualizar el estado.' })
      setTipoCambiarEstado(null)
    } finally {
      setProcesandoAccion(false)
    }
  }

  /* =========================================================
   * ACCIONES PARA VERSIONES DE DOCUMENTO
   * ========================================================= */
  const seleccionarTipo = (tipo: DocumentoLegalTipo) => {
    setIdTipoSeleccionado(tipo.id)
    setTitulo(tipo.descripcion)
    if (tipo.codigo === 'POLITICA_PRIVACIDAD') {
      setTextoPlantilla('Acepto la {0} y Tratamiento de Datos Personales de NeoDent.')
      setLinkTexto('Política de privacidad')
      setTextoAgrupado('la {0} de NeoDent')
    } else if (tipo.codigo === 'TERMINOS_CONDICIONES') {
      setTextoPlantilla('Acepto los {0} de uso de NeoDent.')
      setLinkTexto('Términos y condiciones')
      setTextoAgrupado('los {0} de NeoDent')
    } else {
      setTextoPlantilla('Acepto el {0} de NeoDent.')
      setLinkTexto(tipo.descripcion)
      setTextoAgrupado('el {0} de NeoDent')
    }
  }

  const abrirNuevo = () => {
    setEditandoItem(null)
    setArchivoSeleccionado(null)
    setVersion(`v${totalElementosVersiones + 1}.0`)
    setActivarInmediato(true)
    setMostrarForm(true)

    if (tipos.length > 0) {
      const defaultTipo = tipos[0]
      seleccionarTipo(defaultTipo)
    } else {
      setTitulo('Términos y Condiciones del Servicio')
      setTextoPlantilla('Acepto los {0} de NeoDent.')
      setLinkTexto('Términos y condiciones')
      setTextoAgrupado('los {0} de NeoDent')
    }

    scrollToTopOrElement()
  }

  const abrirEditar = (item: TerminosCondicionesItem) => {
    setEditandoItem(item)
    setArchivoSeleccionado(null)
    setTitulo(item.titulo)
    setVersion(item.version)
    setTextoPlantilla(item.texto || 'Acepto los {0} de NeoDent.')
    setLinkTexto(item.linkTexto || item.titulo || 'Términos y condiciones')
    setTextoAgrupado(item.textoAgrupado || 'los {0} de NeoDent')
    setActivarInmediato(item.activo)

    const tipoEncontrado = tipos.find(t => t.codigo === item.codigoDocumento || t.descripcion === item.titulo)
    if (tipoEncontrado) {
      setIdTipoSeleccionado(tipoEncontrado.id)
    }

    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const handleVerDocumento = async (item: TerminosCondicionesItem) => {
    try {
      legalApi.abrirDocumento(item.id, item.urlVisualizar, item.nombreArchivo || item.titulo)
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
    setTextoPlantilla('Acepto los {0} de NeoDent.')
    setLinkTexto('Términos y condiciones')
    setTextoAgrupado('los {0} de NeoDent')
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
    const tituloLimpio = titulo.trim() || `Documento Legal ${versionLimpia}`

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
          idTipoSeleccionado,
          textoPlantilla,
          linkTexto,
          textoAgrupado
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
        texto: `La versión ${itemActivar.version} (${itemActivar.titulo}) ahora es la versión Activa. Cualquier otra versión de este tipo ha sido desactivada.`,
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
        texto: 'No se puede eliminar la versión activa. Para eliminarla, primero activa otra versión de este tipo.',
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

  const tiposFiltrados = tipos.filter(t => {
    const q = busquedaTipos.trim().toLowerCase()
    if (!q) return true
    return t.codigo.toLowerCase().includes(q) || t.descripcion.toLowerCase().includes(q)
  })

  const versionesFiltradas = versiones.filter(item => {
    if (!filtroTipoCodigo) return true
    return item.codigoDocumento === filtroTipoCodigo
  })

  const inicioVer = (paginaVersiones - 1) * POR_PAGINA
  const inicioAcep = (paginaAceptaciones - 1) * POR_PAGINA

  const tipoActual = tipos.find(t => t.id === idTipoSeleccionado)

  return (
    <>
      <PageHead
        title="Documentos legales"
        description="Administra los tipos de documentos y contratos, sus versiones activas y consulta el registro de aceptación de los usuarios."
        actions={
          tabActual === 'tipos' ? (
            <Button icon="plus" onClick={abrirNuevoTipo} disabled={guardandoTipo || procesandoAccion}>
              Nuevo tipo
            </Button>
          ) : tabActual === 'versiones' ? (
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
          label="Pestañas de documentos y contratos legales"
          onChange={nuevaTab => {
            setTabActual(nuevaTab)
          }}
        />
      </div>

      {/* Notificaciones Toast flotantes */}
      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* =========================================================
       * TAB 1: TIPOS DE DOCUMENTOS LEGALES (CATÁLOGO)
       * ========================================================= */}
      {tabActual === 'tipos' && (
        <>
          {/* FORMULARIO DE TIPO DE DOCUMENTO */}
          <AnimatePresence>
            {mostrarFormTipo && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mb-6 min-w-0 max-w-full"
              >
                <Card className="border border-brand/30 shadow-md overflow-hidden">
                  {/* Encabezado con contraste visual */}
                  <div className="bg-brand-soft/30 border-b border-brand/20 px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Icon name="file" size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-ink">
                          {editandoTipo ? `Editar tipo: ${editandoTipo.codigo}` : 'Registrar nuevo tipo de contrato o documento'}
                        </h2>
                        <p className="text-xs text-muted">
                          Define el identificador y nombre oficial del contrato para versionarlo.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Cerrar formulario"
                      onClick={cerrarFormTipo}
                      disabled={guardandoTipo}
                      className="rounded-lg p-1.5 text-muted hover:bg-surface/80 hover:text-ink transition shrink-0"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  {/* Cuerpo con secciones diferenciadas */}
                  <form onSubmit={handleGuardarTipo} className="p-5 sm:p-6 grid gap-5 min-w-0 max-w-full bg-surface">
                    {/* Panel 1: Parámetros del Catálogo */}
                    <div className="rounded-xl border border-line bg-alt/30 p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">1</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                          Identificación y Agrupación
                        </h3>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 min-w-0 max-w-full">
                        <Field
                          label="Código del tipo de documento *"
                          hint="Identificador único en mayúsculas (ej. TERMINOS_CONDICIONES)."
                        >
                          <Input
                            icon="lock"
                            required
                            placeholder="Ej. CONTRATO_SERVICIO"
                            value={tipoCodigo}
                            onChange={e => setTipoCodigo(e.target.value.toUpperCase())}
                            disabled={Boolean(editandoTipo) || guardandoTipo}
                          />
                        </Field>

                        <Field
                          label="Grupo de consentimiento"
                          hint="Permite agrupar contratos en un mismo paso de aceptación."
                        >
                          <Input
                            type="number"
                            min="1"
                            max="99"
                            placeholder="1"
                            value={tipoGrupo}
                            onChange={e => setTipoGrupo(e.target.value)}
                            disabled={guardandoTipo}
                          />
                        </Field>
                      </div>
                    </div>

                    {/* Panel 2: Nombre descriptivo */}
                    <div className="rounded-xl border border-line bg-alt/30 p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">2</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                          Nombre Oficial y Descripción
                        </h3>
                      </div>

                      <Field
                        label="Descripción / Nombre oficial *"
                        hint="Nombre visible para el paciente y en los reportes de auditoría."
                      >
                        <Input
                          icon="file"
                          required
                          placeholder="Ej. Contrato de Prestación de Servicios Odontológicos"
                          value={tipoDescripcion}
                          onChange={e => setTipoDescripcion(e.target.value)}
                          disabled={guardandoTipo}
                        />
                      </Field>
                    </div>

                    {/* Panel 3: Estado */}
                    <div className="rounded-xl border border-brand/20 bg-brand-soft/20 p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-ink block">Estado del tipo de documento</span>
                        <span className="text-[11px] text-muted block">Habilita o deshabilita este contrato en la plataforma.</span>
                      </div>
                      <Checkbox
                        checked={tipoActivo}
                        onChange={e => setTipoActivo(e.target.checked)}
                        label={tipoActivo ? 'Activo' : 'Inactivo'}
                      />
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-line">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cerrarFormTipo}
                        disabled={guardandoTipo}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>

                      <Button
                        type="submit"
                        disabled={guardandoTipo}
                        className="w-full sm:w-auto"
                      >
                        {guardandoTipo ? 'Guardando…' : editandoTipo ? 'Actualizar tipo' : 'Crear tipo'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="min-w-0 max-w-full overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-line">
              <h2 className="text-base font-bold text-ink">Catálogo de Tipos de Documentos y Contratos</h2>
              <p className="mt-0.5 text-xs text-muted">
                Define los tipos de contratos legales disponibles. Cada tipo mantiene su historial de versiones, teniendo estrictamente una versión activa a la vez.
              </p>
            </div>

            <Toolbar>
              <SearchInput
                placeholder="Buscar por código o descripción…"
                value={busquedaTipos}
                onChange={e => setBusquedaTipos(e.target.value)}
                onClear={() => setBusquedaTipos('')}
                className="w-full sm:min-w-64 sm:flex-1"
              />
            </Toolbar>

            <Table columns={COLUMNS_TIPOS}>
              {cargandoTipos ? (
                <TableSkeletonRows rows={3} cols={COLUMNS_TIPOS.length} />
              ) : (
                <>
                  <TableState
                    colSpan={COLUMNS_TIPOS.length}
                    error={errorTipos}
                    empty={!errorTipos && tiposFiltrados.length === 0}
                    emptyLabel="No hay tipos de documentos registrados."
                  />

                  {tiposFiltrados.map(tipo => (
                    <tr key={tipo.id}>
                      <td className="font-mono font-semibold text-xs text-ink whitespace-nowrap">
                        <Badge tone="blue" className="font-mono text-xs uppercase">
                          {tipo.codigo}
                        </Badge>
                      </td>

                      <td className="font-medium text-ink">
                        {tipo.descripcion}
                      </td>

                      <td className="text-center font-mono text-xs text-muted">
                        {tipo.grupo ?? 1}
                      </td>

                      <td className="text-center">
                        <div className="flex justify-center">
                          <Badge tone={tipo.activo ? 'green' : 'gray'}>
                            {tipo.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </td>

                      <ActionsCell align="center">
                        <RowActions
                          actions={[
                            {
                              label: 'Editar tipo',
                              icon: 'edit',
                              onClick: () => abrirEditarTipo(tipo),
                            },
                            {
                              label: tipo.activo ? 'Desactivar tipo' : 'Activar tipo',
                              icon: tipo.activo ? 'xCircle' : 'checkCircle',
                              onClick: () => setTipoCambiarEstado(tipo),
                              variant: tipo.activo ? 'danger' : 'success',
                              danger: tipo.activo,
                              dividerBefore: true,
                            },
                          ]}
                        />
                      </ActionsCell>
                    </tr>
                  ))}
                </>
              )}
            </Table>
          </Card>
        </>
      )}

      {/* =========================================================
       * TAB 2: GESTIÓN DE VERSIONES DE DOCUMENTOS
       * ========================================================= */}
      {tabActual === 'versiones' && (
        <>
          {/* FORMULARIO DE SUBIDA / EDICIÓN DE VERSIÓN */}
          <AnimatePresence>
            {mostrarForm && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mb-6 min-w-0 max-w-full"
              >
                <Card className="border border-brand/30 shadow-md overflow-hidden">
                  {/* Encabezado con contraste de color */}
                  <div className="bg-brand-soft/30 border-b border-brand/20 px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Icon name="file" size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-ink">
                          {editandoItem ? `Editar versión: ${editandoItem.version}` : 'Subir nueva versión de documento legal'}
                        </h2>
                        <p className="text-xs text-muted">
                          Solo puede haber una versión activa por cada tipo. Al activar una versión, la anterior se desactiva automáticamente.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Cerrar formulario"
                      onClick={cerrarForm}
                      disabled={guardando}
                      className="rounded-lg p-1.5 text-muted hover:bg-surface/80 hover:text-ink transition shrink-0"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleGuardar} className="p-5 sm:p-6 grid gap-5 min-w-0 max-w-full bg-surface">
                    {/* SECCIÓN 1: SELECCIÓN DEL TIPO DE DOCUMENTO */}
                    {!editandoItem ? (
                      <div className="rounded-xl border border-line bg-alt/30 p-4">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-line/60">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">1</span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                              Tipo de Contrato o Documento <span className="text-danger">*</span>
                            </h3>
                          </div>
                          {tipoActual && (
                            <Badge tone="blue" className="font-mono text-[11px]">
                              Seleccionado: {tipoActual.codigo}
                            </Badge>
                          )}
                        </div>

                        {tipos.length === 0 ? (
                          <div className="text-xs text-danger font-medium p-2">
                            No hay tipos de documentos registrados. Ve a la pestaña &ldquo;Tipos de Documentos&rdquo; para crear uno.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {tipos.map(t => {
                              const isSelected = idTipoSeleccionado === t.id
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => seleccionarTipo(t)}
                                  className={cn(
                                    'flex flex-col text-left p-3 rounded-xl border cursor-pointer transition-all',
                                    isSelected
                                      ? 'border-brand bg-brand-soft/50 shadow-xs ring-2 ring-brand'
                                      : 'border-line hover:border-brand/40 bg-surface'
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1.5 mb-1">
                                    <span className="font-mono text-xs font-bold text-ink uppercase">
                                      {t.codigo}
                                    </span>
                                    {isSelected ? (
                                      <span className="flex items-center gap-1 text-[11px] font-bold text-brand">
                                        <Icon name="check" size={13} />
                                        Elegido
                                      </span>
                                    ) : (
                                      <Badge tone={t.activo ? 'green' : 'gray'}>
                                        {t.activo ? 'Activo' : 'Inactivo'}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-ink-soft line-clamp-2">{t.descripcion}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* INFORMACIÓN DEL TIPO CUANDO SE EDITA */
                      <div className="rounded-xl border border-brand/30 bg-brand-soft/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-semibold text-muted block">Tipo de documento asociado:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge tone="blue" className="font-mono text-xs uppercase">
                              {editandoItem.codigoDocumento || 'LEGAL'}
                            </Badge>
                            <span className="text-sm font-bold text-ink">{editandoItem.titulo}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-muted block">Archivo en almacenamiento:</span>
                          <span className="text-xs font-mono font-semibold text-ink">{editandoItem.nombreArchivo}</span>
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN 2: ARCHIVO PDF OFICIAL */}
                    <div className="rounded-xl border border-line bg-alt/30 p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">2</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                          Archivo PDF Oficial {editandoItem ? '(Opcional)' : <span className="text-danger">*</span>}
                        </h3>
                      </div>

                      <label className="block min-w-0 max-w-full">
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
                          className={cn(
                            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors text-center cursor-pointer min-w-0 max-w-full overflow-hidden',
                            archivoSeleccionado
                              ? 'border-brand bg-brand-soft/40'
                              : 'border-line hover:border-brand/50 bg-surface hover:bg-hover'
                          )}
                        >
                          <Icon name="file" size={28} className="text-brand shrink-0" />
                          {archivoSeleccionado ? (
                            <div className="min-w-0 max-w-full px-2">
                              <span className="text-sm font-bold text-ink block truncate max-w-[280px] sm:max-w-md mx-auto">
                                {archivoSeleccionado.name}
                              </span>
                              <span className="text-xs text-brand font-semibold block mt-0.5">
                                Archivo listo para subir ({Math.round(archivoSeleccionado.size / 1024)} KB)
                              </span>
                            </div>
                          ) : editandoItem ? (
                            <div className="min-w-0 max-w-full px-2">
                              <span className="text-xs font-bold text-brand hover:underline block break-all text-center">
                                Archivo actual: {editandoItem.nombreArchivo}
                              </span>
                              <span className="text-[11px] text-muted block mt-0.5">
                                Haz clic aquí si deseas subir un PDF de reemplazo
                              </span>
                            </div>
                          ) : (
                            <div className="min-w-0 max-w-full px-2">
                              <span className="text-xs font-bold text-brand hover:underline block">
                                Haz clic aquí para seleccionar el archivo PDF oficial
                              </span>
                              <span className="text-[11px] text-muted block mt-0.5">Formato PDF hasta 10 MB</span>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>

                    {/* SECCIÓN 3: VERSIÓN E IDENTIFICADOR */}
                    <div className="rounded-xl border border-line bg-alt/30 p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">3</span>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                          Identificación de la Versión
                        </h3>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 min-w-0 max-w-full">
                        <Field
                          label="Código de versión *"
                          hint="Número de versión para auditoría (ej. 1.0, 1.1)."
                        >
                          <Input
                            icon="lock"
                            required
                            placeholder="Ej. 1.0 o 2.0"
                            value={version}
                            onChange={e => setVersion(e.target.value)}
                            disabled={guardando}
                          />
                        </Field>

                        <Field
                          label="Nombre descriptivo del documento *"
                          hint="Nombre visible en la interfaz para los pacientes."
                        >
                          <Input
                            icon="file"
                            required
                            placeholder="Ej. Términos y Condiciones del Servicio"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            disabled={guardando}
                          />
                        </Field>
                      </div>
                    </div>

                    {/* SECCIÓN 4: PLANTILLA DINÁMICA DE CONSENTIMIENTO */}
                    <div className="rounded-xl border border-line bg-alt/30 p-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-line/60">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">4</span>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                            Textos Dinámicos de Consentimiento
                          </h3>
                        </div>
                        <span className="text-xs text-brand font-medium">Usa {'{0}'} para incrustar el enlace</span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 min-w-0 max-w-full">
                        <Field
                          label="Plantilla del consentimiento (usa {0})"
                          hint="El texto {0} se sustituirá por el enlace al documento."
                        >
                          <Input
                            icon="file"
                            placeholder="Ej. Acepto los {0} de NeoDent."
                            value={textoPlantilla}
                            onChange={e => setTextoPlantilla(e.target.value)}
                            disabled={guardando}
                          />
                        </Field>

                        <Field
                          label="Texto del enlace clickable {0}"
                          hint="Palabra o frase que abrirá el PDF."
                        >
                          <Input
                            icon="file"
                            placeholder="Ej. Términos y condiciones"
                            value={linkTexto}
                            onChange={e => setLinkTexto(e.target.value)}
                            disabled={guardando}
                          />
                        </Field>
                      </div>

                      <div className="mt-4">
                        <Field
                          label="Texto agrupado (leyenda al pie del modal de consentimiento)"
                          hint="Aparece al pie del modal de firma de consentimientos."
                        >
                          <Input
                            icon="file"
                            placeholder="Ej. los {0} de NeoDent"
                            value={textoAgrupado}
                            onChange={e => setTextoAgrupado(e.target.value)}
                            disabled={guardando}
                          />
                        </Field>
                      </div>

                      {/* VISTA PREVIA EN VIVO */}
                      <div className="rounded-xl border border-brand/30 bg-surface shadow-xs p-4 mt-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand uppercase tracking-wider mb-2.5">
                          <Icon name="eye" size={15} />
                          Vista previa en vivo (así lo verá el paciente):
                        </div>

                        <div className="bg-alt/40 rounded-lg p-3.5 border border-line">
                          <div className="flex items-start gap-2.5">
                            <div className="w-4 h-4 rounded border-2 border-brand bg-brand flex items-center justify-center shrink-0 mt-0.5">
                              <Icon name="check" size={11} className="text-white" />
                            </div>
                            <div className="text-xs text-ink font-medium leading-relaxed">
                              {(() => {
                                const template = textoPlantilla || 'Acepto los {0} de NeoDent.'
                                const link = linkTexto || 'Términos y condiciones'
                                if (template.includes('{0}')) {
                                  const parts = template.split('{0}')
                                  return (
                                    <>
                                      {parts[0]}
                                      <span className="text-brand font-bold underline cursor-pointer">
                                        {link}
                                      </span>
                                      {parts[1]}
                                    </>
                                  )
                                }
                                return <span>{template}</span>
                              })()}
                            </div>
                          </div>

                          {textoAgrupado && (
                            <div className="mt-2.5 text-[11px] text-muted border-t border-line/60 pt-2 pl-6">
                              Pie de página: Al dar clic en el botón aceptas{' '}
                              {textoAgrupado.replace('{0}', linkTexto || 'el documento')}.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 5: PUBLICACIÓN Y ESTADO */}
                    <div className="rounded-xl border border-brand/20 bg-brand-soft/20 p-4">
                      <Checkbox
                        checked={activarInmediato}
                        onChange={e => setActivarInmediato(e.target.checked)}
                        label="Marcar como versión Activa"
                      />
                      <p className="mt-1 text-xs text-muted pl-6">
                        Al activar esta versión, reemplazará cualquier versión activa previa de este mismo tipo (regla de una sola versión activa por tipo).
                      </p>
                    </div>

                    {/* BOTONES */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-line">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cerrarForm}
                        disabled={guardando}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>

                      <Button
                        type="submit"
                        disabled={guardando}
                        className="w-full sm:w-auto"
                      >
                        {guardando
                          ? 'Guardando en S3…'
                          : editandoItem
                          ? 'Actualizar versión'
                          : 'Publicar versión'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="min-w-0 max-w-full overflow-hidden">
            <div className="p-5 sm:p-6 pb-4 border-b border-line">
              <h2 className="text-base font-bold text-ink">Versiones de Documentos Legales</h2>
              <p className="mt-0.5 text-xs text-muted">
                Publica y administra las versiones de cada documento legal. Solo una versión puede estar Activa por tipo.
              </p>
            </div>

            <Toolbar>
              <SearchInput
                placeholder="Buscar por versión o nombre de documento…"
                value={busquedaVersiones}
                onChange={e => setBusquedaVersiones(e.target.value)}
                onClear={() => setBusquedaVersiones('')}
                className="w-full sm:min-w-64 sm:flex-1"
              />

              {tipos.length > 0 && (
                <AnimatedSelect
                  label="Tipo"
                  value={filtroTipoCodigo}
                  onChange={val => setFiltroTipoCodigo(val)}
                  options={[
                    { value: '', label: 'Todos los tipos' },
                    ...tipos.map(t => ({
                      value: t.codigo,
                      label: `${t.codigo}`,
                    })),
                  ]}
                  className="w-full sm:w-48"
                />
              )}

              <AnimatedSelect
                label="Estado"
                value={filtroEstado}
                onChange={val => {
                  setFiltroEstado(val as FiltroEstado)
                  setPaginaVersiones(1)
                }}
                options={[
                  { value: '', label: 'Todos los estados' },
                  { value: 'activas', label: 'Activos' },
                  { value: 'inactivas', label: 'Inactivos' },
                ]}
                className="w-full sm:w-36"
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
                    empty={!errorVersiones && versionesFiltradas.length === 0}
                    emptyLabel="No hay versiones de documentos registradas."
                  />

                  {versionesFiltradas.map(item => (
                    <tr key={item.id}>
                      {/* COLUMNA 1: TIPO DE DOCUMENTO */}
                      <td className="font-medium text-ink">
                        <div className="text-xs font-bold text-ink mb-0.5">{item.titulo}</div>
                        <span className="font-mono text-[11px] text-muted">
                          {item.codigoDocumento || 'LEGAL'}
                        </span>
                      </td>

                      {/* COLUMNA 2: VERSIÓN (LIMPIA, SIN BADGE EXTRAÑO) */}
                      <td className="text-center">
                        <span className="font-mono text-xs font-bold text-ink">
                          {item.version}
                        </span>
                      </td>

                      {/* COLUMNA 3: ARCHIVO PDF (COLUMNA DEDICADA) */}
                      <td>
                        {item.nombreArchivo ? (
                          <div
                            onClick={() => handleVerDocumento(item)}
                            className="flex items-center gap-1.5 font-mono text-xs text-muted hover:text-brand cursor-pointer transition-colors"
                            title="Haz clic para ver el documento PDF"
                          >
                            <Icon name="file" size={14} className="text-brand shrink-0" />
                            <span className="truncate max-w-[210px] underline underline-offset-2">
                              {item.nombreArchivo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted italic">Sin archivo</span>
                        )}
                      </td>

                      {/* COLUMNA 4: FECHA DE REGISTRO */}
                      <td className="text-xs text-muted whitespace-nowrap">
                        {formatoFecha(item.fechaCreacion)}
                      </td>

                      {/* COLUMNA 5: ESTADO */}
                      <td className="text-center">
                        <div className="flex justify-center">
                          <Badge tone={item.activo ? 'green' : 'gray'}>
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </td>

                      {/* COLUMNA 6: ACCIONES */}
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
                              label: 'Activar versión',
                              icon: 'checkCircle',
                              show: !item.activo,
                              onClick: () => setItemActivar(item),
                              variant: 'success',
                              dividerBefore: true,
                            },
                            {
                              label: 'Eliminar de S3',
                              icon: 'trash',
                              show: !item.activo,
                              onClick: () => setItemEliminar(item),
                              variant: 'danger',
                              danger: true,
                              dividerBefore: true,
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
        </>
      )}

      {/* =========================================================
       * TAB 3: AUDITORÍA DE ACEPTACIONES
       * ========================================================= */}
      {tabActual === 'aceptaciones' && (
        <Card className="min-w-0 max-w-full overflow-hidden">
          <div className="p-5 sm:p-6 pb-4 border-b border-line">
            <h2 className="text-base font-bold text-ink">Auditoría de Aceptaciones</h2>
            <p className="mt-0.5 text-xs text-muted">
              Historial de aceptación de documentos legales por parte de los usuarios, incluyendo trazabilidad de dispositivo e IP.
            </p>
          </div>

          <Toolbar>
            <SearchInput
              placeholder="Buscar por DNI o número de documento…"
              value={busquedaAceptaciones}
              onChange={e => setBusquedaAceptaciones(e.target.value)}
              onClear={() => setBusquedaAceptaciones('')}
              className="w-full sm:min-w-64 sm:flex-1"
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
                  emptyLabel="No hay registros de aceptación disponibles."
                />

                {aceptaciones.map(item => {
                  const disp = detectarDispositivo(item.agenteUsuario)
                  return (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap">
                        <div className="text-xs font-mono font-semibold text-ink">
                          {item.tipoDocumento} {item.numeroDocumento}
                        </div>
                      </td>

                      <td className="font-medium text-ink">
                        {item.terminoFirmado}
                      </td>

                      <td className="text-center font-mono text-xs font-semibold text-brand">
                        {item.version}
                      </td>

                      <td className="text-center">
                        {disp ? (
                          <div className="flex justify-center" title={item.agenteUsuario || ''}>
                            <Badge tone={disp.tone}>
                              <span className="flex items-center gap-1">
                                <Icon name={disp.icon} size={12} />
                                {disp.label}
                              </span>
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>

                      <td className="font-mono text-xs text-muted whitespace-nowrap">
                        {item.ip || 'No registrada'}
                      </td>

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

      {/* DIÁLOGO PARA CAMBIAR ESTADO DE TIPO DE DOCUMENTO */}
      <ConfirmDialog
        open={tipoCambiarEstado !== null}
        title={tipoCambiarEstado?.activo ? '¿Desactivar tipo de documento?' : '¿Activar tipo de documento?'}
        description={
          tipoCambiarEstado
            ? tipoCambiarEstado.activo
              ? `¿Estás seguro de desactivar el tipo ${tipoCambiarEstado.codigo}? Las versiones existentes se conservarán pero no se podrán crear nuevas versiones mientras esté inactivo.`
              : `¿Deseas activar el tipo ${tipoCambiarEstado.codigo} para permitir la gestión y publicación de versiones?`
            : ''
        }
        confirmLabel={
          procesandoAccion
            ? 'Guardando…'
            : tipoCambiarEstado?.activo
            ? 'Sí, desactivar'
            : 'Sí, activar'
        }
        cancelLabel="Cancelar"
        onConfirm={confirmarToggleEstadoTipo}
        onCancel={() => setTipoCambiarEstado(null)}
      />

      {/* DIÁLOGO PARA ACTIVAR VERSIÓN */}
      <ConfirmDialog
        open={itemActivar !== null}
        title="¿Activar versión de documento legal?"
        description={
          itemActivar
            ? `La versión ${itemActivar.version} (${itemActivar.titulo}) se convertirá en la versión activa para este tipo de documento. Cualquier versión anterior de este mismo tipo pasará automáticamente a estar inactiva.`
            : ''
        }
        confirmLabel={procesandoAccion ? 'Activando…' : 'Activar versión'}
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
