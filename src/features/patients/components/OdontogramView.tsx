import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ActionsCell,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Icon,
  Input,
  RowActions,
  SearchInput,
  Table,
  TableState,
  Tooltip,
  type Column,
} from '@/shared/components/ui'
import type {
  CondicionOdontograma,
  CrearCondicionRequest,
  OdontogramaResponse,
  PiezaDentalCatalogoItem,
  PiezaDentalDetalle,
} from '../api/clinicalApi'
import { ToothAnatomySvg } from './ToothAnatomySvg'

export type EstadoTratamiento = 'HALLAZGO' | 'PRESUPUESTADO' | 'PROGRAMADO' | 'REALIZADO'

interface OdontogramViewProps {
  odontograma: OdontogramaResponse | null
  condiciones: CondicionOdontograma[]
  piezasCatalogo?: PiezaDentalCatalogoItem[]
  readOnly?: boolean
  isAdmin?: boolean
  guardando?: boolean
  onActualizarPieza: (
    pieza: number,
    superficie: string | undefined,
    condicionId: number,
    observacion?: string,
    estado?: EstadoTratamiento,
    codigoCondicion?: string,
  ) => Promise<void>
  onLimpiarPieza: (pieza: number, superficie?: string) => Promise<void>
  onCrearCondicion?: (data: CrearCondicionRequest) => Promise<CondicionOdontograma>
  onActualizarCondicion?: (id: number, data: CrearCondicionRequest) => Promise<void>
  onEliminarCondicion?: (id: number) => Promise<void>
  onActualizarNombrePieza?: (numeroPieza: number, nombre: string) => Promise<void>
  onExportarPdf?: () => void
}

// Cuadrantes FDI Adultos (Permanente - 32 piezas)
const ADULTO_CUADRANTE_1 = [18, 17, 16, 15, 14, 13, 12, 11]
const ADULTO_CUADRANTE_2 = [21, 22, 23, 24, 25, 26, 27, 28]
const ADULTO_CUADRANTE_4 = [48, 47, 46, 45, 44, 43, 42, 41]
const ADULTO_CUADRANTE_3 = [31, 32, 33, 34, 35, 36, 37, 38]

// Cuadrantes FDI Niños / Pediátrico (Decidua / Temporal - 20 piezas)
const NINO_CUADRANTE_5 = [55, 54, 53, 52, 51]
const NINO_CUADRANTE_6 = [61, 62, 63, 64, 65]
const NINO_CUADRANTE_8 = [85, 84, 83, 82, 81]
const NINO_CUADRANTE_7 = [71, 72, 73, 74, 75]

export type SuperficieCara = 'GENERAL' | 'VESTIBULAR' | 'LINGUAL' | 'MESIAL' | 'DISTAL' | 'OCLUSAL'

// Nombres anatómicos estándar oficiales (FDI 52 piezas) para odontograma clínico
export const NOMBRES_ANATOMICOS_DEFAULT: Record<number, string> = {
  // Adultos Cuadrante 1: Sup. Der.
  18: 'Tercer molar sup. der.',
  17: 'Segundo molar sup. der.',
  16: 'Primer molar sup. der.',
  15: 'Segundo premolar sup. der.',
  14: 'Primer premolar sup. der.',
  13: 'Canino sup. der.',
  12: 'Incisivo lateral sup. der.',
  11: 'Incisivo central sup. der.',
  // Adultos Cuadrante 2: Sup. Izq.
  21: 'Incisivo central sup. izq.',
  22: 'Incisivo lateral sup. izq.',
  23: 'Canino sup. izq.',
  24: 'Primer premolar sup. izq.',
  25: 'Segundo premolar sup. izq.',
  26: 'Primer molar sup. izq.',
  27: 'Segundo molar sup. izq.',
  28: 'Tercer molar sup. izq.',
  // Adultos Cuadrante 3: Inf. Izq.
  31: 'Incisivo central inf. izq.',
  32: 'Incisivo lateral inf. izq.',
  33: 'Canino inf. izq.',
  34: 'Primer premolar inf. izq.',
  35: 'Segundo premolar inf. izq.',
  36: 'Primer molar inf. izq.',
  37: 'Segundo molar inf. izq.',
  38: 'Tercer molar inf. izq.',
  // Adultos Cuadrante 4: Inf. Der.
  41: 'Incisivo central inf. der.',
  42: 'Incisivo lateral inf. der.',
  43: 'Canino inf. der.',
  44: 'Primer premolar inf. der.',
  45: 'Segundo premolar inf. der.',
  46: 'Primer molar inf. der.',
  47: 'Segundo molar inf. der.',
  48: 'Tercer molar inf. der.',
  // Niños / Deciduos Cuadrante 5: Sup. Der.
  55: 'Segundo molar temporal sup. der.',
  54: 'Primer molar temporal sup. der.',
  53: 'Canino temporal sup. der.',
  52: 'Incisivo lateral temporal sup. der.',
  51: 'Incisivo central temporal sup. der.',
  // Niños / Deciduos Cuadrante 6: Sup. Izq.
  61: 'Incisivo central temporal sup. izq.',
  62: 'Incisivo lateral temporal sup. izq.',
  63: 'Canino temporal sup. izq.',
  64: 'Primer molar temporal sup. izq.',
  65: 'Segundo molar temporal sup. izq.',
  // Niños / Deciduos Cuadrante 7: Inf. Izq.
  71: 'Incisivo central temporal inf. izq.',
  72: 'Incisivo lateral temporal inf. izq.',
  73: 'Canino temporal inf. izq.',
  74: 'Primer molar temporal inf. izq.',
  75: 'Segundo molar temporal inf. izq.',
  // Niños / Deciduos Cuadrante 8: Inf. Der.
  81: 'Incisivo central temporal inf. der.',
  82: 'Incisivo lateral temporal inf. der.',
  83: 'Canino temporal inf. der.',
  84: 'Primer molar temporal inf. der.',
  85: 'Segundo molar temporal inf. der.',
}

const COLUMNS_HALLAZGOS: Column[] = [
  { key: 'pieza', label: 'Pieza' },
  { key: 'superficie', label: 'Superficie' },
  { key: 'condicion', label: 'Diagnóstico / Condición' },
  { key: 'estado', label: 'Estado', align: 'center' },
  { key: 'observacion', label: 'Observación' },
  { label: 'Acciones', align: 'center' },
]

export function OdontogramView({
  odontograma,
  condiciones,
  piezasCatalogo = [],
  readOnly = false,
  isAdmin = false,
  guardando = false,
  onActualizarPieza,
  onLimpiarPieza,
  onCrearCondicion,
  onActualizarCondicion,
  onEliminarCondicion,
  onActualizarNombrePieza,
  onExportarPdf,
}: OdontogramViewProps) {
  // Catálogo reactivo que proviene de la base de datos
  const catalogoCondiciones = useMemo(() => {
    return condiciones || []
  }, [condiciones])

  // Mapa reactivo de nombres anatómicos de piezas dentales directamente desde la BD
  const nombresDientesMap = useMemo(() => {
    const mapa: Record<number, string> = { ...NOMBRES_ANATOMICOS_DEFAULT }
    if (piezasCatalogo && piezasCatalogo.length > 0) {
      for (const p of piezasCatalogo) {
        if (p.nombre && !p.nombre.startsWith('Pieza Nº')) {
          mapa[p.numeroPieza] = p.nombre.replace(/\s*\(\d+\)$/, '')
        }
      }
    }
    return mapa
  }, [piezasCatalogo])

  const [tipoDenticion, setTipoDenticion] = useState<'ADULTO' | 'NINO'>('ADULTO')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'HALLAZGOS' | 'PRESUPUESTADO' | 'PROGRAMADO' | 'REALIZADO'>('TODOS')
  const [piezaSeleccionada, setPiezaSeleccionada] = useState<number>(16)
  const [caraSeleccionada, setCaraSeleccionada] = useState<SuperficieCara>('OCLUSAL')
  const [ultimaCara, setUltimaCara] = useState<SuperficieCara>('OCLUSAL')
  const [condicionId, setCondicionId] = useState<number>(() => catalogoCondiciones[0]?.id || 1)
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null)

  const cambiarCara = (cara: SuperficieCara) => {
    setErrorValidacion(null)
    if (cara !== 'GENERAL') {
      setUltimaCara(cara)
    }
    setCaraSeleccionada(cara)
  }
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoTratamiento>('HALLAZGO')
  const [busquedaCondicion, setBusquedaCondicion] = useState('')
  const [observacion, setObservacion] = useState('')
  const [procesando, setProcesando] = useState(false)

  // Modal para agregar o editar condición clínica
  const [modalCrearCondicion, setModalCrearCondicion] = useState(false)
  const [condicionEditando, setCondicionEditando] = useState<CondicionOdontograma | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoCodigo, setNuevoCodigo] = useState('')
  const [nuevoColor, setNuevoColor] = useState('#3B82F6')
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')
  const [nuevoAplicaA, setNuevoAplicaA] = useState<'AMBOS' | 'PIEZA_COMPLETA' | 'SUPERFICIE'>('SUPERFICIE')
  const [guardandoCondicion, setGuardandoCondicion] = useState(false)

  // Modal para configurar / gestionar catálogo en BD
  const [modalGestionarCatalogo, setModalGestionarCatalogo] = useState(false)
  const [pestanaGestion, setPestanaGestion] = useState<'CONDICIONES' | 'PIEZAS'>('CONDICIONES')
  const [busquedaGestionar, setBusquedaGestionar] = useState('')
  const [busquedaPiezasGestionar, setBusquedaPiezasGestionar] = useState('')
  const [filtroDenticionPiezas, setFiltroDenticionPiezas] = useState<'TODAS' | 'PERMANENTE' | 'TEMPORAL'>('TODAS')
  const [piezaEditandoNumero, setPiezaEditandoNumero] = useState<number | null>(null)
  const [nombrePiezaEditando, setNombrePiezaEditando] = useState('')
  const [guardandoNombrePieza, setGuardandoNombrePieza] = useState(false)
  const [eliminandoCondicionId, setEliminandoCondicionId] = useState<number | null>(null)
  const [condicionAEliminar, setCondicionAEliminar] = useState<{ id: number; nombre: string } | null>(null)

  // Cerrar modales con tecla Escape
  useEffect(() => {
    if (!modalCrearCondicion && !modalGestionarCatalogo && !condicionAEliminar) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (condicionAEliminar) {
          setCondicionAEliminar(null)
          return
        }
        if (!guardandoCondicion) setModalCrearCondicion(false)
        setModalGestionarCatalogo(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [modalCrearCondicion, modalGestionarCatalogo, condicionAEliminar, guardandoCondicion])

  // Mapa de hallazgos por número de pieza
  const mapaHallazgos = useMemo(() => {
    const mapa = new Map<number, PiezaDentalDetalle[]>()
    if (!odontograma?.piezas) return mapa
    for (const p of odontograma.piezas) {
      const arr = mapa.get(p.numeroPieza) || []
      arr.push(p)
      mapa.set(p.numeroPieza, arr)
    }
    return mapa
  }, [odontograma])

  // Lista de tratamientos filtrados para la bandeja inferior
  const hallazgosFiltrados = useMemo(() => {
    if (!odontograma?.piezas) return []
    if (filtroEstado === 'TODOS') return odontograma.piezas
    if (filtroEstado === 'HALLAZGOS') {
      return odontograma.piezas.filter(p => !p.estado || p.estado === 'HALLAZGO')
    }
    return odontograma.piezas.filter(p => p.estado === filtroEstado)
  }, [odontograma, filtroEstado])

  // Filtrado reactivo en el buscador de condiciones
  const condicionesFiltradas = useMemo(() => {
    if (!busquedaCondicion.trim()) return catalogoCondiciones
    const q = busquedaCondicion.toLowerCase().trim()
    return catalogoCondiciones.filter(
      c =>
        c.nombre.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(q)),
    )
  }, [catalogoCondiciones, busquedaCondicion])

  // Hallazgos actuales de la pieza seleccionada
  const hallazgosPiezaActual = useMemo(() => {
    return mapaHallazgos.get(piezaSeleccionada) || []
  }, [mapaHallazgos, piezaSeleccionada])

  const condicionSeleccionadaObj = useMemo(() => {
    return catalogoCondiciones.find(c => c.id === condicionId)
  }, [catalogoCondiciones, condicionId])

  const seleccionarPiezaYActualizarForm = (num: number, cara?: SuperficieCara) => {
    setErrorValidacion(null)
    setPiezaSeleccionada(num)
    if (cara) cambiarCara(cara)
    const hallazgos = mapaHallazgos.get(num) || []
    if (hallazgos.length > 0) {
      const h = cara ? hallazgos.find(item => item.superficie === cara) || hallazgos[0] : hallazgos[0]
      setCondicionId(h.idCondicion)
      setObservacion(h.observacion || '')
      if (h.estado) {
        setEstadoSeleccionado(h.estado)
      }
      if (!cara && h.superficie) {
        cambiarCara(h.superficie as SuperficieCara)
      }
    } else {
      setObservacion('')
      // Si el filtro activo es específico, sugerir esa fase por defecto
      if (filtroEstado !== 'TODOS') {
        setEstadoSeleccionado(filtroEstado === 'HALLAZGOS' ? 'HALLAZGO' : filtroEstado)
      }
    }
  }

  const handleGuardar = async () => {
    if (!piezaSeleccionada || readOnly) return
    setErrorValidacion(null)
    const condicionObj = condicionSeleccionadaObj || catalogoCondiciones.find(c => c.id === condicionId)
    if (!condicionObj) {
      setErrorValidacion('Seleccione una condición clínica válida del catálogo.')
      return
    }

    const esCaraGeneral = caraSeleccionada === 'GENERAL'
    const ambito = condicionObj.aplicaA ? condicionObj.aplicaA.toUpperCase() : 'AMBOS'

    // Validación estricta: No permitir pieza completa como superficie ni viceversa
    if (ambito === 'PIEZA_COMPLETA' && !esCaraGeneral) {
      setErrorValidacion(
        `La condición "${condicionObj.nombre}" es de PIEZA COMPLETA y no puede registrarse en una cara o superficie individual (${caraSeleccionada}). Seleccione "Toda la pieza".`
      )
      return
    }

    if (ambito === 'SUPERFICIE' && esCaraGeneral) {
      setErrorValidacion(
        `La condición "${condicionObj.nombre}" es de SUPERFICIE y requiere especificar una cara (Vestibular, Lingual, Oclusal, Mesial o Distal), no la pieza completa.`
      )
      return
    }

    setProcesando(true)
    try {
      await onActualizarPieza(
        piezaSeleccionada,
        esCaraGeneral ? undefined : caraSeleccionada,
        condicionId,
        observacion.trim() || undefined,
        estadoSeleccionado,
        condicionObj.codigo,
      )
      setErrorValidacion(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la condición dental.'
      setErrorValidacion(msg)
    } finally {
      setProcesando(false)
    }
  }

  const handleLimpiar = async () => {
    if (!piezaSeleccionada || readOnly) return
    setErrorValidacion(null)
    setProcesando(true)
    try {
      await onLimpiarPieza(piezaSeleccionada, caraSeleccionada === 'GENERAL' ? undefined : caraSeleccionada)
      setObservacion('')
    } catch (err) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al limpiar la pieza dental.')
    } finally {
      setProcesando(false)
    }
  }

  const abrirCrearCondicion = () => {
    setCondicionEditando(null)
    setNuevoNombre('')
    setNuevoCodigo('')
    setNuevoColor('#3B82F6')
    setNuevaDescripcion('')
    setNuevoAplicaA('SUPERFICIE')
    setModalCrearCondicion(true)
  }

  const abrirEditarCondicion = (c: CondicionOdontograma) => {
    setCondicionEditando(c)
    setNuevoNombre(c.nombre)
    setNuevoCodigo(c.codigo)
    setNuevoColor(c.colorHexadecimal)
    setNuevaDescripcion(c.descripcion || '')
    setNuevoAplicaA((c.aplicaA ? c.aplicaA.toUpperCase() : 'SUPERFICIE') as 'AMBOS' | 'PIEZA_COMPLETA' | 'SUPERFICIE')
    setModalCrearCondicion(true)
  }

  const handleCrearNuevaCondicionSubmit = async () => {
    if (!nuevoNombre.trim()) return
    setGuardandoCondicion(true)
    try {
      const payload = {
        nombre: nuevoNombre.trim(),
        codigo: nuevoCodigo.trim() || undefined,
        descripcion: nuevaDescripcion.trim() || undefined,
        colorHexadecimal: nuevoColor,
        aplicaA: nuevoAplicaA,
      }

      if (condicionEditando) {
        if (onActualizarCondicion) {
          await onActualizarCondicion(condicionEditando.id, payload)
        }
      } else {
        if (onCrearCondicion) {
          const nueva = await onCrearCondicion(payload)
          setCondicionId(nueva.id)
          if (nueva.aplicaA === 'PIEZA_COMPLETA') {
            cambiarCara('GENERAL')
          }
        }
      }

      setModalCrearCondicion(false)
      setCondicionEditando(null)
      setNuevoNombre('')
      setNuevoCodigo('')
      setNuevaDescripcion('')
      setNuevoAplicaA('SUPERFICIE')
    } finally {
      setGuardandoCondicion(false)
    }
  }



  const handleGuardarNombrePiezaSubmit = async (numeroPieza: number) => {
    if (!nombrePiezaEditando.trim() || !onActualizarNombrePieza) return
    setGuardandoNombrePieza(true)
    try {
      await onActualizarNombrePieza(numeroPieza, nombrePiezaEditando.trim())
      setPiezaEditandoNumero(null)
      setNombrePiezaEditando('')
    } finally {
      setGuardandoNombrePieza(false)
    }
  }

  // Filtrado para el modal de gestión del catálogo
  const condicionesGestionar = useMemo(() => {
    if (!busquedaGestionar.trim()) return catalogoCondiciones
    const q = busquedaGestionar.toLowerCase().trim()
    return catalogoCondiciones.filter(
      c =>
        c.nombre.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(q)),
    )
  }, [catalogoCondiciones, busquedaGestionar])

  // Lista y filtrado para el catálogo de piezas dentales (FDI 52 piezas desde BD)
  const piezasGestionar = useMemo(() => {
    let list: Array<{ numeroPieza: number; nombre: string; tipoDenticion: string; cuadrante: number }> = []

    if (piezasCatalogo && piezasCatalogo.length > 0) {
      list = piezasCatalogo.map(p => {
        const esNombreInvalido = !p.nombre || p.nombre.startsWith('Pieza Nº')
        const nombreLimpio = esNombreInvalido
          ? (NOMBRES_ANATOMICOS_DEFAULT[p.numeroPieza] || `Pieza ${p.numeroPieza}`)
          : p.nombre.replace(/\s*\(\d+\)$/, '')

        return {
          numeroPieza: p.numeroPieza,
          nombre: nombreLimpio,
          tipoDenticion: p.tipoDenticion,
          cuadrante: p.cuadrante,
        }
      })
    } else {
      const piezasFdi = [
        18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
        48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
        55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75,
      ]
      list = piezasFdi.map(num => ({
        numeroPieza: num,
        nombre: NOMBRES_ANATOMICOS_DEFAULT[num] || `Pieza ${num}`,
        tipoDenticion: num >= 51 ? 'TEMPORAL' : 'PERMANENTE',
        cuadrante: Math.floor(num / 10),
      }))
    }

    if (filtroDenticionPiezas === 'PERMANENTE') {
      list = list.filter(p => p.tipoDenticion === 'PERMANENTE' || p.tipoDenticion === 'ADULTO')
    } else if (filtroDenticionPiezas === 'TEMPORAL') {
      list = list.filter(p => p.tipoDenticion === 'TEMPORAL' || p.tipoDenticion === 'NINO')
    }

    if (!busquedaPiezasGestionar.trim()) return list
    const q = busquedaPiezasGestionar.toLowerCase().trim()
    return list.filter(
      p =>
        p.numeroPieza.toString().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.tipoDenticion.toLowerCase().includes(q),
    )
  }, [piezasCatalogo, filtroDenticionPiezas, busquedaPiezasGestionar])

  const confirmarEliminarCondicion = async () => {
    if (!condicionAEliminar || !onEliminarCondicion) return
    const id = condicionAEliminar.id
    setCondicionAEliminar(null)
    setEliminandoCondicionId(id)
    try {
      await onEliminarCondicion(id)
      if (condicionId === id) {
        const restante = catalogoCondiciones.find(c => c.id !== id)
        if (restante) setCondicionId(restante.id)
      }
    } finally {
      setEliminandoCondicionId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* CABECERA ODONTOGRAMA CLÍNICO SEGÚN MOCKUP */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Odontograma clínico</h1>
          <p className="text-xs text-muted mt-0.5">
            Registra y consulta las condiciones, hallazgos y tratamientos de cada pieza dental.
          </p>
        </div>

        {onExportarPdf && (
          <Button
            variant="ghost"
            size="sm"
            icon="download"
            onClick={onExportarPdf}
          >
            Exportar
          </Button>
        )}
      </div>

      {/* GRID DE DOS COLUMNAS CONFORME AL MOCKUP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: MAPA DENTAL + BANDEJA DE HALLAZGOS (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* CARD 1: MAPA DENTAL */}
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-xs space-y-5">
            {/* Header del Mapa Dental con Selector de Dentición */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-ink">Mapa dental</h3>
                <p className="text-xs text-muted mt-0.5">
                  Selecciona una pieza o una de sus caras para registrar una condición.
                </p>
              </div>

              {/* Selector de Dentición Segmented Pills */}
              <div className="inline-flex rounded-xl p-1 bg-alt/40 border border-line shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTipoDenticion('ADULTO')
                    setPiezaSeleccionada(16)
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${tipoDenticion === 'ADULTO'
                    ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200/80 shadow-2xs'
                    : 'text-muted hover:text-ink'
                    }`}
                >
                  Adulto · 32 piezas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoDenticion('NINO')
                    setPiezaSeleccionada(55)
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${tipoDenticion === 'NINO'
                    ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200/80 shadow-2xs'
                    : 'text-muted hover:text-ink'
                    }`}
                >
                  Pediátrico · 20 piezas
                </button>
              </div>
            </div>

            {/* CONTENEDOR UNIFICADO DEL ODONTOGRAMA (SCROLL SINCRONIZADO Y FLUIDO) */}
            <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
              <div
                tabIndex={0}
                aria-label="Odontograma completo con desplazamiento horizontal sincronizado"
                className="w-full overflow-x-auto pb-4 pt-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-alt/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand/30 hover:[&::-webkit-scrollbar-thumb]:bg-brand/60 [&::-webkit-scrollbar-thumb]:rounded-full transition-colors focus:outline-none"
              >
                <div className="w-fit min-w-full mx-auto flex flex-col items-center select-none py-1 px-2">
                  {/* ARCADA SUPERIOR · MAXILAR */}
                  <div className="w-full space-y-2">
                    {/* Encabezado de Cuadrantes Superiores */}
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted px-2">
                      <span className="flex items-center gap-1.5 text-brand/90">
                        <span className="size-1.5 rounded-full bg-brand" />
                        {tipoDenticion === 'ADULTO' ? 'Cuadrante 1' : 'Cuadrante 5'}
                      </span>
                      <span className="font-extrabold text-ink tracking-widest text-[10px] bg-alt/60 px-3 py-0.5 rounded-full border border-line">
                        Arcada Superior · Maxilar
                      </span>
                      <span className="flex items-center gap-1.5 text-brand/90">
                        {tipoDenticion === 'ADULTO' ? 'Cuadrante 2' : 'Cuadrante 6'}
                        <span className="size-1.5 rounded-full bg-brand" />
                      </span>
                    </div>

                    <div className="flex items-end justify-center gap-1 sm:gap-1.5 py-1">
                      {tipoDenticion === 'ADULTO' ? (
                        <>
                          {/* Cuadrante 1: 18 a 11 */}
                          <div className="flex items-end gap-1 sm:gap-1.5">
                            {ADULTO_CUADRANTE_1.map(num => (
                              <PiezaDentalCompleta
                                key={num}
                                numero={num}
                                esSuperior={true}
                                hallazgos={mapaHallazgos.get(num) || []}
                                filtroEstado={filtroEstado}
                                seleccionada={piezaSeleccionada === num}
                                caraSeleccionada={piezaSeleccionada === num ? caraSeleccionada : null}
                                disabled={readOnly || guardando}
                                onClick={() => seleccionarPiezaYActualizarForm(num)}
                                onSelectCara={cara => seleccionarPiezaYActualizarForm(num, cara)}
                              />
                            ))}
                          </div>
                          {/* Línea media vertical continua */}
                          <div className="w-px h-28 bg-line self-center mx-1 sm:mx-1.5" />
                          {/* Cuadrante 2: 21 a 28 */}
                          <div className="flex items-end gap-1 sm:gap-1.5">
                            {ADULTO_CUADRANTE_2.map(num => (
                              <PiezaDentalCompleta
                                key={num}
                                numero={num}
                                esSuperior={true}
                                hallazgos={mapaHallazgos.get(num) || []}
                                filtroEstado={filtroEstado}
                                seleccionada={piezaSeleccionada === num}
                                caraSeleccionada={piezaSeleccionada === num ? caraSeleccionada : null}
                                disabled={readOnly || guardando}
                                onClick={() => seleccionarPiezaYActualizarForm(num)}
                                onSelectCara={cara => seleccionarPiezaYActualizarForm(num, cara)}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Pediátrico Cuadrante 5: 55 a 51 */}
                          <div className="flex items-end gap-1 sm:gap-2">
                            {NINO_CUADRANTE_5.map(num => (
                              <PiezaDentalCompleta
                                key={num}
                                numero={num}
                                esSuperior={true}
                                hallazgos={mapaHallazgos.get(num) || []}
                                filtroEstado={filtroEstado}
                                seleccionada={piezaSeleccionada === num}
                                caraSeleccionada={piezaSeleccionada === num ? caraSeleccionada : null}
                                disabled={readOnly || guardando}
                                onClick={() => seleccionarPiezaYActualizarForm(num)}
                                onSelectCara={cara => seleccionarPiezaYActualizarForm(num, cara)}
                              />
                            ))}
                          </div>
                          <div className="w-px h-28 bg-line self-center mx-1 sm:mx-1.5" />
                          {/* Pediátrico Cuadrante 6: 61 a 65 */}
                          <div className="flex items-end gap-1 sm:gap-2">
                            {NINO_CUADRANTE_6.map(num => (
                              <PiezaDentalCompleta
                                key={num}
                                numero={num}
                                esSuperior={true}
                                hallazgos={mapaHallazgos.get(num) || []}
                                filtroEstado={filtroEstado}
                                seleccionada={piezaSeleccionada === num}
                                caraSeleccionada={piezaSeleccionada === num ? caraSeleccionada : null}
                                disabled={readOnly || guardando}
                                onClick={() => seleccionarPiezaYActualizarForm(num)}
                                onSelectCara={cara => seleccionarPiezaYActualizarForm(num, cara)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* SEPARADOR DE OCLUSIÓN / LÍNEA MEDIA HORIZONTAL */}
                  <div className="w-full relative my-3 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-line" />
                    </div>
                    <div className="relative bg-surface px-3 py-0.5 rounded-full border border-line text-[9px] font-bold text-muted uppercase tracking-wider">
                      Oclusión / Línea Media
                    </div>
                  </div>

                  {/* ARCADA INFERIOR · MANDÍBULA */}
                  <div className="w-full space-y-2">
                    <div className="flex items-start justify-center gap-1 sm:gap-1.5 py-1">
                      {tipoDenticion === 'ADULTO' ? (
                        <>
                          {/* Cuadrante 4: 48 a 41 */}
                          <div className="flex items-start gap-1 sm:gap-1.5">
                            {ADULTO_CUADRANTE_4.map(num => (
                              <PiezaDentalCompleta
                                key={num}
                                numero={num}
                                esSuperior={false}
                                hallazgos={mapaHallazgos.get(num) || []}
                                filtroEstado={filtroEstado}
                                seleccionada={piezaSeleccionada === num}
                                caraSeleccionada={piezaSeleccionada === num ? caraSeleccionada : null}
                                disabled={readOnly || guardando}
                                onClick={() => seleccionarPiezaYActualizarForm(num)}
                                onSelectCara={cara => seleccionarPiezaYActualizarForm(num, cara)}
                              />
                            ))}
                          </div>
                          <div className="w-px h-28 bg-line self-center mx-1 sm:mx-1.5" />
                          {/* Cuadrante 3: 31 a 38 */}
                          <div className="flex items-start gap-1 sm:gap-1.5">
                            {ADULTO_CUADRANTE_3.map(num => (
                              <PiezaDentalCompleta
                                key={num}
                                numero={num}
                                esSuperior={false}
                                hallazgos={mapaHallazgos.get(num) || []}
                                filtroEstado={filtroEstado}
                                seleccionada={piezaSeleccionada === num}
                                caraSeleccionada={piezaSeleccionada === num ? caraSeleccionada : null}
                                disabled={readOnly || guardando}
                                onClick={() => seleccionarPiezaYActualizarForm(num)}
                                onSelectCara={cara => seleccionarPiezaYActualizarForm(num, cara)}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Pediátrico Cuadrante 8: 85 a 81 */}
                          <div className="flex items-start gap-1 sm:gap-2">
                            {NINO_CUADRANTE_8.map(num => (
                              <PiezaDentalCompleta
                                key={num}
                                numero={num}
                                esSuperior={false}
                                hallazgos={mapaHallazgos.get(num) || []}
                                filtroEstado={filtroEstado}
                                seleccionada={piezaSeleccionada === num}
                                caraSeleccionada={piezaSeleccionada === num ? caraSeleccionada : null}
                                disabled={readOnly || guardando}
                                onClick={() => seleccionarPiezaYActualizarForm(num)}
                                onSelectCara={cara => seleccionarPiezaYActualizarForm(num, cara)}
                              />
                            ))}
                          </div>
                          <div className="w-px h-28 bg-line self-center mx-1 sm:mx-1.5" />
                          {/* Pediátrico Cuadrante 7: 71 a 75 */}
                          <div className="flex items-start gap-1 sm:gap-2">
                            {NINO_CUADRANTE_7.map(num => (
                              <PiezaDentalCompleta
                                key={num}
                                numero={num}
                                esSuperior={false}
                                hallazgos={mapaHallazgos.get(num) || []}
                                filtroEstado={filtroEstado}
                                seleccionada={piezaSeleccionada === num}
                                caraSeleccionada={piezaSeleccionada === num ? caraSeleccionada : null}
                                disabled={readOnly || guardando}
                                onClick={() => seleccionarPiezaYActualizarForm(num)}
                                onSelectCara={cara => seleccionarPiezaYActualizarForm(num, cara)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Pie de Cuadrantes Inferiores */}
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted px-2">
                      <span className="flex items-center gap-1.5 text-brand/90">
                        <span className="size-1.5 rounded-full bg-brand" />
                        {tipoDenticion === 'ADULTO' ? 'Cuadrante 4' : 'Cuadrante 8'}
                      </span>
                      <span className="font-extrabold text-ink tracking-widest text-[10px] bg-alt/60 px-3 py-0.5 rounded-full border border-line">
                        Arcada Inferior · Mandíbula
                      </span>
                      <span className="flex items-center gap-1.5 text-brand/90">
                        {tipoDenticion === 'ADULTO' ? 'Cuadrante 3' : 'Cuadrante 7'}
                        <span className="size-1.5 rounded-full bg-brand" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: HALLAZGOS Y TRATAMIENTOS (TABLA ESTÁNDAR NEODENT) */}
          <Card className="p-0 overflow-hidden shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-line">
              <h3 className="text-sm font-bold text-ink">
                Hallazgos y tratamientos ({hallazgosFiltrados.length})
              </h3>

              {/* Filtros Segmented Pills */}
              <div className="inline-flex rounded-xl p-1 bg-alt/40 border border-line text-xs font-semibold">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'HALLAZGOS', label: 'Hallazgos' },
                  { id: 'PRESUPUESTADO', label: 'Presupuestado' },
                  { id: 'PROGRAMADO', label: 'Programado' },
                  { id: 'REALIZADO', label: 'Realizado' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFiltroEstado(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtroEstado === tab.id
                      ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200/80 shadow-2xs'
                      : 'text-muted hover:text-ink'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <Table columns={COLUMNS_HALLAZGOS}>
              <TableState
                colSpan={COLUMNS_HALLAZGOS.length}
                empty={hallazgosFiltrados.length === 0}
                emptyLabel="No hay hallazgos registrados con este filtro."
              />

              {hallazgosFiltrados.map(h => (
                <tr key={h.id || `${h.numeroPieza}-${h.superficie}`} className="transition-colors hover:bg-alt/60">
                  {/* PIEZA */}
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-0.5 shrink-0">
                        Nº {h.numeroPieza}
                      </span>
                      <span className="text-xs text-muted font-medium truncate max-w-[130px]" title={nombresDientesMap[h.numeroPieza]}>
                        {nombresDientesMap[h.numeroPieza] || `Pieza ${h.numeroPieza}`}
                      </span>
                    </div>
                  </td>

                  {/* SUPERFICIE */}
                  <td>
                    <span className="font-semibold text-ink text-xs">
                      {h.superficie === 'GENERAL' ? 'Toda la pieza' : `Cara ${h.superficie?.toLowerCase()}`}
                    </span>
                  </td>

                  {/* CONDICIÓN / DIAGNÓSTICO */}
                  <td>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${h.colorHexadecimal}15`,
                        color: h.colorHexadecimal,
                        border: `1px solid ${h.colorHexadecimal}40`,
                      }}
                    >
                      <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: h.colorHexadecimal }} />
                      {h.nombreCondicion}
                    </span>
                  </td>

                  {/* ESTADO */}
                  <td className="text-center">
                    {h.estado && (
                      <Badge
                        tone={
                          h.estado === 'REALIZADO'
                            ? 'green'
                            : h.estado === 'PROGRAMADO'
                              ? 'blue'
                              : h.estado === 'PRESUPUESTADO'
                                ? 'purple'
                                : 'red'
                        }
                      >
                        {h.estado === 'REALIZADO'
                          ? 'Realizado'
                          : h.estado === 'PROGRAMADO'
                            ? 'Programado'
                            : h.estado === 'PRESUPUESTADO'
                              ? 'Presupuestado'
                              : 'Hallazgo'}
                      </Badge>
                    )}
                  </td>

                  {/* OBSERVACIÓN */}
                  <td>
                    <span className="text-muted text-xs truncate max-w-xs block" title={h.observacion || ''}>
                      {h.observacion ? h.observacion : <span className="text-muted/40 italic">Sin observaciones</span>}
                    </span>
                  </td>

                  {/* ACCIONES (ESTÁNDAR NEODENT) */}
                  <ActionsCell align="center">
                    <RowActions
                      actions={[
                        {
                          label: 'Ver y editar en odontograma',
                          icon: 'edit',
                          onClick: () => seleccionarPiezaYActualizarForm(h.numeroPieza, h.superficie as SuperficieCara),
                        },
                        {
                          label: 'Eliminar hallazgo',
                          icon: 'trash',
                          danger: true,
                          dividerBefore: true,
                          show: !readOnly,
                          disabled: guardando,
                          onClick: () => onLimpiarPieza(h.numeroPieza, h.superficie === 'GENERAL' ? undefined : h.superficie),
                        },
                      ]}
                    />
                  </ActionsCell>
                </tr>
              ))}
            </Table>
          </Card>
        </div>

        {/* COLUMNA DERECHA: PANEL DE ACCIÓN Y REGISTRO (4 COLS) */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl border border-line bg-surface flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            {/* 1. SELECCIÓN DE PIEZA Y CARA DENTAL */}
            <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Pieza Seleccionada
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-brand tracking-tight">
                      Nº {piezaSeleccionada}
                    </span>
                    <Badge tone="blue">
                      {piezaSeleccionada >= 51 ? 'Temporal' : 'Permanente'}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink font-semibold mt-1 truncate">
                    {nombresDientesMap[piezaSeleccionada]?.replace(/\s*\(\d+\)$/, '') || `Pieza Nº ${piezaSeleccionada}`}
                  </p>
                </div>

                {/* SELECTOR INTERACTIVO DE CARAS DENTALES */}
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Cara: <strong className="text-brand">{caraSeleccionada === 'GENERAL' ? 'Toda la pieza' : caraSeleccionada}</strong>
                  </span>
                  <SelectorCircularCaras
                    caraSeleccionada={caraSeleccionada}
                    onSelectCara={cara => {
                      if (condicionSeleccionadaObj?.aplicaA === 'PIEZA_COMPLETA') {
                        setErrorValidacion(`"${condicionSeleccionadaObj.nombre}" solo aplica a toda la pieza. No seleccione caras individuales.`)
                        return
                      }
                      cambiarCara(cara)
                    }}
                  />
                </div>
              </div>

              {/* Botón rápido para alternar Área de afección */}
              <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                <span className="text-muted font-medium">Área de afección:</span>
                <button
                  type="button"
                  disabled={condicionSeleccionadaObj?.aplicaA === 'PIEZA_COMPLETA' && caraSeleccionada === 'GENERAL'}
                  onClick={() => {
                    if (caraSeleccionada === 'GENERAL') {
                      cambiarCara(ultimaCara || 'OCLUSAL')
                    } else {
                      cambiarCara('GENERAL')
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${caraSeleccionada === 'GENERAL'
                      ? 'bg-brand text-white border-brand shadow-2xs'
                      : 'bg-surface text-ink-soft border-line hover:bg-hover'
                    }`}
                >
                  {caraSeleccionada === 'GENERAL' ? '✓ Toda la pieza' : 'Toda la pieza'}
                </button>
              </div>
            </div>

            {/* 2. CATÁLOGO / CONDICIÓN CON BUSCADOR Y GESTIÓN BD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-ink truncate">
                  Elige la Condición o Tratamiento:
                </label>
                {isAdmin && !readOnly && onCrearCondicion && (
                  <Tooltip content="Configurar catálogo de condiciones y nombres">
                    <button
                      type="button"
                      onClick={() => setModalGestionarCatalogo(true)}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg text-ink-soft hover:text-ink bg-surface hover:bg-hover border border-line transition-all cursor-pointer shadow-2xs"
                    >
                      <Icon name="settings" size={13} />
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* Input buscador */}
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <Icon name="search" size={13} />
                </span>
                <input
                  type="text"
                  value={busquedaCondicion}
                  onChange={e => setBusquedaCondicion(e.target.value)}
                  placeholder="Buscar patología o tratamiento..."
                  className="w-full h-8.5 rounded-xl border border-line bg-surface pl-8 pr-7 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 transition-all"
                />
                {busquedaCondicion && (
                  <Tooltip content="Limpiar búsqueda">
                    <button
                      type="button"
                      onClick={() => setBusquedaCondicion('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </Tooltip>
                )}
              </div>

              {/* Lista limpia de condiciones (solo círculo y nombre, sin ID ni etiqueta de ámbito) */}
              <div className="max-h-36 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 space-y-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-line hover:[&::-webkit-scrollbar-thumb]:bg-muted/50 [&::-webkit-scrollbar-thumb]:rounded-full">
                {condicionesFiltradas.length > 0 ? (
                  condicionesFiltradas.map(c => {
                    const isSelected = condicionId === c.id
                    const ambito = c.aplicaA ? c.aplicaA.toUpperCase() : 'AMBOS'
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCondicionId(c.id)
                          setErrorValidacion(null)
                          if (ambito === 'PIEZA_COMPLETA') {
                            cambiarCara('GENERAL')
                          } else if (ambito === 'SUPERFICIE' && caraSeleccionada === 'GENERAL') {
                            cambiarCara(ultimaCara || 'OCLUSAL')
                          }
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer border ${isSelected
                            ? 'bg-brand/10 border-brand/50 text-brand font-bold shadow-2xs ring-1 ring-brand/30'
                            : 'bg-surface border-transparent text-ink hover:bg-hover hover:border-line/60 font-medium'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs ring-1 ring-black/10"
                            style={{ backgroundColor: c.colorHexadecimal }}
                          />
                          <span className="truncate">{c.nombre}</span>
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-brand text-white flex items-center justify-center shrink-0 ml-1.5">
                            <Icon name="check" size={11} />
                          </span>
                        )}
                      </button>
                    )
                  })
                ) : (
                  <div className="py-5 text-center text-xs text-muted space-y-1.5">
                    <p>No se encontraron resultados para &quot;{busquedaCondicion}&quot;</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. FASE / ESTADO DEL TRATAMIENTO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink block">
                Fase / Estado del Tratamiento:
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setEstadoSeleccionado('HALLAZGO')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${estadoSeleccionado === 'HALLAZGO'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-400'
                      : 'bg-surface text-ink-soft border-line hover:bg-hover'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Hallazgo
                </button>
                <button
                  type="button"
                  onClick={() => setEstadoSeleccionado('PRESUPUESTADO')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${estadoSeleccionado === 'PRESUPUESTADO'
                      ? 'bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-400'
                      : 'bg-surface text-ink-soft border-line hover:bg-hover'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Presupuesto
                </button>
                <button
                  type="button"
                  onClick={() => setEstadoSeleccionado('PROGRAMADO')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${estadoSeleccionado === 'PROGRAMADO'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400'
                      : 'bg-surface text-ink-soft border-line hover:bg-hover'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Programado
                </button>
                <button
                  type="button"
                  onClick={() => setEstadoSeleccionado('REALIZADO')}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${estadoSeleccionado === 'REALIZADO'
                      ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-400'
                      : 'bg-surface text-ink-soft border-line hover:bg-hover'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Realizado
                </button>
              </div>
            </div>

            {/* 4. OBSERVACIÓN CLÍNICA ADICIONAL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink block">
                Observación Clínica (Opcional):
              </label>
              <textarea
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                placeholder="Ej. Caries de 2do grado, fisura en cúspide mesial..."
                rows={2}
                className="w-full rounded-xl border border-line bg-surface p-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
          </div>

          {/* MENSAJE DE VALIDACIÓN O ERROR */}
          {errorValidacion && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2.5 mt-3 animate-in fade-in duration-200">
              <Icon name="warning" size={15} className="shrink-0 mt-0.5 text-danger" />
              <div className="flex-1 font-medium leading-relaxed">{errorValidacion}</div>
              <button
                type="button"
                onClick={() => setErrorValidacion(null)}
                className="text-danger/70 hover:text-danger text-xs font-bold p-0.5 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* BOTONES DE ACCIÓN */}
          <div className="pt-4 border-t border-line mt-3 space-y-2">
            <Button
              variant="primary"
              className="w-full justify-center"
              disabled={readOnly || procesando || guardando}
              onClick={handleGuardar}
            >
              {procesando || guardando ? (
                <Icon name="spinner" size={16} className="animate-spin" />
              ) : (
                <Icon name="check" size={16} />
              )}
              <span>Guardar condición</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-center text-xs text-muted hover:text-danger"
              disabled={readOnly || procesando || guardando || hallazgosPiezaActual.length === 0}
              onClick={handleLimpiar}
            >
              <Icon name="trash" size={14} />
              Limpiar seleccion
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL / DIÁLOGO PARA CREAR O EDITAR CONDICIÓN CLÍNICA (GUARDADO EN BD) */}
      <AnimatePresence>
        {modalCrearCondicion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] grid place-items-center bg-ink/50 p-4 backdrop-blur-xs"
            onClick={e => {
              if (e.target === e.currentTarget && !guardandoCondicion) setModalCrearCondicion(false)
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Encabezado estándar estilo PatientForm */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-line bg-surface">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white shadow-xs">
                    <Icon name="tag" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      {condicionEditando ? 'Editar Condición Clínica' : 'Nueva Condición Clínica'}
                    </h3>
                    <p className="text-xs text-muted">
                      {condicionEditando
                        ? 'Modifica los datos de la condición en la base de datos.'
                        : 'Registra una nueva condición o tratamiento dental en la base de datos.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCrearCondicion(false)}
                  disabled={guardandoCondicion}
                  className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink transition-colors cursor-pointer"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              {/* Formulario con paneles numerados tipo PatientForm */}
              <form
                onSubmit={e => {
                  e.preventDefault()
                  handleCrearNuevaCondicionSubmit()
                }}
                className="p-5 sm:p-6 space-y-4"
                noValidate
              >
                {/* PANEL 1: IDENTIFICACIÓN */}
                <div className="rounded-xl border border-line bg-alt/30 p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">
                      1
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Identificación de la Condición <span className="text-danger">*</span>
                    </h3>
                  </div>

                  <Field label="Nombre de la Condición o Tratamiento *">
                    <Input
                      icon="tag"
                      value={nuevoNombre}
                      onChange={e => {
                        const val = e.target.value
                        setNuevoNombre(val)
                        if (!nuevoCodigo || nuevoCodigo === nuevoNombre.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_')) {
                          setNuevoCodigo(val.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_'))
                        }
                      }}
                      placeholder="Ej. Carilla Estética, Blanqueamiento, Resina..."
                      autoFocus
                    />
                  </Field>
                </div>

                {/* PANEL 2: COLOR CLÍNICO */}
                <div className="rounded-xl border border-line bg-alt/30 p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">
                      2
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Color en Odontograma <span className="text-danger">*</span>
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <Tooltip content="Haz clic para abrir el selector de color">
                        <input
                          type="color"
                          id="picker-color-condicion"
                          value={nuevoColor}
                          onChange={e => setNuevoColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-line bg-surface p-1 shadow-2xs hover:border-brand transition-all shrink-0"
                        />
                      </Tooltip>
                      <Input
                        id="codigo-hex-color"
                        value={nuevoColor}
                        onChange={e => setNuevoColor(e.target.value)}
                        placeholder="#3B82F6"
                        className="w-36 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* PANEL 3: ÁMBITO DE APLICACIÓN (PIEZA COMPLETA VS SUPERFICIE) */}
                <div className="rounded-xl border border-line bg-alt/30 p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">
                      3
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Ámbito de Aplicación <span className="text-danger">*</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNuevoAplicaA('SUPERFICIE')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${nuevoAplicaA === 'SUPERFICIE'
                          ? 'border-brand bg-brand/10 ring-1 ring-brand text-brand'
                          : 'border-line bg-surface hover:bg-hover text-ink'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Por Superficie</span>
                        <Icon name="target" size={14} />
                      </div>
                      <p className="text-[11px] text-muted leading-tight">
                        Aplica a caras específicas (ej. Caries, Resina, Sellante).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNuevoAplicaA('PIEZA_COMPLETA')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${nuevoAplicaA === 'PIEZA_COMPLETA'
                          ? 'border-brand bg-brand/10 ring-1 ring-brand text-brand'
                          : 'border-line bg-surface hover:bg-hover text-ink'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Toda la Pieza</span>
                        <Icon name="tooth" size={14} />
                      </div>
                      <p className="text-[11px] text-muted leading-tight">
                        Afecta a la pieza completa (ej. Corona, Ausente, Implante).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNuevoAplicaA('AMBOS')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${nuevoAplicaA === 'AMBOS'
                          ? 'border-brand bg-brand/10 ring-1 ring-brand text-brand'
                          : 'border-line bg-surface hover:bg-hover text-ink'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Ambos / Libre</span>
                        <Icon name="layers" size={14} />
                      </div>
                      <p className="text-[11px] text-muted leading-tight">
                        Permite registrarse en caras o pieza completa (ej. Fractura).
                      </p>
                    </button>
                  </div>
                </div>

                {/* PANEL 4: PROTOCOLO O DETALLES */}
                <div className="rounded-xl border border-line bg-alt/30 p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line/60">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold">
                      4
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Protocolo o Detalles Clínicos (Opcional)
                    </h3>
                  </div>

                  <Field label="Descripción / Indicación clínica">
                    <textarea
                      value={nuevaDescripcion}
                      onChange={e => setNuevaDescripcion(e.target.value)}
                      placeholder="Indicación clínica o detalles del procedimiento..."
                      rows={2}
                      className="block w-full min-w-0 max-w-full rounded-control border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted transition-colors focus:border-brand focus:outline-none"
                    />
                  </Field>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalCrearCondicion(false)}
                    disabled={guardandoCondicion}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!nuevoNombre.trim() || guardandoCondicion}
                  >
                    {guardandoCondicion ? (
                      <>
                        <Icon name="spinner" size={16} className="animate-spin" />
                        <span>Guardando en BD...</span>
                      </>
                    ) : (
                      condicionEditando ? 'Guardar Cambios' : 'Guardar Condición'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL / DIÁLOGO DE CONFIGURACIÓN DEL CATÁLOGO EN BD */}
      <AnimatePresence>
        {modalGestionarCatalogo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4 backdrop-blur-xs"
            onClick={e => {
              if (e.target === e.currentTarget) setModalGestionarCatalogo(false)
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header con Pestañas de Administración */}
              <div className="p-5 sm:p-6 border-b border-line bg-surface shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand text-white shadow-xs">
                      <Icon name="database" size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink">Gestión del Odontograma</h3>
                      <p className="text-xs text-muted">
                        Control administrativo de condiciones clínicas y nombres anatómicos FDI.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalGestionarCatalogo(false)}
                    className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink transition-colors cursor-pointer"
                  >
                    <Icon name="x" size={18} />
                  </button>
                </div>

                {/* Tabs de Selección */}
                <div className="inline-flex rounded-xl p-1 bg-alt/50 border border-line text-xs font-semibold w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPestanaGestion('CONDICIONES')}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${pestanaGestion === 'CONDICIONES'
                        ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200/80 shadow-2xs'
                        : 'text-muted hover:text-ink'
                      }`}
                  >
                    <Icon name="tag" size={14} />
                    <span>Condiciones Clínicas ({catalogoCondiciones.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPestanaGestion('PIEZAS')}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${pestanaGestion === 'PIEZAS'
                        ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200/80 shadow-2xs'
                        : 'text-muted hover:text-ink'
                      }`}
                  >
                    <Icon name="tooth" size={14} />
                    <span>Nombres de Piezas Dentales (52)</span>
                  </button>
                </div>
              </div>

              {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
              {pestanaGestion === 'CONDICIONES' ? (
                <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
                  {/* Barra de herramientas: Búsqueda y Botón Nueva */}
                  <div className="flex items-center justify-between gap-3 shrink-0">
                    <SearchInput
                      value={busquedaGestionar}
                      onChange={e => setBusquedaGestionar(e.target.value)}
                      onClear={() => setBusquedaGestionar('')}
                      placeholder="Buscar condición por nombre o código..."
                      className="flex-1"
                    />

                    {isAdmin && onCrearCondicion && !readOnly && (
                      <Button
                        variant="primary"
                        onClick={abrirCrearCondicion}
                        className="shrink-0"
                      >
                        <Icon name="plus" size={16} />
                        <span>Nueva Condición</span>
                      </Button>
                    )}
                  </div>

                  {/* Lista limpia de condiciones con acciones unificadas */}
                  <div className="flex-1 overflow-y-auto rounded-xl border border-line bg-surface [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-line hover:[&::-webkit-scrollbar-thumb]:bg-muted/50 [&::-webkit-scrollbar-thumb]:rounded-full divide-y divide-line min-h-[16rem]">
                    {condicionesGestionar.length > 0 ? (
                      condicionesGestionar.map(c => {
                        const isDeleting = eliminandoCondicionId === c.id

                        return (
                          <div
                            key={c.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-hover/60 transition-colors"
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <span
                                className="size-4.5 rounded-full shrink-0 shadow-2xs ring-1 ring-black/10"
                                style={{ backgroundColor: c.colorHexadecimal }}
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-bold text-ink truncate block">
                                  {c.nombre}
                                </span>
                                {c.descripcion && (
                                  <p className="text-xs text-muted truncate mt-0.5">{c.descripcion}</p>
                                )}
                              </div>
                            </div>

                            {/* Botones de acción estándar unificados (mismo tamaño y estilo) */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isAdmin && onActualizarCondicion && !readOnly && (
                                <Tooltip content="Editar condición">
                                  <button
                                    type="button"
                                    aria-label="Editar condición"
                                    onClick={() => abrirEditarCondicion(c)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:bg-brand/10 hover:text-brand cursor-pointer shadow-2xs"
                                  >
                                    <Icon name="edit" size={15} />
                                  </button>
                                </Tooltip>
                              )}

                              {isAdmin && onEliminarCondicion && !readOnly && (
                                <Tooltip content="Eliminar condición">
                                  <button
                                    type="button"
                                    aria-label="Eliminar condición"
                                    onClick={() => setCondicionAEliminar({ id: c.id, nombre: c.nombre })}
                                    disabled={isDeleting}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger cursor-pointer shadow-2xs"
                                  >
                                    {isDeleting ? (
                                      <Icon name="spinner" size={15} className="animate-spin text-danger" />
                                    ) : (
                                      <Icon name="trash" size={15} />
                                    )}
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="py-12 text-center text-xs text-muted">
                        No se encontraron condiciones para &quot;{busquedaGestionar}&quot;
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* PESTAÑA 2: CONTROL DE NOMBRES DE PIEZAS DENTALES (FDI) */
                <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
                  {/* Filtro y Búsqueda */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                    <SearchInput
                      value={busquedaPiezasGestionar}
                      onChange={e => setBusquedaPiezasGestionar(e.target.value)}
                      onClear={() => setBusquedaPiezasGestionar('')}
                      placeholder="Buscar por número (ej. 16, 21) o nombre anatómico..."
                      className="flex-1"
                    />

                    <div className="inline-flex rounded-xl p-1 bg-alt/40 border border-line text-xs font-semibold shrink-0">
                      {[
                        { id: 'TODAS', label: 'Todas (52)' },
                        { id: 'PERMANENTE', label: 'Adultos (32)' },
                        { id: 'TEMPORAL', label: 'Niños (20)' },
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFiltroDenticionPiezas(f.id as any)}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${filtroDenticionPiezas === f.id
                              ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200/80 shadow-2xs'
                              : 'text-muted hover:text-ink'
                            }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lista de Piezas Dentales con Edición Inline */}
                  <div className="flex-1 overflow-y-auto rounded-xl border border-line bg-surface [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-line hover:[&::-webkit-scrollbar-thumb]:bg-muted/50 [&::-webkit-scrollbar-thumb]:rounded-full divide-y divide-line min-h-[16rem]">
                    {piezasGestionar.length > 0 ? (
                      piezasGestionar.map(p => {
                        const estaEditando = piezaEditandoNumero === p.numeroPieza
                        const nombreVisual = nombresDientesMap[p.numeroPieza] || p.nombre

                        return (
                          <div
                            key={p.numeroPieza}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-hover/60 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="font-extrabold text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 shrink-0">
                                Nº {p.numeroPieza}
                              </span>

                              {estaEditando ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={nombrePiezaEditando}
                                    onChange={e => setNombrePiezaEditando(e.target.value)}
                                    className="flex-1 h-8 rounded-lg border border-brand bg-surface px-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleGuardarNombrePiezaSubmit(p.numeroPieza)
                                      } else if (e.key === 'Escape') {
                                        setPiezaEditandoNumero(null)
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    disabled={guardandoNombrePieza || !nombrePiezaEditando.trim()}
                                    onClick={() => handleGuardarNombrePiezaSubmit(p.numeroPieza)}
                                  >
                                    {guardandoNombrePieza ? (
                                      <Icon name="spinner" size={12} className="animate-spin" />
                                    ) : (
                                      <Icon name="check" size={12} />
                                    )}
                                    <span>Guardar</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={guardandoNombrePieza}
                                    onClick={() => setPiezaEditandoNumero(null)}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              ) : (
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-ink truncate">
                                      {nombreVisual.replace(/\s*\(\d+\)$/, '')}
                                    </span>
                                    <span className="text-[10px] text-muted font-medium bg-alt/50 px-1.5 py-0.5 rounded">
                                      Cuadrante {p.cuadrante} · {p.tipoDenticion === 'NINO' || p.tipoDenticion === 'TEMPORAL' ? 'Temporal (Niño)' : 'Permanente (Adulto)'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {!estaEditando && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isAdmin && onActualizarNombrePieza && !readOnly && (
                                  <Tooltip content="Editar nombre de la pieza">
                                    <button
                                      type="button"
                                      aria-label="Editar nombre de la pieza"
                                      onClick={() => {
                                        setPiezaEditandoNumero(p.numeroPieza)
                                        setNombrePiezaEditando(nombreVisual.replace(/\s*\(\d+\)$/, ''))
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-brand/40 hover:bg-brand/10 hover:text-brand cursor-pointer shadow-2xs"
                                    >
                                      <Icon name="edit" size={15} />
                                    </button>
                                  </Tooltip>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="py-12 text-center text-xs text-muted">
                        No se encontraron piezas dentales para &quot;{busquedaPiezasGestionar}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pie del modal */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-t border-line bg-surface shrink-0 text-xs text-muted">
                <span>
                  {pestanaGestion === 'CONDICIONES'
                    ? `${condicionesGestionar.length} condiciones en catálogo`
                    : `${piezasGestionar.length} piezas dentales FDI listadas`}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setModalGestionarCatalogo(false)}
                >
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIÁLOGO MODAL DE CONFIRMACIÓN PARA ELIMINAR CONDICIÓN */}
      <ConfirmDialog
        open={Boolean(condicionAEliminar)}
        title="¿Eliminar condición clínica?"
        description={`Se eliminará "${condicionAEliminar?.nombre}" de la base de datos de odontograma.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        zIndex="z-[150]"
        cancelLabel="Cancelar"
        onConfirm={confirmarEliminarCondicion}
        onCancel={() => setCondicionAEliminar(null)}
      />
    </div>
  )
}

// -------------------------------------------------------------------------------------------------
// PIEZA DENTAL COMPLETA (NÚMERO + SILUETA ANATÓMICA REALISTA + CÍRCULO 5 CARAS)
// -------------------------------------------------------------------------------------------------
interface PiezaDentalCompletaProps {
  numero: number
  esSuperior: boolean
  hallazgos: PiezaDentalDetalle[]
  filtroEstado: 'TODOS' | 'HALLAZGOS' | 'PRESUPUESTADO' | 'PROGRAMADO' | 'REALIZADO'
  seleccionada: boolean
  caraSeleccionada: SuperficieCara | null
  disabled: boolean
  onClick: () => void
  onSelectCara?: (cara: SuperficieCara) => void
}

function PiezaDentalCompleta({
  numero,
  esSuperior,
  hallazgos,
  filtroEstado,
  seleccionada,
  caraSeleccionada,
  disabled,
  onClick,
  onSelectCara,
}: PiezaDentalCompletaProps) {
  // Hallazgo general de toda la pieza
  const generalH = hallazgos.find(h => !h.superficie || h.superficie === 'GENERAL')
  const esAusente = hallazgos.some(h => h.codigoCondicion === 'AUSENTE')
  const esCorona = hallazgos.some(h => h.codigoCondicion === 'CORONA')
  const colorGeneral = generalH ? generalH.colorHexadecimal : undefined

  // Hallazgos por cara
  const colorOclusal = hallazgos.find(h => h.superficie === 'OCLUSAL')?.colorHexadecimal
  const colorVestibular = hallazgos.find(h => h.superficie === 'VESTIBULAR')?.colorHexadecimal
  const colorLingual = hallazgos.find(h => h.superficie === 'LINGUAL')?.colorHexadecimal
  const colorMesial = hallazgos.find(h => h.superficie === 'MESIAL')?.colorHexadecimal
  const colorDistal = hallazgos.find(h => h.superficie === 'DISTAL')?.colorHexadecimal

  // Filtro de estados reactivo
  const coincideConFiltro = useMemo(() => {
    if (filtroEstado === 'TODOS') return true
    if (filtroEstado === 'HALLAZGOS') {
      return hallazgos.some(h => !h.estado || h.estado === 'HALLAZGO')
    }
    return hallazgos.some(h => h.estado === filtroEstado)
  }, [hallazgos, filtroEstado])

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`group flex flex-col items-center p-1 sm:p-1.5 rounded-xl transition-all cursor-pointer select-none border-2 ${seleccionada
        ? 'border-blue-400 bg-blue-50/25 shadow-2xs'
        : 'border-transparent hover:bg-alt/30'
        } ${disabled ? 'cursor-default pointer-events-none' : ''} ${!coincideConFiltro && filtroEstado !== 'TODOS' ? 'opacity-30 hover:opacity-100' : 'opacity-100'
        }`}
    >
      {/* 1. NÚMERO DE DIENTE */}
      <span
        className={`text-[11px] font-black transition-colors ${seleccionada ? 'text-blue-600' : 'text-ink group-hover:text-blue-600'
          }`}
      >
        {numero}
      </span>

      {/* EN ARCADA SUPERIOR: PRIMERO VA LA SILUETA ANATÓMICA Y LUEGO EL CÍRCULO */}
      {esSuperior ? (
        <>
          <ToothAnatomySvg
            numeroPieza={numero}
            isUpper={true}
            isSelected={seleccionada}
            isMissing={esAusente}
            hasCrown={esCorona}
            condicionColor={colorGeneral}
          />

          <CirculoCarasSvg
            esSuperior={true}
            colorGeneral={colorGeneral}
            colorOclusal={colorOclusal}
            colorVestibular={colorVestibular}
            colorLingual={colorLingual}
            colorMesial={colorMesial}
            colorDistal={colorDistal}
            esAusente={esAusente}
            esCorona={esCorona}
            caraSeleccionada={seleccionada ? caraSeleccionada : null}
            onSelectCara={onSelectCara}
          />
        </>
      ) : (
        <>
          {/* EN ARCADA INFERIOR: PRIMERO VA EL CÍRCULO Y LUEGO LA SILUETA HACIA ABAJO */}
          <CirculoCarasSvg
            esSuperior={false}
            colorGeneral={colorGeneral}
            colorOclusal={colorOclusal}
            colorVestibular={colorVestibular}
            colorLingual={colorLingual}
            colorMesial={colorMesial}
            colorDistal={colorDistal}
            esAusente={esAusente}
            esCorona={esCorona}
            caraSeleccionada={seleccionada ? caraSeleccionada : null}
            onSelectCara={onSelectCara}
          />

          <ToothAnatomySvg
            numeroPieza={numero}
            isUpper={false}
            isSelected={seleccionada}
            isMissing={esAusente}
            hasCrown={esCorona}
            condicionColor={colorGeneral}
          />
        </>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------------------------------
// CÍRCULO GEOMÉTRICO DENTAL DE 5 CARAS
// -------------------------------------------------------------------------------------------------
interface CirculoCarasSvgProps {
  esSuperior: boolean
  colorGeneral?: string
  colorOclusal?: string
  colorVestibular?: string
  colorLingual?: string
  colorMesial?: string
  colorDistal?: string
  esAusente: boolean
  esCorona: boolean
  caraSeleccionada: SuperficieCara | null
  onSelectCara?: (cara: SuperficieCara) => void
}

function CirculoCarasSvg({
  colorGeneral,
  colorOclusal,
  colorVestibular,
  colorLingual,
  colorMesial,
  colorDistal,
  esAusente,
  esCorona,
  caraSeleccionada,
  onSelectCara,
}: CirculoCarasSvgProps) {
  const COLOR_BASE = '#FFFFFF'
  const COLOR_LINEA = '#94A3B8'

  const cVestibular = colorVestibular || colorGeneral || COLOR_BASE
  const cLingual = colorLingual || colorGeneral || COLOR_BASE
  const cMesial = colorMesial || colorGeneral || COLOR_BASE
  const cDistal = colorDistal || colorGeneral || COLOR_BASE
  const cOclusal = colorOclusal || colorGeneral || COLOR_BASE

  return (
    <div className="w-7 h-7 sm:w-8 sm:h-8 relative my-1">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xs">
        {/* CARA SUPERIOR (VESTIBULAR) */}
        <path
          d="M 50 50 L 15 15 A 50 50 0 0 1 85 15 Z"
          fill={cVestibular}
          stroke={caraSeleccionada === 'VESTIBULAR' ? '#2563EB' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'VESTIBULAR' ? '3' : '1.8'}
          onClick={e => {
            e.stopPropagation()
            onSelectCara?.('VESTIBULAR')
          }}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        />

        {/* CARA INFERIOR (LINGUAL / PALATINA) */}
        <path
          d="M 50 50 L 85 85 A 50 50 0 0 1 15 85 Z"
          fill={cLingual}
          stroke={caraSeleccionada === 'LINGUAL' ? '#2563EB' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'LINGUAL' ? '3' : '1.8'}
          onClick={e => {
            e.stopPropagation()
            onSelectCara?.('LINGUAL')
          }}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        />

        {/* CARA IZQUIERDA (MESIAL) */}
        <path
          d="M 50 50 L 15 85 A 50 50 0 0 1 15 15 Z"
          fill={cMesial}
          stroke={caraSeleccionada === 'MESIAL' ? '#2563EB' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'MESIAL' ? '3' : '1.8'}
          onClick={e => {
            e.stopPropagation()
            onSelectCara?.('MESIAL')
          }}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        />

        {/* CARA DERECHA (DISTAL) */}
        <path
          d="M 50 50 L 85 15 A 50 50 0 0 1 85 85 Z"
          fill={cDistal}
          stroke={caraSeleccionada === 'DISTAL' ? '#2563EB' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'DISTAL' ? '3' : '1.8'}
          onClick={e => {
            e.stopPropagation()
            onSelectCara?.('DISTAL')
          }}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        />

        {/* CARA CENTRAL (OCLUSAL / INCISAL) */}
        <circle
          cx="50"
          cy="50"
          r="19"
          fill={cOclusal !== COLOR_BASE ? `${cOclusal}22` : '#FFFFFF'}
          stroke={caraSeleccionada === 'OCLUSAL' ? '#2563EB' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'OCLUSAL' ? '3' : '1.8'}
          onClick={e => {
            e.stopPropagation()
            onSelectCara?.('OCLUSAL')
          }}
          className="cursor-pointer hover:opacity-90 transition-opacity"
        />

        {/* PUNTO SÓLIDO CENTRAL DE CONDICIÓN EN OCLUSAL (EJ. CARIES EN ROJO SEGÚN MOCKUP) */}
        {colorOclusal && (
          <circle
            cx="50"
            cy="50"
            r="7"
            fill={colorOclusal}
            onClick={e => {
              e.stopPropagation()
              onSelectCara?.('OCLUSAL')
            }}
            className="cursor-pointer"
          />
        )}

        {/* CORONA PROTÉSICA */}
        {esCorona && (
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#A855F7"
            strokeWidth="4"
            strokeDasharray="5 3"
          />
        )}

        {/* PIEZA AUSENTE */}
        {esAusente && (
          <g stroke="#EF4444" strokeWidth="5" strokeLinecap="round">
            <line x1="15" y1="15" x2="85" y2="85" />
            <line x1="85" y1="15" x2="15" y2="85" />
          </g>
        )}
      </svg>
    </div>
  )
}

// -------------------------------------------------------------------------------------------------
// SELECTOR CIRCULAR DE CARAS DENTALES (PANEL DERECHO)
// -------------------------------------------------------------------------------------------------
interface SelectorCircularCarasProps {
  caraSeleccionada: SuperficieCara
  onSelectCara: (cara: SuperficieCara) => void
}

export function SelectorCircularCaras({ caraSeleccionada, onSelectCara }: SelectorCircularCarasProps) {
  const COLOR_LINEA = '#64748B'
  const esGeneral = caraSeleccionada === 'GENERAL'

  return (
    <div className="w-14 h-14 relative flex items-center justify-center">
      {/* SVG VISUAL DE LAS CARAS (SIN TAGS <title> NATIVOS) */}
      <svg viewBox="-5 -5 110 110" className="w-full h-full drop-shadow-xs overflow-visible pointer-events-none">
        {/* Halo / Indicador cuando está seleccionada toda la pieza */}
        {esGeneral && (
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="#38BDF8"
            fillOpacity="0.2"
            stroke="#0284C7"
            strokeWidth="2.5"
            strokeDasharray="4 3"
            className="animate-pulse"
          />
        )}

        {/* VESTIBULAR (Arriba) */}
        <path
          d="M 50 50 L 16 16 A 48 48 0 0 1 84 16 Z"
          fill={esGeneral ? '#BAE6FD' : caraSeleccionada === 'VESTIBULAR' ? '#38BDF8' : '#F1F5F9'}
          stroke={caraSeleccionada === 'VESTIBULAR' || esGeneral ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'VESTIBULAR' ? '2.5' : esGeneral ? '1.5' : '1.8'}
        />

        {/* LINGUAL / PALATINA (Abajo) */}
        <path
          d="M 50 50 L 84 84 A 48 48 0 0 1 16 84 Z"
          fill={esGeneral ? '#BAE6FD' : caraSeleccionada === 'LINGUAL' ? '#38BDF8' : '#F1F5F9'}
          stroke={caraSeleccionada === 'LINGUAL' || esGeneral ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'LINGUAL' ? '2.5' : esGeneral ? '1.5' : '1.8'}
        />

        {/* MESIAL (Izquierda) */}
        <path
          d="M 50 50 L 16 84 A 48 48 0 0 1 16 16 Z"
          fill={esGeneral ? '#BAE6FD' : caraSeleccionada === 'MESIAL' ? '#38BDF8' : '#F1F5F9'}
          stroke={caraSeleccionada === 'MESIAL' || esGeneral ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'MESIAL' ? '2.5' : esGeneral ? '1.5' : '1.8'}
        />

        {/* DISTAL (Derecha) */}
        <path
          d="M 50 50 L 84 16 A 48 48 0 0 1 84 84 Z"
          fill={esGeneral ? '#BAE6FD' : caraSeleccionada === 'DISTAL' ? '#38BDF8' : '#F1F5F9'}
          stroke={caraSeleccionada === 'DISTAL' || esGeneral ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'DISTAL' ? '2.5' : esGeneral ? '1.5' : '1.8'}
        />

        {/* OCLUSAL (Centro) */}
        <circle
          cx="50"
          cy="50"
          r="18"
          fill={esGeneral ? '#0284C7' : caraSeleccionada === 'OCLUSAL' ? '#0284C7' : '#FFFFFF'}
          stroke={caraSeleccionada === 'OCLUSAL' || esGeneral ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'OCLUSAL' ? '2.5' : esGeneral ? '2' : '1.8'}
        />
      </svg>

      {/* OVERLAY DE INTERACCIÓN CON TOOLTIPS MODERNOS DEL SISTEMA (SIN TITLES NATIVOS) */}
      <div className="absolute inset-0 z-10">
        {/* VESTIBULAR (Arriba) */}
        <Tooltip content="Cara Vestibular (Arriba)" side="top" className="absolute top-0 inset-x-2 h-4.5">
          <button
            type="button"
            aria-label="Cara Vestibular (Arriba)"
            onClick={() => onSelectCara('VESTIBULAR')}
            className="w-full h-full cursor-pointer rounded-t-full hover:bg-sky-400/20 transition-colors focus:outline-none"
          />
        </Tooltip>

        {/* LINGUAL / PALATINA (Abajo) */}
        <Tooltip content="Cara Lingual / Palatina (Abajo)" side="bottom" className="absolute bottom-0 inset-x-2 h-4.5">
          <button
            type="button"
            aria-label="Cara Lingual o Palatina (Abajo)"
            onClick={() => onSelectCara('LINGUAL')}
            className="w-full h-full cursor-pointer rounded-b-full hover:bg-sky-400/20 transition-colors focus:outline-none"
          />
        </Tooltip>

        {/* MESIAL (Izquierda) */}
        <Tooltip content="Cara Mesial (Izquierda)" side="left" className="absolute left-0 inset-y-2 w-4.5">
          <button
            type="button"
            aria-label="Cara Mesial (Izquierda)"
            onClick={() => onSelectCara('MESIAL')}
            className="w-full h-full cursor-pointer rounded-l-full hover:bg-sky-400/20 transition-colors focus:outline-none"
          />
        </Tooltip>

        {/* DISTAL (Derecha) */}
        <Tooltip content="Cara Distal (Derecha)" side="right" className="absolute right-0 inset-y-2 w-4.5">
          <button
            type="button"
            aria-label="Cara Distal (Derecha)"
            onClick={() => onSelectCara('DISTAL')}
            className="w-full h-full cursor-pointer rounded-r-full hover:bg-sky-400/20 transition-colors focus:outline-none"
          />
        </Tooltip>

        {/* OCLUSAL (Centro) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Tooltip content="Cara Oclusal (Centro)" side="top">
            <button
              type="button"
              aria-label="Cara Oclusal (Centro)"
              onClick={() => onSelectCara('OCLUSAL')}
              className="w-5 h-5 rounded-full pointer-events-auto cursor-pointer hover:ring-2 hover:ring-sky-400/50 transition-all focus:outline-none"
            />
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
