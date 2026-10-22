import { useMemo, useState } from 'react'
import { Button, Icon, Badge } from '@/shared/components/ui'
import type {
  CondicionOdontograma,
  CrearCondicionRequest,
  OdontogramaResponse,
  PiezaDentalDetalle,
} from '../api/clinicalApi'
import { CONDICIONES_DEFAULT } from '../api/clinicalApi'
import { ToothAnatomySvg } from './ToothAnatomySvg'

export type EstadoTratamiento = 'HALLAZGO' | 'PRESUPUESTADO' | 'PROGRAMADO' | 'REALIZADO'

interface OdontogramViewProps {
  odontograma: OdontogramaResponse | null
  condiciones: CondicionOdontograma[]
  readOnly?: boolean
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

const NOMBRES_DIENTES: Record<number, string> = {
  // Adultos
  18: 'Tercer molar sup. der. (18)',
  17: 'Segundo molar sup. der. (17)',
  16: 'Primer molar sup. der. (16)',
  15: 'Segundo premolar sup. der. (15)',
  14: 'Primer premolar sup. der. (14)',
  13: 'Canino sup. der. (13)',
  12: 'Incisivo lateral sup. der. (12)',
  11: 'Incisivo central sup. der. (11)',
  21: 'Incisivo central sup. izq. (21)',
  22: 'Incisivo lateral sup. izq. (22)',
  23: 'Canino sup. izq. (23)',
  24: 'Primer premolar sup. izq. (24)',
  25: 'Segundo premolar sup. izq. (25)',
  26: 'Primer molar sup. izq. (26)',
  27: 'Segundo molar sup. izq. (27)',
  28: 'Tercer molar sup. izq. (28)',
  48: 'Tercer molar inf. der. (48)',
  47: 'Segundo molar inf. der. (47)',
  46: 'Primer molar inf. der. (46)',
  45: 'Segundo premolar inf. der. (45)',
  44: 'Primer premolar inf. der. (44)',
  43: 'Canino inf. der. (43)',
  42: 'Incisivo lateral inf. der. (42)',
  41: 'Incisivo central inf. der. (41)',
  31: 'Incisivo central inf. izq. (31)',
  32: 'Incisivo lateral inf. izq. (32)',
  33: 'Canino inf. izq. (33)',
  34: 'Primer premolar inf. izq. (34)',
  35: 'Segundo premolar inf. izq. (35)',
  36: 'Primer molar inf. izq. (36)',
  37: 'Segundo molar inf. izq. (37)',
  38: 'Tercer molar inf. izq. (38)',
  // Niños / Deciduos
  55: 'Segundo molar temporal sup. der. (55)',
  54: 'Primer molar temporal sup. der. (54)',
  53: 'Canino temporal sup. der. (53)',
  52: 'Incisivo lateral temporal sup. der. (52)',
  51: 'Incisivo central temporal sup. der. (51)',
  61: 'Incisivo central temporal sup. izq. (61)',
  62: 'Incisivo lateral temporal sup. izq. (62)',
  63: 'Canino temporal sup. izq. (63)',
  64: 'Primer molar temporal sup. izq. (64)',
  65: 'Segundo molar temporal sup. izq. (65)',
  85: 'Segundo molar temporal inf. der. (85)',
  84: 'Primer molar temporal inf. der. (84)',
  83: 'Canino temporal inf. der. (83)',
  82: 'Incisivo lateral temporal inf. der. (82)',
  81: 'Incisivo central temporal inf. der. (81)',
  71: 'Incisivo central temporal inf. izq. (71)',
  72: 'Incisivo lateral temporal inf. izq. (72)',
  73: 'Canino temporal inf. izq. (73)',
  74: 'Primer molar temporal inf. izq. (74)',
  75: 'Segundo molar temporal inf. izq. (75)',
}

const PALETA_COLORES_CLINICOS = [
  { hex: '#EF4444', label: 'Rojo (Caries / Alerta)' },
  { hex: '#3B82F6', label: 'Azul (Restauración)' },
  { hex: '#A855F7', label: 'Púrpura (Corona / Prótesis)' },
  { hex: '#64748B', label: 'Gris (Pieza Ausente)' },
  { hex: '#F97316', label: 'Naranja (Endodoncia)' },
  { hex: '#06B6D4', label: 'Cian (Sellante)' },
  { hex: '#E11D48', label: 'Carmesí (Fractura / Trauma)' },
  { hex: '#8B5CF6', label: 'Violeta (Implante)' },
  { hex: '#F59E0B', label: 'Ámbar (Prótesis Removible)' },
  { hex: '#EC4899', label: 'Rosa (Ortodoncia / Retenido)' },
  { hex: '#10B981', label: 'Verde (Sano / Finalizado)' },
]

export function OdontogramView({
  odontograma,
  condiciones,
  readOnly = false,
  guardando = false,
  onActualizarPieza,
  onLimpiarPieza,
  onCrearCondicion,
}: OdontogramViewProps) {
  // Asegurar que siempre existan condiciones activas
  const catalogoCondiciones = useMemo(() => {
    return condiciones && condiciones.length > 0 ? condiciones : CONDICIONES_DEFAULT
  }, [condiciones])

  const [tipoDenticion, setTipoDenticion] = useState<'ADULTO' | 'NINO'>('ADULTO')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'HALLAZGOS' | 'PRESUPUESTADO' | 'PROGRAMADO' | 'REALIZADO'>('TODOS')
  const [piezaSeleccionada, setPiezaSeleccionada] = useState<number>(16)
  const [caraSeleccionada, setCaraSeleccionada] = useState<SuperficieCara>('OCLUSAL')
  const [condicionId, setCondicionId] = useState<number>(() => catalogoCondiciones[0]?.id || 1)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoTratamiento>('HALLAZGO')
  const [busquedaCondicion, setBusquedaCondicion] = useState('')
  const [observacion, setObservacion] = useState('')
  const [procesando, setProcesando] = useState(false)

  // Modal para agregar nueva condición
  const [modalCrearCondicion, setModalCrearCondicion] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoCodigo, setNuevoCodigo] = useState('')
  const [nuevoColor, setNuevoColor] = useState('#3B82F6')
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')
  const [guardandoCondicion, setGuardandoCondicion] = useState(false)

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

  // Conteos acumulados por estado del tratamiento
  const conteos = useMemo(() => {
    let hallazgos = 0
    let presupuestado = 0
    let programado = 0
    let realizado = 0
    if (odontograma?.piezas) {
      for (const p of odontograma.piezas) {
        const est = p.estado || 'HALLAZGO'
        if (est === 'PRESUPUESTADO') presupuestado++
        else if (est === 'PROGRAMADO') programado++
        else if (est === 'REALIZADO') realizado++
        else hallazgos++
      }
    }
    return {
      total: odontograma?.piezas?.length || 0,
      hallazgos,
      presupuestado,
      programado,
      realizado,
    }
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

  const seleccionarPiezaYActualizarForm = (num: number, cara?: SuperficieCara) => {
    setPiezaSeleccionada(num)
    if (cara) setCaraSeleccionada(cara)
    const hallazgos = mapaHallazgos.get(num) || []
    if (hallazgos.length > 0) {
      const h = cara ? hallazgos.find(item => item.superficie === cara) || hallazgos[0] : hallazgos[0]
      setCondicionId(h.idCondicion)
      setObservacion(h.observacion || '')
      if (h.estado) {
        setEstadoSeleccionado(h.estado)
      }
      if (!cara && h.superficie) {
        setCaraSeleccionada(h.superficie as SuperficieCara)
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
    const condicionObj = catalogoCondiciones.find(c => c.id === condicionId)
    setProcesando(true)
    try {
      await onActualizarPieza(
        piezaSeleccionada,
        caraSeleccionada === 'GENERAL' ? undefined : caraSeleccionada,
        condicionId,
        observacion.trim() || undefined,
        estadoSeleccionado,
        condicionObj?.codigo,
      )
    } finally {
      setProcesando(false)
    }
  }

  const handleLimpiar = async () => {
    if (!piezaSeleccionada || readOnly) return
    setProcesando(true)
    try {
      await onLimpiarPieza(piezaSeleccionada)
      setObservacion('')
    } finally {
      setProcesando(false)
    }
  }

  const handleLimpiarSuperficie = async (superficie?: string) => {
    if (!piezaSeleccionada || readOnly) return
    setProcesando(true)
    try {
      await onLimpiarPieza(piezaSeleccionada, superficie)
    } finally {
      setProcesando(false)
    }
  }

  const handleCambiarEstadoRapido = async (h: PiezaDentalDetalle, nuevoEstado: EstadoTratamiento) => {
    if (readOnly) return
    setProcesando(true)
    try {
      await onActualizarPieza(
        h.numeroPieza,
        h.superficie === 'GENERAL' ? undefined : h.superficie,
        h.idCondicion,
        h.observacion || undefined,
        nuevoEstado,
        h.codigoCondicion,
      )
    } finally {
      setProcesando(false)
    }
  }

  const handleCrearNuevaCondicionSubmit = async () => {
    if (!nuevoNombre.trim() || !onCrearCondicion) return
    setGuardandoCondicion(true)
    try {
      const nueva = await onCrearCondicion({
        nombre: nuevoNombre.trim(),
        codigo: nuevoCodigo.trim() || undefined,
        descripcion: nuevaDescripcion.trim() || undefined,
        colorHexadecimal: nuevoColor,
      })
      setCondicionId(nueva.id)
      setModalCrearCondicion(false)
      setNuevoNombre('')
      setNuevoCodigo('')
      setNuevaDescripcion('')
    } finally {
      setGuardandoCondicion(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">
      {/* HEADER DE SUBMÓDULO: DENTICIÓN ADULTO/NIÑO Y FILTROS INTERACTIVOS */}
      <div className="border-b border-line bg-alt/20 p-4 sm:p-5">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-brand/10 text-brand">
                <Icon name="tooth" size={18} />
              </span>
              <h2 className="text-base font-bold text-ink">Historial Bucodental y Odontograma Clínico</h2>
            </div>
            <p className="text-xs text-muted">
              Registra patologías, fases de tratamiento y procedimientos en tiempo real sobre la arcada anatómica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* SELECTOR DE DENTICIÓN: ADULTO / PEDIÁTRICO */}
            <div className="inline-flex rounded-xl p-1 bg-surface border border-line shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setTipoDenticion('ADULTO')
                  setPiezaSeleccionada(16)
                }}
                className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  tipoDenticion === 'ADULTO'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-ink-soft hover:text-ink hover:bg-hover'
                }`}
              >
                Adulto (32 piezas)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoDenticion('NINO')
                  setPiezaSeleccionada(55)
                }}
                className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  tipoDenticion === 'NINO'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-ink-soft hover:text-ink hover:bg-hover'
                }`}
              >
                Pediátrico (20 piezas)
              </button>
            </div>

            {/* FILTROS INTERACTIVOS CON ACCIONES DE ESTADO */}
            <div className="flex items-center gap-1.5 border-l border-line pl-3 overflow-x-auto">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider hidden sm:inline mr-1">
                Filtros:
              </span>
              <button
                type="button"
                onClick={() => setFiltroEstado('TODOS')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                  filtroEstado === 'TODOS'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-surface text-ink-soft border-line hover:bg-hover'
                }`}
              >
                Todos ({conteos.total})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado(filtroEstado === 'HALLAZGOS' ? 'TODOS' : 'HALLAZGOS')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                  filtroEstado === 'HALLAZGOS'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-surface text-ink-soft border-line hover:bg-hover'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Hallazgos ({conteos.hallazgos})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado(filtroEstado === 'PRESUPUESTADO' ? 'TODOS' : 'PRESUPUESTADO')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                  filtroEstado === 'PRESUPUESTADO'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-surface text-ink-soft border-line hover:bg-hover'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Presupuestado ({conteos.presupuestado})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado(filtroEstado === 'PROGRAMADO' ? 'TODOS' : 'PROGRAMADO')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                  filtroEstado === 'PROGRAMADO'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-surface text-ink-soft border-line hover:bg-hover'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Programado ({conteos.programado})</span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado(filtroEstado === 'REALIZADO' ? 'TODOS' : 'REALIZADO')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                  filtroEstado === 'REALIZADO'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-surface text-ink-soft border-line hover:bg-hover'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Realizado ({conteos.realizado})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: DOS COLUMNAS (ODONTOGRAMA VISUAL IZQUIERDA + PANEL DE REGISTRO DERECHA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line">
        {/* COLUMNA IZQUIERDA: ODONTOGRAMA ANATÓMICO (8 COLS) */}
        <div className="lg:col-span-8 p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[660px] space-y-6">
            {/* LEYENDA CLÍNICA RÁPIDA */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted mr-1">Condiciones:</span>
                {catalogoCondiciones.slice(0, 7).map(c => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-alt/50 border border-line/40"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: c.colorHexadecimal }}
                    />
                    <span>{c.nombre}</span>
                  </div>
                ))}
              </div>

              {onCrearCondicion && !readOnly && (
                <button
                  type="button"
                  onClick={() => setModalCrearCondicion(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline px-2.5 py-1 rounded-lg bg-brand/5 border border-brand/20 transition-all hover:bg-brand/10"
                >
                  <Icon name="plus" size={12} />
                  + Nueva Condición
                </button>
              )}
            </div>

            {/* ARCADA SUPERIOR (MAXILAR) */}
            <div>
              <div className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-muted">
                Arcada Superior (Maxilar)
              </div>
              <div className="flex items-center justify-center gap-4">
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
                        />
                      ))}
                    </div>
                    {/* Línea media vertical */}
                    <div className="w-px h-32 bg-line self-center" />
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
                        />
                      ))}
                    </div>
                    <div className="w-px h-32 bg-line self-center" />
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
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SEPARADOR DE OCLUSIÓN / LÍNEA MEDIA HORIZONTAL */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-line" />
              </div>
              <div className="relative bg-surface px-4 py-1 rounded-full border border-line text-[10px] font-bold text-muted uppercase tracking-wider">
                Oclusión / Línea Media
              </div>
            </div>

            {/* ARCADA INFERIOR (MANDÍBULA) */}
            <div>
              <div className="flex items-center justify-center gap-4">
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
                        />
                      ))}
                    </div>
                    <div className="w-px h-32 bg-line self-center" />
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
                        />
                      ))}
                    </div>
                    <div className="w-px h-32 bg-line self-center" />
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
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-widest text-muted">
                Arcada Inferior (Mandíbula)
              </div>
            </div>

            {/* BANDEJA / LISTADO INTERACTIVO DE TRATAMIENTOS FILTRADOS */}
            <div className="mt-8 pt-5 border-t border-line">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">
                    Tratamientos y Hallazgos Odontológicos
                  </span>
                  <Badge tone={filtroEstado === 'REALIZADO' ? 'blue' : filtroEstado === 'PRESUPUESTADO' ? 'purple' : filtroEstado === 'PROGRAMADO' ? 'green' : filtroEstado === 'HALLAZGOS' ? 'red' : 'gray'}>
                    {filtroEstado === 'TODOS' ? 'Todos los Estados' : filtroEstado} ({hallazgosFiltrados.length})
                  </Badge>
                </div>
                {filtroEstado !== 'TODOS' && (
                  <button
                    type="button"
                    onClick={() => setFiltroEstado('TODOS')}
                    className="text-xs text-brand hover:underline font-semibold"
                  >
                    Ver todos los estados
                  </button>
                )}
              </div>

              {hallazgosFiltrados.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {hallazgosFiltrados.map(h => {
                    const est = h.estado || 'HALLAZGO'
                    return (
                      <div
                        key={h.id || `${h.numeroPieza}-${h.superficie}`}
                        onClick={() => seleccionarPiezaYActualizarForm(h.numeroPieza, h.superficie as SuperficieCara)}
                        className="group flex items-start justify-between p-3 rounded-xl border border-line bg-surface hover:border-brand/40 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-brand">#{h.numeroPieza}</span>
                            <span className="text-[11px] font-semibold text-ink">
                              {h.superficie && h.superficie !== 'GENERAL' ? `Cara ${h.superficie}` : 'Toda la pieza'}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${h.colorHexadecimal}20`,
                                color: h.colorHexadecimal,
                                border: `1px solid ${h.colorHexadecimal}40`,
                              }}
                            >
                              {h.nombreCondicion}
                            </span>
                          </div>
                          {h.observacion && (
                            <p className="text-[11px] text-muted italic line-clamp-1">
                              &ldquo;{h.observacion}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* ACCIONES DE ESTADO RÁPIDAS */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          {est !== 'PRESUPUESTADO' && (
                            <button
                              type="button"
                              title="Mover a Presupuestado"
                              disabled={readOnly || procesando}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCambiarEstadoRapido(h, 'PRESUPUESTADO')
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                            >
                              Presupuestar
                            </button>
                          )}
                          {est !== 'PROGRAMADO' && (
                            <button
                              type="button"
                              title="Mover a Programado"
                              disabled={readOnly || procesando}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCambiarEstadoRapido(h, 'PROGRAMADO')
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                              Programar
                            </button>
                          )}
                          {est !== 'REALIZADO' && (
                            <button
                              type="button"
                              title="Marcar como Realizado"
                              disabled={readOnly || procesando}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCambiarEstadoRapido(h, 'REALIZADO')
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              ✓ Realizado
                            </button>
                          )}
                          <button
                            type="button"
                            title="Eliminar hallazgo"
                            disabled={readOnly || procesando}
                            onClick={(e) => {
                              e.stopPropagation()
                              onLimpiarPieza(h.numeroPieza, h.superficie === 'GENERAL' ? undefined : h.superficie)
                            }}
                            className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted rounded-xl border border-dashed border-line bg-alt/10">
                  No hay piezas registradas en el estado &ldquo;{filtroEstado}&rdquo;.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PANEL DE ACCIÓN Y REGISTRO (4 COLS) */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-alt/5 flex flex-col justify-between">
          <div className="space-y-5">
            {/* 1. SELECCIÓN DE PIEZA Y CARA DENTAL */}
            <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Pieza Seleccionada
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-brand">#{piezaSeleccionada}</span>
                    <Badge tone="blue">
                      {piezaSeleccionada >= 51 ? 'Temporal / Deciduo' : 'Permanente'}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink font-medium mt-1">
                    {NOMBRES_DIENTES[piezaSeleccionada] || `Pieza #${piezaSeleccionada}`}
                  </p>
                </div>

                {/* SELECTOR INTERACTIVO DE CARAS DENTALES */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                    Cara: <strong className="text-brand">{caraSeleccionada}</strong>
                  </span>
                  <SelectorCircularCaras
                    caraSeleccionada={caraSeleccionada}
                    onSelectCara={cara => setCaraSeleccionada(cara)}
                  />
                </div>
              </div>

              {/* Botón rápido para Toda la Pieza */}
              <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                <span className="text-muted">Área de afección:</span>
                <button
                  type="button"
                  onClick={() => setCaraSeleccionada(caraSeleccionada === 'GENERAL' ? 'OCLUSAL' : 'GENERAL')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                    caraSeleccionada === 'GENERAL'
                      ? 'bg-brand/10 border-brand text-brand'
                      : 'bg-alt/40 border-line text-ink-soft hover:bg-hover'
                  }`}
                >
                  {caraSeleccionada === 'GENERAL' ? '✓ Toda la pieza' : 'Marcar toda la pieza'}
                </button>
              </div>
            </div>

            {/* 2. CATÁLOGO / CONDICIÓN CON BUSCADOR Y CREACIÓN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Icon name="search" size={13} className="text-brand" />
                  Elige la Condición o Tratamiento:
                </label>
                <div className="flex items-center gap-1.5">
                  {onCrearCondicion && !readOnly && (
                    <button
                      type="button"
                      onClick={() => setModalCrearCondicion(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline px-2 py-0.5 rounded-md bg-brand/5 border border-brand/20 transition-all hover:bg-brand/10"
                    >
                      <Icon name="plus" size={10} />
                      + Nueva
                    </button>
                  )}
                  {busquedaCondicion && (
                    <button
                      type="button"
                      onClick={() => setBusquedaCondicion('')}
                      className="text-[11px] text-muted hover:underline font-medium"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Input buscador que filtra la lista de inmediato */}
              <div className="relative">
                <input
                  type="text"
                  value={busquedaCondicion}
                  onChange={e => setBusquedaCondicion(e.target.value)}
                  placeholder="Buscar patología o tratamiento..."
                  className="w-full h-9 rounded-xl border border-line bg-surface px-3 py-1 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
              </div>

              {/* Lista scrolleable de condiciones filtradas */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 space-y-1">
                {condicionesFiltradas.length > 0 ? (
                  condicionesFiltradas.map(c => {
                    const isSelected = condicionId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCondicionId(c.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand text-white shadow-xs font-bold'
                            : 'text-ink hover:bg-hover'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: c.colorHexadecimal }}
                          />
                          <span>{c.nombre}</span>
                        </div>
                        {isSelected && <Icon name="check" size={13} className="text-white" />}
                      </button>
                    )
                  })
                ) : (
                  <div className="py-4 text-center text-xs text-muted">
                    No se encontraron coincidencias para &quot;{busquedaCondicion}&quot;
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
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                    estadoSeleccionado === 'HALLAZGO'
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
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                    estadoSeleccionado === 'PRESUPUESTADO'
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
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                    estadoSeleccionado === 'PROGRAMADO'
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
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                    estadoSeleccionado === 'REALIZADO'
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

            {/* 5. HISTORIAL DE HALLAZGOS EN ESTA PIEZA */}
            {hallazgosPiezaActual.length > 0 && (
              <div className="rounded-xl border border-line/60 bg-surface p-3 space-y-2">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                  Hallazgos registrados en #{piezaSeleccionada}:
                </span>
                <div className="space-y-1.5">
                  {hallazgosPiezaActual.map(h => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-alt/30 border border-line/40"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: h.colorHexadecimal }}
                        />
                        <div>
                          <strong className="text-ink">{h.nombreCondicion}</strong>
                          <span className="text-muted ml-1.5 text-[11px]">
                            ({h.superficie || 'General'})
                          </span>
                          <span className="ml-1 text-[10px] font-bold uppercase text-brand">
                            [{h.estado || 'HALLAZGO'}]
                          </span>
                        </div>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleLimpiarSuperficie(h.superficie)}
                          className="text-danger hover:text-danger/80 p-1"
                          title="Eliminar este hallazgo"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="pt-5 border-t border-line mt-4 space-y-2">
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
              Guardar Hallazgo en #{piezaSeleccionada}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-center text-xs text-muted hover:text-danger"
              disabled={readOnly || procesando || guardando || hallazgosPiezaActual.length === 0}
              onClick={handleLimpiar}
            >
              <Icon name="trash" size={14} />
              Limpiar toda la pieza #{piezaSeleccionada}
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL / DIÁLOGO PARA CREAR NUEVA CONDICIÓN CLÍNICA */}
      {modalCrearCondicion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-brand/10 text-brand">
                  <Icon name="plus" size={18} />
                </span>
                <h3 className="text-base font-bold text-ink">Nueva Condición o Tratamiento</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCrearCondicion(false)}
                className="p-1 rounded-lg text-muted hover:text-ink hover:bg-hover"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-ink block mb-1">Nombre de la Condición o Tratamiento *</label>
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={e => {
                    const val = e.target.value
                    setNuevoNombre(val)
                    if (!nuevoCodigo || nuevoCodigo === nuevoNombre.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_')) {
                      setNuevoCodigo(val.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_'))
                    }
                  }}
                  placeholder="Ej. Blanqueamiento Dental, Carilla Estética..."
                  className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-xs text-ink placeholder:text-muted focus:ring-2 focus:ring-brand/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">Código Identificador (Opcional)</label>
                <input
                  type="text"
                  value={nuevoCodigo}
                  onChange={e => setNuevoCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                  placeholder="Ej. BLANQUEAMIENTO"
                  className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-xs text-ink placeholder:text-muted focus:ring-2 focus:ring-brand/40 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1.5">Color Clínico Representativo</label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {PALETA_COLORES_CLINICOS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.label}
                      onClick={() => setNuevoColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        nuevoColor === c.hex ? 'scale-125 ring-2 ring-brand ring-offset-2' : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={nuevoColor}
                    onChange={e => setNuevoColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-line"
                  />
                  <input
                    type="text"
                    value={nuevoColor}
                    onChange={e => setNuevoColor(e.target.value)}
                    className="h-8 w-24 rounded-lg border border-line bg-surface px-2 text-xs font-mono text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">Descripción / Indicación Clínica</label>
                <textarea
                  value={nuevaDescripcion}
                  onChange={e => setNuevaDescripcion(e.target.value)}
                  placeholder="Breve descripción o protocolo clínico del procedimiento..."
                  rows={2}
                  className="w-full rounded-xl border border-line bg-surface p-2 text-xs text-ink placeholder:text-muted focus:ring-2 focus:ring-brand/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalCrearCondicion(false)}
                disabled={guardandoCondicion}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!nuevoNombre.trim() || guardandoCondicion}
                onClick={handleCrearNuevaCondicionSubmit}
              >
                {guardandoCondicion ? 'Guardando...' : 'Crear Condición'}
              </Button>
            </div>
          </div>
        </div>
      )}
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

  const tieneCaries = hallazgos.some(h => h.codigoCondicion === 'CARIES')

  // Filtro de estados reactivo
  const coincideConFiltro = useMemo(() => {
    if (filtroEstado === 'TODOS') return true
    if (filtroEstado === 'HALLAZGOS') {
      return hallazgos.some(h => !h.estado || h.estado === 'HALLAZGO')
    }
    return hallazgos.some(h => h.estado === filtroEstado)
  }, [hallazgos, filtroEstado])

  const tieneRealizado = hallazgos.some(h => h.estado === 'REALIZADO')
  const tienePresupuestado = hallazgos.some(h => h.estado === 'PRESUPUESTADO')
  const tieneProgramado = hallazgos.some(h => h.estado === 'PROGRAMADO')

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`group flex flex-col items-center p-1 rounded-xl transition-all cursor-pointer select-none ${
        seleccionada
          ? 'ring-2 ring-brand bg-brand/5 shadow-xs'
          : 'hover:bg-alt/40'
      } ${disabled ? 'cursor-default' : ''} ${
        !coincideConFiltro && filtroEstado !== 'TODOS' ? 'opacity-30 hover:opacity-100' : 'opacity-100'
      }`}
    >
      {/* 1. NÚMERO DE DIENTE */}
      <span
        className={`text-[11px] font-black transition-colors ${
          seleccionada ? 'text-brand underline' : 'text-ink group-hover:text-brand'
        }`}
      >
        {numero}
      </span>

      {/* BADGE DE FASE O ÍCONO DE ALERTA RÁPIDA */}
      <div className="h-3.5 flex items-center justify-center">
        {tieneRealizado ? (
          <span className="text-[10px] text-blue-600 font-black" title="Tratamiento Realizado">✓</span>
        ) : tieneProgramado ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" title="Tratamiento Programado" />
        ) : tienePresupuestado ? (
          <span className="w-2 h-2 rounded-full bg-purple-500 shadow-2xs" title="En Presupuesto" />
        ) : tieneCaries ? (
          <span className="text-[11px] text-danger font-black animate-pulse" title="Caries activa">★</span>
        ) : hallazgos.length > 0 ? (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: hallazgos[0].colorHexadecimal || '#3B82F6' }}
          />
        ) : null}
      </div>

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
          stroke={caraSeleccionada === 'VESTIBULAR' ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'VESTIBULAR' ? '3.5' : '1.8'}
        />

        {/* CARA INFERIOR (LINGUAL / PALATINA) */}
        <path
          d="M 50 50 L 85 85 A 50 50 0 0 1 15 85 Z"
          fill={cLingual}
          stroke={caraSeleccionada === 'LINGUAL' ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'LINGUAL' ? '3.5' : '1.8'}
        />

        {/* CARA IZQUIERDA (MESIAL) */}
        <path
          d="M 50 50 L 15 85 A 50 50 0 0 1 15 15 Z"
          fill={cMesial}
          stroke={caraSeleccionada === 'MESIAL' ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'MESIAL' ? '3.5' : '1.8'}
        />

        {/* CARA DERECHA (DISTAL) */}
        <path
          d="M 50 50 L 85 15 A 50 50 0 0 1 85 85 Z"
          fill={cDistal}
          stroke={caraSeleccionada === 'DISTAL' ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'DISTAL' ? '3.5' : '1.8'}
        />

        {/* CARA CENTRAL (OCLUSAL / INCISAL) */}
        <circle
          cx="50"
          cy="50"
          r="19"
          fill={cOclusal}
          stroke={caraSeleccionada === 'OCLUSAL' ? '#0284C7' : COLOR_LINEA}
          strokeWidth={caraSeleccionada === 'OCLUSAL' ? '3.5' : '1.8'}
        />

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

function SelectorCircularCaras({ caraSeleccionada, onSelectCara }: SelectorCircularCarasProps) {
  const COLOR_LINEA = '#64748B'

  return (
    <div className="w-14 h-14 relative" title="Haz clic en cualquier cara para seleccionarla">
      <svg viewBox="0 0 100 100" className="w-full h-full cursor-pointer drop-shadow-xs">
        {/* VESTIBULAR (Arriba) */}
        <path
          d="M 50 50 L 15 15 A 50 50 0 0 1 85 15 Z"
          fill={caraSeleccionada === 'VESTIBULAR' ? '#38BDF8' : '#F1F5F9'}
          stroke={COLOR_LINEA}
          strokeWidth="2"
          className="hover:opacity-80 transition-opacity"
          onClick={() => onSelectCara('VESTIBULAR')}
        />

        {/* LINGUAL / PALATINA (Abajo) */}
        <path
          d="M 50 50 L 85 85 A 50 50 0 0 1 15 85 Z"
          fill={caraSeleccionada === 'LINGUAL' ? '#38BDF8' : '#F1F5F9'}
          stroke={COLOR_LINEA}
          strokeWidth="2"
          className="hover:opacity-80 transition-opacity"
          onClick={() => onSelectCara('LINGUAL')}
        />

        {/* MESIAL (Izquierda) */}
        <path
          d="M 50 50 L 15 85 A 50 50 0 0 1 15 15 Z"
          fill={caraSeleccionada === 'MESIAL' ? '#38BDF8' : '#F1F5F9'}
          stroke={COLOR_LINEA}
          strokeWidth="2"
          className="hover:opacity-80 transition-opacity"
          onClick={() => onSelectCara('MESIAL')}
        />

        {/* DISTAL (Derecha) */}
        <path
          d="M 50 50 L 85 15 A 50 50 0 0 1 85 85 Z"
          fill={caraSeleccionada === 'DISTAL' ? '#38BDF8' : '#F1F5F9'}
          stroke={COLOR_LINEA}
          strokeWidth="2"
          className="hover:opacity-80 transition-opacity"
          onClick={() => onSelectCara('DISTAL')}
        />

        {/* OCLUSAL (Centro) */}
        <circle
          cx="50"
          cy="50"
          r="18"
          fill={caraSeleccionada === 'OCLUSAL' ? '#0284C7' : '#FFFFFF'}
          stroke={COLOR_LINEA}
          strokeWidth="2"
          className="hover:opacity-80 transition-opacity"
          onClick={() => onSelectCara('OCLUSAL')}
        />
      </svg>
    </div>
  )
}
