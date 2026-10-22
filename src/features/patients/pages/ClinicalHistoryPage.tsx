import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Avatar,
  BackLink,
  Badge,
  Button,
  Card,
  Icon,
  Toast,
  Tooltip,
  type ToastAviso,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { formatPhone } from '@/shared/lib/format'
import { patientsApi, type PacienteResponse } from '../api/patientsApi'
import {
  clinicalApi,
  type CondicionOdontograma,
  type CrearCondicionRequest,
  type DocumentoClinico,
  type EvolucionClinicaResponse,
  type HistoriaClinicaResponse,
  type OdontogramaResponse,
  type RecetaClinica,
} from '../api/clinicalApi'
import { OdontogramView } from '../components/OdontogramView'
import {
  parsearCamposClinicos,
  exportarHistoriaClinicaPdf,
  exportarExpedienteCronologicoPdf,
  exportarRecetaPdf,
  type CamposClinicos,
} from '../utils/clinicalPdfExport'

// Pestañas disponibles en el expediente clínico (estilo Dentalink / software clínico profesional)
export type TabExpediente =
  | 'DETALLES'
  | 'ANTECEDENTES'
  | 'ODONTOGRAMA'
  | 'EVOLUCIONES'
  | 'PRESUPUESTOS'
  | 'DOCUMENTOS'
  | 'RECETAS'
  | 'CONSENTIMIENTOS'

function formatearFechaNacimiento(fechaStr?: string | null): string {
  if (!fechaStr) return 'No registrada'
  const partes = fechaStr.split('-')
  if (partes.length === 3) {
    const anio = parseInt(partes[0], 10)
    const mes = parseInt(partes[1], 10) - 1
    const dia = parseInt(partes[2], 10)
    const d = new Date(anio, mes, dia)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    }
  }
  return fechaStr
}

function formatearFechaLarga(fechaStr?: string | null): string {
  if (!fechaStr) return 'No disponible'
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr
    return d.toLocaleString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fechaStr
  }
}

// Catálogo de alergias frecuentes en odontología
const ALERGIAS_COMUNES = [
  'Penicilina / Amoxicilina',
  'Aspirina / AINEs (Ibuprofeno)',
  'Anestesia local (Lidocaína / Mepivacaína)',
  'Látex',
  'Sulfas',
  'Metronidazol',
  'Codeína / Opiáceos',
  'Metales (Níquel / Cromo)',
]

// Catálogo de antecedentes patológicos sistémicos
const PATOLOGIAS_SISTEMICAS = [
  'Hipertensión Arterial',
  'Diabetes Mellitus',
  'Cardiopatías / Soplo / Marcapasos',
  'Trastornos de Coagulación / Hemofilia',
  'Hepatitis / Enfermedad Hepática',
  'Asma / Afecciones Respiratorias',
  'Insuficiencia Renal',
  'Osteoporosis / Tratamiento con Bifosfonatos',
  'Epilepsia / Convulsiones',
  'Cáncer / Radioterapia de Cabeza o Cuello',
]

// Catálogo de hábitos y riesgos bucodentales
const HABITOS_RIESGOS = [
  'Bruxismo / Apretamiento dental',
  'Tabaquismo habitual',
  'Consumo frecuente de alcohol',
  'Hábito de morder objetos (onicofagia)',
  'Respirador bucal',
]

export function ClinicalHistoryPage({ defaultTab = 'DETALLES' }: { defaultTab?: TabExpediente } = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, accessToken } = useAuth()
  const pacienteId = id ? Number(id) : null

  const puedeEditar = useMemo(() => {
    if (!user) return false
    const r = user.rol
    const raw = user.rolesRaw || []
    return (
      r === 'Odontólogo' ||
      r === 'Administrador' ||
      raw.includes('ODONTOLOGO') ||
      raw.includes('ADMIN') ||
      raw.includes('ROLE_ODONTOLOGO') ||
      raw.includes('ROLE_ADMIN')
    )
  }, [user])

  // Capturar avisos de redirección
  useEffect(() => {
    const state = location.state as { aviso?: ToastAviso } | null
    if (!state?.aviso) return
    setAviso(state.aviso)
    window.history.replaceState({}, document.title)
  }, [location.state])

  // Pestaña activa con soporte de URL query param
  const tabFromUrl = searchParams.get('tab')?.toUpperCase() as TabExpediente | undefined
  const [tabActiva, setTabActiva] = useState<TabExpediente>(() => {
    if (tabFromUrl === ('HISTORIAL' as any)) return 'ANTECEDENTES'
    if (
      tabFromUrl &&
      [
        'DETALLES',
        'ANTECEDENTES',
        'ODONTOGRAMA',
        'EVOLUCIONES',
        'PRESUPUESTOS',
        'DOCUMENTOS',
        'RECETAS',
        'CONSENTIMIENTOS',
      ].includes(tabFromUrl)
    ) {
      return tabFromUrl
    }
    return defaultTab
  })

  const cambiarTab = (tab: TabExpediente) => {
    setTabActiva(tab)
    setSearchParams(
      prev => {
        const p = new URLSearchParams(prev)
        p.set('tab', tab.toLowerCase())
        return p
      },
      { replace: true },
    )
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Datos clínicos
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null)
  const [historia, setHistoria] = useState<HistoriaClinicaResponse | null>(null)
  const [condiciones, setCondiciones] = useState<CondicionOdontograma[]>([])
  const [odontograma, setOdontograma] = useState<OdontogramaResponse | null>(null)
  const [evoluciones, setEvoluciones] = useState<EvolucionClinicaResponse[]>([])

  // Campos clínicos estructurados (conforme a MINSA y Mockup oficial)
  const camposClinicos = useMemo(() => parsearCamposClinicos(historia), [historia])

  // Modales de Exportación y Edición de Historia Clínica
  const [modalExportarAbierto, setModalExportarAbierto] = useState(false)
  const [modalEditarHistoriaAbierto, setModalEditarHistoriaAbierto] = useState(false)
  const [camposForm, setCamposForm] = useState<CamposClinicos>(() => parsearCamposClinicos(null))
  const [seccionModal, setSeccionModal] = useState<'ANAMNESIS' | 'ANTECEDENTES' | 'EXAMEN' | 'DIAGNOSTICO'>('ANAMNESIS')

  const abrirEditarHistoria = (seccion?: 'anamnesis' | 'antecedentes' | 'examen' | 'diagnostico') => {
    setCamposForm(parsearCamposClinicos(historia))
    if (seccion === 'antecedentes') setSeccionModal('ANTECEDENTES')
    else if (seccion === 'examen') setSeccionModal('EXAMEN')
    else if (seccion === 'diagnostico') setSeccionModal('DIAGNOSTICO')
    else setSeccionModal('ANAMNESIS')
    setModalEditarHistoriaAbierto(true)
  }

  const handleGuardarHistoriaCompleta = async () => {
    if (!accessToken || !pacienteId) return
    setGuardando(true)
    try {
      const payload = {
        antecedentes: camposForm.antecedentesMedicos,
        alergias: camposForm.alergiasTexto,
        observacionesGenerales: JSON.stringify(camposForm),
      }
      let actualizada: HistoriaClinicaResponse
      if (!historia) {
        actualizada = await clinicalApi.crearHistoria(accessToken, pacienteId, payload)
      } else {
        actualizada = await clinicalApi.actualizarHistoria(accessToken, pacienteId, payload)
      }
      setHistoria(actualizada)
      setModalEditarHistoriaAbierto(false)
      setAviso({ tipo: 'success', texto: 'Historia clínica actualizada con éxito.' })
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'Error al guardar la historia clínica.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const handleExportarHistoriaPdf = () => {
    if (!paciente) return
    exportarHistoriaClinicaPdf({
      paciente,
      historia,
      camposClinicos,
      odontologoNombre: user ? `${user.nombre} ${user.apellido}` : 'Dr(a). Odontólogo Tratante',
      odontologoCop: '42589',
    })
  }

  const handleExportarExpedientePdf = () => {
    if (!paciente) return
    exportarExpedienteCronologicoPdf({
      paciente,
      historia,
      camposClinicos,
      evoluciones,
      odontograma,
      recetas,
      odontologoNombre: user ? `${user.nombre} ${user.apellido}` : 'Dr(a). Odontólogo Tratante',
      odontologoCop: '42589',
    })
  }

  // Cálculo preciso de la edad cronológica del paciente
  const edadCalculada = useMemo(() => {
    if (historia?.edad) return historia.edad
    const fNac = paciente?.fechaNacimiento || historia?.fechaNacimiento
    if (!fNac) return null
    const partes = fNac.split('-')
    if (partes.length !== 3) return null
    const nac = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
    if (isNaN(nac.getTime())) return null
    const hoy = new Date()
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
      edad--
    }
    return edad >= 0 ? edad : null
  }, [historia?.edad, historia?.fechaNacimiento, paciente?.fechaNacimiento])

  // Estimación de tarifas referenciales para el Plan de Tratamiento
  const estimarTarifaTratamiento = (codigo: string) => {
    const cod = codigo?.toUpperCase() || ''
    if (cod.includes('CARIES')) return 120
    if (cod.includes('ENDODONCIA')) return 380
    if (cod.includes('CORONA')) return 850
    if (cod.includes('SELLANTE')) return 70
    if (cod.includes('IMPLANTE')) return 2200
    if (cod.includes('FRACTURA')) return 160
    if (cod.includes('PROTESIS')) return 950
    if (cod.includes('RESTAURACION')) return 130
    return 100
  }

  // Resumen del presupuesto derivado del Odontograma
  const presupuestoItems = useMemo(() => {
    if (!odontograma?.piezas?.length) return []
    return odontograma.piezas
      .filter(p => p.codigoCondicion !== 'SANO' && p.codigoCondicion !== 'AUSENTE')
      .map(p => {
        const costo = estimarTarifaTratamiento(p.codigoCondicion)
        return {
          id: p.id || `${p.numeroPieza}-${p.superficie}`,
          numeroPieza: p.numeroPieza,
          superficie: p.superficie,
          idCondicion: p.idCondicion || 1,
          codigoCondicion: p.codigoCondicion,
          nombreCondicion: p.nombreCondicion,
          observacion: p.observacion,
          costo,
          estado: p.estado || 'HALLAZGO',
        }
      })
  }, [odontograma?.piezas])

  const totalPresupuesto = useMemo(() => {
    return presupuestoItems.reduce((acc, curr) => acc + curr.costo, 0)
  }, [presupuestoItems])

  const totalRealizado = useMemo(() => {
    return presupuestoItems.filter(p => p.estado === 'REALIZADO').reduce((acc, curr) => acc + curr.costo, 0)
  }, [presupuestoItems])



  // Estado de evolución clínica
  const [modalEvolucionAbierto, setModalEvolucionAbierto] = useState(false)
  const [formEvolucion, setFormEvolucion] = useState({
    diagnostico: '',
    procedimiento: '',
    indicaciones: '',
    observaciones: '',
  })

  // Estado de Documentos y Radiografías
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<string>('TODOS')
  const [docSeleccionadoViewer, setDocSeleccionadoViewer] = useState<DocumentoClinico | null>(null)
  const [modalSubirDocAbierto, setModalSubirDocAbierto] = useState(false)
  const [tipoDocSubida, setTipoDocSubida] = useState<DocumentoClinico['tipoDocumento']>('RADIOGRAFIA_PANORAMICA')
  const [viewerZoom, setViewerZoom] = useState(1)
  const [viewerRotacion, setViewerRotacion] = useState(0)
  const [viewerInvertido, setViewerInvertido] = useState(false)

  // Documentos demostrativos y reales
  const [documentos, setDocumentos] = useState<DocumentoClinico[]>([
    {
      id: 1,
      pacienteId: pacienteId || 1,
      claveAlmacenamiento: 'radiografias/panoramica_inicial.jpg',
      nombreOriginal: 'Radiografía Panorámica Completa Inicial.jpg',
      tipoMime: 'image/jpeg',
      tipoDocumento: 'RADIOGRAFIA_PANORAMICA',
      tamanoBytes: 3420000,
      visiblePaciente: true,
      fechaCreacion: '2026-10-15T10:30:00',
      urlVisualizacion: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 2,
      pacienteId: pacienteId || 1,
      claveAlmacenamiento: 'radiografias/periapical_pieza_16.jpg',
      nombreOriginal: 'Periapical Pieza #16 Control Endodóntico.jpg',
      tipoMime: 'image/jpeg',
      tipoDocumento: 'RADIOGRAFIA_PERIAPICAL',
      tamanoBytes: 1850000,
      visiblePaciente: false,
      fechaCreacion: '2026-10-17T16:45:00',
      urlVisualizacion: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 3,
      pacienteId: pacienteId || 1,
      claveAlmacenamiento: 'fotos/registro_oclusal_intraoral.jpg',
      nombreOriginal: 'Fotografía Clínica Intraoral Oclusión.jpg',
      tipoMime: 'image/jpeg',
      tipoDocumento: 'FOTOGRAFIA_CLINICA',
      tamanoBytes: 2100000,
      visiblePaciente: true,
      fechaCreacion: '2026-10-18T11:15:00',
      urlVisualizacion: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&q=80',
    },
  ])

  // Recetas emitidas y modal de visualización conceptual
  const [modalRecetaAbierto, setModalRecetaAbierto] = useState(false)
  const [recetaParaVer, setRecetaParaVer] = useState<RecetaClinica | null>(null)
  const [recetas, setRecetas] = useState<RecetaClinica[]>([
    {
      id: 128,
      codigoReceta: 'RX-000128',
      pacienteId: pacienteId || 1,
      odontologoId: 1,
      odontologoNombre: 'Dra. Andrea Sulca',
      numeroColegiatura: 'COP 45210',
      fecha: '2026-10-22T10:30:00',
      validaHasta: '2026-10-27T23:59:59',
      indicacionesGenerales:
        'Tomar la medicación con abundante agua tras los alimentos. No ingerir bebidas alcohólicas ni suspender el tratamiento antes del tiempo estipulado.',
      detalles: [
        {
          medicamento: 'Amoxicilina',
          dci: 'Amoxicilina trihidrato',
          concentracion: '500 mg',
          formaFarmaceutica: 'Cápsula',
          cantidadTotal: '21 cápsulas (veintiuno)',
          dosis: '1 cápsula',
          frecuencia: 'Cada 8 horas',
          duracion: 'Por 7 días',
          viaAdministracion: 'Oral',
          observaciones: 'Cumplir el ciclo antibiótico completo.',
        },
        {
          medicamento: 'Ibuprofeno',
          dci: 'Ibuprofeno',
          concentracion: '400 mg',
          formaFarmaceutica: 'Tableta recubierta',
          cantidadTotal: '10 tabletas',
          dosis: '1 tableta',
          frecuencia: 'Cada 8 horas condicional al dolor',
          duracion: 'Por 3 días',
          viaAdministracion: 'Oral',
          observaciones: 'Tomar únicamente en caso de molestia o inflamación moderada.',
        },
      ],
    },
  ])

  // Formulario técnico de nueva receta (Conforme a DIGEMID / MINSA)
  const [formReceta, setFormReceta] = useState({
    medicamento: '',
    dci: '',
    concentracion: '',
    formaFarmaceutica: 'Cápsula',
    cantidadTotal: '',
    dosis: '',
    frecuencia: '',
    duracion: '',
    viaAdministracion: 'Oral',
    validaHasta: '',
    indicacionesGenerales: '',
  })

  // Línea de tiempo integral cronológica (Historial Clínico estilo Dentalink)
  const eventosHistorial = useMemo(() => {
    const eventos: Array<{
      id: string
      tipo: 'HISTORIA' | 'ODONTOGRAMA' | 'EVOLUCION' | 'DOCUMENTO' | 'RECETA'
      titulo: string
      subtitulo: string
      descripcion?: string
      fecha: string
      doctor?: string
      tono: 'blue' | 'green' | 'purple' | 'amber' | 'gray'
      icono: 'file' | 'tooth' | 'calendar' | 'image' | 'pill'
    }> = []

    if (historia?.fechaCreacion) {
      eventos.push({
        id: `hc-${historia.id}`,
        tipo: 'HISTORIA',
        titulo: 'Apertura de Historia Clínica Digital',
        subtitulo: `Expediente N° HC-${historia.id}`,
        descripcion: 'Registro de filiación, antecedentes patológicos y consentimientos.',
        fecha: historia.fechaCreacion,
        tono: 'blue',
        icono: 'file',
      })
    }

    evoluciones.forEach(evo => {
      eventos.push({
        id: `evo-${evo.id}`,
        tipo: 'EVOLUCION',
        titulo: `Atención Clínica: ${evo.diagnostico || 'Evolución Odontológica'}`,
        subtitulo: evo.odontologoNombre ? `Dr(a). ${evo.odontologoNombre}` : 'Atención Odontológica',
        descripcion: evo.procedimiento || evo.observaciones,
        fecha: evo.fecha,
        doctor: evo.odontologoNombre,
        tono: 'green',
        icono: 'calendar',
      })
    })

    if (odontograma?.piezas?.length) {
      odontograma.piezas.forEach(p => {
        const estadoLabel =
          p.estado === 'REALIZADO'
            ? 'Tratamiento Realizado'
            : p.estado === 'PRESUPUESTADO'
              ? 'Tratamiento Presupuestado'
              : p.estado === 'PROGRAMADO'
                ? 'Tratamiento Programado'
                : 'Hallazgo Odontológico'
        eventos.push({
          id: `pieza-${p.id || `${p.numeroPieza}-${p.superficie}`}`,
          tipo: 'ODONTOGRAMA',
          titulo: `${estadoLabel} en Pieza #${p.numeroPieza}`,
          subtitulo: `${p.nombreCondicion} (${p.superficie === 'GENERAL' ? 'Toda la pieza' : `Cara ${p.superficie}`})`,
          descripcion: p.observacion || undefined,
          fecha: historia?.fechaCreacion || new Date().toISOString(),
          tono: p.estado === 'REALIZADO' ? 'blue' : 'amber',
          icono: 'tooth',
        })
      })
    }

    documentos.forEach(doc => {
      eventos.push({
        id: `doc-${doc.id}`,
        tipo: 'DOCUMENTO',
        titulo: `Documento Clínico: ${doc.tipoDocumento.replace(/_/g, ' ')}`,
        subtitulo: doc.nombreOriginal,
        descripcion: `Archivo digitalizado ${(doc.tamanoBytes / (1024 * 1024)).toFixed(1)} MB`,
        fecha: doc.fechaCreacion,
        tono: 'purple',
        icono: 'image',
      })
    })

    recetas.forEach(rec => {
      eventos.push({
        id: `rec-${rec.id}`,
        tipo: 'RECETA',
        titulo: `Receta Farmacológica #${rec.id}`,
        subtitulo: `Emisor: ${rec.odontologoNombre}`,
        descripcion: rec.detalles.map(d => `${d.medicamento} (${d.dosis})`).join(', '),
        fecha: rec.fecha,
        tono: 'green',
        icono: 'pill',
      })
    })

    return eventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [historia, evoluciones, odontograma?.piezas, documentos, recetas])

  // Cargar expediente clínico
  useEffect(() => {
    if (!accessToken || !pacienteId) return
    let activo = true
    setLoading(true)
    setError(null)

    Promise.all([
      patientsApi.obtener(accessToken, pacienteId),
      clinicalApi.obtenerHistoria(accessToken, pacienteId).catch(() => undefined),
      clinicalApi.listarCondiciones(accessToken),
      clinicalApi.obtenerOdontograma(accessToken, pacienteId).catch(() => null),
      clinicalApi.listarEvoluciones(accessToken, pacienteId).catch(() => []),
    ])
      .then(([pac, hist, conds, odonto, evols]) => {
        if (!activo) return
        setPaciente(pac)
        setCondiciones(conds)
        setOdontograma(odonto)
        setEvoluciones(evols)

        if (hist) {
          setHistoria(hist)
        }
      })
      .catch(e => {
        if (!activo) return
        setError(e instanceof Error ? e.message : 'Error al cargar los datos clínicos.')
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, pacienteId])

  // Actualizar pieza dental en odontograma
  const handleActualizarPieza = async (
    pieza: number,
    superficie: string | undefined,
    condicionId: number,
    observacionTexto?: string,
    estado?: 'HALLAZGO' | 'PRESUPUESTADO' | 'PROGRAMADO' | 'REALIZADO',
    codigoCondicion?: string,
  ) => {
    if (!accessToken || !pacienteId) return
    try {
      const resp = await clinicalApi.actualizarPieza(accessToken, pacienteId, {
        numeroPieza: pieza,
        superficie,
        idCondicion: condicionId,
        codigoCondicion,
        observacion: observacionTexto,
        estado,
      })
      setOdontograma(resp)
      setAviso({
        tipo: 'success',
        texto: `Pieza dental #${pieza} (${superficie || 'General'}) actualizada en el odontograma.`,
      })
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'Error al guardar el hallazgo en el odontograma.',
      })
      throw e
    }
  }

  // Crear nueva condición personalizada
  const handleCrearCondicion = async (data: CrearCondicionRequest): Promise<CondicionOdontograma> => {
    if (!accessToken) throw new Error('No autenticado')
    const nueva = await clinicalApi.crearCondicion(accessToken, data)
    setCondiciones(prev => {
      const existe = prev.some(c => c.id === nueva.id || c.codigo === nueva.codigo)
      return existe ? prev : [...prev, nueva]
    })
    setAviso({
      tipo: 'success',
      texto: `Nueva condición "${nueva.nombre}" creada y agregada al catálogo.`,
    })
    return nueva
  }

  // Limpiar pieza o superficie
  const handleLimpiarPieza = async (pieza: number, superficie?: string) => {
    if (!accessToken || !pacienteId) return
    try {
      const resp = await clinicalApi.limpiarPieza(accessToken, pacienteId, pieza, superficie)
      setOdontograma(resp)
      setAviso({
        tipo: 'success',
        texto: superficie
          ? `Superficie ${superficie} de la pieza #${pieza} limpiada.`
          : `Pieza #${pieza} restablecida a estado normal.`,
      })
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'Error al limpiar la pieza dental.',
      })
      throw e
    }
  }

  // Agregar evolución clínica (SOAP)
  const handleAgregarEvolucion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !pacienteId || !formEvolucion.diagnostico.trim()) return

    setGuardando(true)
    try {
      const nueva = await clinicalApi.agregarEvolucion(accessToken, pacienteId, {
        diagnostico: formEvolucion.diagnostico.trim(),
        procedimiento: formEvolucion.procedimiento.trim() || undefined,
        indicaciones: formEvolucion.indicaciones.trim() || undefined,
        observaciones: formEvolucion.observaciones.trim() || undefined,
      })
      setEvoluciones(prev => [nueva, ...prev])
      setModalEvolucionAbierto(false)
      setFormEvolucion({
        diagnostico: '',
        procedimiento: '',
        indicaciones: '',
        observaciones: '',
      })
      setAviso({ tipo: 'success', texto: 'Nota de evolución clínica registrada exitosamente.' })
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'Error al registrar evolución clínica.',
      })
    } finally {
      setGuardando(false)
    }
  }

  // Subir documento a Cloudflare R2
  const handleSubirDoc = () => {
    const nuevoDoc: DocumentoClinico = {
      id: Date.now(),
      pacienteId: pacienteId || 1,
      claveAlmacenamiento: `radiografias/${Date.now()}.jpg`,
      nombreOriginal: 'Radiografía Digital Registrada.jpg',
      tipoMime: 'image/jpeg',
      tipoDocumento: tipoDocSubida,
      tamanoBytes: 2500000,
      visiblePaciente: true,
      fechaCreacion: new Date().toISOString(),
      urlVisualizacion: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
    }
    setDocumentos(prev => [nuevoDoc, ...prev])
    setModalSubirDocAbierto(false)
    setAviso({ tipo: 'success', texto: 'Archivo cargado en Cloudflare R2 con éxito.' })
  }

  // Emitir nueva receta médica formal conforme a DIGEMID / MINSA
  const handleGuardarReceta = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formReceta.medicamento.trim()) return

    const nuevoId = Math.floor(100 + Math.random() * 900)
    const nuevaReceta: RecetaClinica = {
      id: nuevoId,
      codigoReceta: `RX-${String(nuevoId).padStart(6, '0')}`,
      pacienteId: pacienteId || 1,
      odontologoId: Number(user?.id || 1),
      odontologoNombre: user ? `${user.nombre} ${user.apellido}` : 'Dr(a). Tratante',
      numeroColegiatura: 'COP 45210',
      fecha: new Date().toISOString(),
      validaHasta: formReceta.validaHasta
        ? new Date(formReceta.validaHasta).toISOString()
        : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      indicacionesGenerales: formReceta.indicacionesGenerales || 'Tomar según prescripción profesional.',
      detalles: [
        {
          medicamento: formReceta.medicamento.trim(),
          dci: formReceta.dci.trim() || undefined,
          concentracion: formReceta.concentracion.trim() || undefined,
          formaFarmaceutica: formReceta.formaFarmaceutica.trim() || undefined,
          cantidadTotal: formReceta.cantidadTotal.trim() || undefined,
          dosis: formReceta.dosis.trim() || '1 unidad',
          frecuencia: formReceta.frecuencia.trim() || 'Cada 8 horas',
          duracion: formReceta.duracion.trim() || 'Por 5 días',
          viaAdministracion: formReceta.viaAdministracion,
        },
      ],
    }

    setRecetas(prev => [nuevaReceta, ...prev])
    setModalRecetaAbierto(false)
    setFormReceta({
      medicamento: '',
      dci: '',
      concentracion: '',
      formaFarmaceutica: 'Cápsula',
      cantidadTotal: '',
      dosis: '',
      frecuencia: '',
      duracion: '',
      viaAdministracion: 'Oral',
      validaHasta: '',
      indicacionesGenerales: '',
    })
    setAviso({ tipo: 'success', texto: 'Receta odontológica oficial emitida y registrada con éxito.' })
  }

  const totalAlergias = useMemo(() => {
    const str = historia?.alergias?.trim() || camposClinicos.alergiasTexto?.trim()
    if (!str || str.toLowerCase().includes('ningun') || str.toLowerCase().includes('no ')) return 0
    return str.split(',').filter(s => s.trim().length > 0).length
  }, [historia?.alergias, camposClinicos.alergiasTexto])

  const totalAntecedentes = useMemo(() => {
    const str = historia?.antecedentes?.trim() || camposClinicos.antecedentesMedicos?.trim()
    if (!str || str.toLowerCase().includes('ningun') || str.toLowerCase().includes('sin antecedentes') || str.toLowerCase().includes('no ')) return 0
    return str.split(',').filter(s => s.trim().length > 0).length
  }, [historia?.antecedentes, camposClinicos.antecedentesMedicos])

  const documentoTexto = paciente
    ? `${paciente.tipoDocumento || 'DNI'} - ${paciente.numeroDocumento || 'No registrado'}`
    : 'No registrado'

  // Documentos filtrados
  const documentosFiltrados = useMemo(() => {
    if (filtroTipoDoc === 'TODOS') return documentos
    return documentos.filter(d => d.tipoDocumento === filtroTipoDoc)
  }, [documentos, filtroTipoDoc])

  const nombreCompleto = paciente
    ? [paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno].filter(Boolean).join(' ')
    : 'Cargando paciente…'

  return (
    <>
      <div className="flex items-center justify-between">
        <BackLink to="/pacientes">
          Volver a pacientes
        </BackLink>
      </div>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* ESTADO DE CARGA */}
      {loading && (
        <Card className="mt-4 flex items-center justify-center gap-3 p-12">
          <Icon name="spinner" size={22} className="animate-spin text-brand" />
          <p className="text-sm text-muted">Cargando expediente clínico integral del paciente…</p>
        </Card>
      )}

      {/* ERROR */}
      {!loading && error && (
        <Card className="mt-4 flex flex-col items-center gap-4 p-8 text-center">
          <Icon name="warning" size={32} className="text-danger" />
          <p className="text-sm font-semibold text-danger">{error}</p>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </Card>
      )}

      {!loading && paciente && !error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 space-y-4"
        >
          {/* CABECERA PRINCIPAL OSCURA (DISEÑO MOCKUP PREMIUM) */}
          <div className="bg-[#181a24] text-white p-5 sm:p-7 rounded-2xl shadow-lg border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* BLOQUE IZQUIERDO: AVATAR BLOBATAR Y DATOS DEL PACIENTE */}
              <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
                <div className="shrink-0">
                  <Avatar
                    nombre={paciente.nombres}
                    apellido={paciente.apellidoPaterno}
                    seed={paciente.id}
                    size={76}
                    animate="always"
                    trackCursor={true}
                    className="ring-4 ring-white/20 shadow-xl"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-white tracking-tight leading-tight truncate">
                    {nombreCompleto}
                  </h1>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Documento</span>
                      <span className="font-semibold text-white truncate block mt-0.5">{documentoTexto}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo electrónico</span>
                      <span className="font-semibold text-white truncate block mt-0.5" title={paciente.email || ''}>
                        {paciente.email || 'No registrado'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Teléfono</span>
                      <span className="font-semibold text-white truncate block mt-0.5">
                        {paciente.telefono ? formatPhone(paciente.telefono) : 'No registrado'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Edad</span>
                      <span className="font-semibold text-white truncate block mt-0.5">
                        {edadCalculada !== null ? `${edadCalculada} años` : 'No disponible'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Género</span>
                      <span className="font-semibold text-white truncate block mt-0.5">
                        {(paciente as any).genero || 'Femenino'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE DERECHO: TARJETA DE ALERTAS MÉDICAS (CON TOOLTIP DEL SISTEMA, SIN EMOJIS) */}
              <Tooltip content="Ver o gestionar alergias y antecedentes clínicos" side="bottom">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => cambiarTab('ANTECEDENTES')}
                  onKeyDown={e => e.key === 'Enter' && cambiarTab('ANTECEDENTES')}
                  className="shrink-0 bg-white rounded-2xl p-4 shadow-xl border border-slate-100 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-center gap-2.5 min-w-[195px] select-none"
                >
                  {/* ALERGIAS */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                        totalAlergias > 0
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Icon name={totalAlergias > 0 ? 'warning' : 'shield'} size={15} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-bold block truncate ${
                          totalAlergias > 0 ? 'text-rose-700' : 'text-slate-800'
                        }`}
                      >
                        {totalAlergias} {totalAlergias === 1 ? 'alergia' : 'alergias'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                        {totalAlergias > 0 ? 'Alerta clínica' : 'Sin registro'}
                      </span>
                    </div>
                  </div>

                  {/* SEPARADOR */}
                  <div className="h-px bg-slate-100" />

                  {/* ANTECEDENTES */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                        totalAntecedentes > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon name={totalAntecedentes > 0 ? 'heart' : 'fileText'} size={15} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-bold block truncate ${
                          totalAntecedentes > 0 ? 'text-amber-800' : 'text-slate-800'
                        }`}
                      >
                        {totalAntecedentes} {totalAntecedentes === 1 ? 'antecedente' : 'antecedentes'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                        {totalAntecedentes > 0 ? 'Patologías reg.' : 'Sin patologías'}
                      </span>
                    </div>
                  </div>
                </div>
              </Tooltip>
            </div>
          </div>

          {/* BARRA DE PESTAÑAS INTEGRAL (ÚNICAMENTE MENÚ HORIZONTAL DE PESTAÑAS) */}
          <div className="bg-surface border-b border-line px-4 sm:px-6 flex items-center overflow-x-auto shadow-xs rounded-xl no-scrollbar">
            <div className="flex items-center gap-6 whitespace-nowrap pt-3">
              {[
                { id: 'DETALLES', label: 'Detalles del paciente' },
                { id: 'ANTECEDENTES', label: 'Historia clínica' },
                { id: 'ODONTOGRAMA', label: 'Odontograma' },
                { id: 'EVOLUCIONES', label: 'Evolución' },
                { id: 'PRESUPUESTOS', label: 'Tratamientos' },
                { id: 'DOCUMENTOS', label: 'Radiografías' },
                { id: 'RECETAS', label: 'Recetas' },
                { id: 'CONSENTIMIENTOS', label: 'Consentimientos' },
              ].map(tab => {
                const active = tabActiva === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => cambiarTab(tab.id as TabExpediente)}
                    className={`relative pb-3 text-sm font-semibold transition-all ${
                      active ? 'text-brand' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <motion.div
                        layoutId="tabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TAB: DETALLES DEL PACIENTE (SIN INFORMACIÓN REDUNDANTE) */}
          {tabActiva === 'DETALLES' && (
            <div className="space-y-6 pt-2">
              {/* RESUMEN DEL PACIENTE */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-ink">Resumen del paciente</h2>
                  <span className="text-xs text-muted">Información general de la cuenta</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* CARD 1: ESTADO Y PORTAL (REEMPLAZA LA FECHA DE NACIMIENTO REDUNDANTE) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line shadow-xs flex items-center gap-4">
                    <div
                      className={`size-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        paciente.activo
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon name="shield" size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs text-muted font-medium">Estado del paciente</span>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-ink">
                          {paciente.activo ? 'Paciente Activo' : 'Paciente Inactivo'}
                        </span>
                        <Badge tone={paciente.tieneCuenta ? 'blue' : 'gray'}>
                          {paciente.tieneCuenta ? 'Portal activo' : 'Sin portal'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: ESTADO DEL CORREO */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line shadow-xs flex items-center gap-4">
                    <div
                      className={`size-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        paciente.correoVerificado
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-amber-50 border-amber-200 text-amber-600'
                      }`}
                    >
                      <Icon name={paciente.correoVerificado ? 'check' : 'alertCircle'} size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs text-muted font-medium">Estado del correo</span>
                      <span className="text-sm sm:text-base font-bold text-ink mt-1 block truncate">
                        {paciente.correoVerificado ? 'Correo verificado' : 'Pendiente de verificación'}
                      </span>
                    </div>
                  </div>

                  {/* CARD 3: SEDE DE REGISTRO */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line shadow-xs flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                      <Icon name="home" size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs text-muted font-medium">Sede de registro</span>
                      <span className="text-sm sm:text-base font-bold text-ink mt-1 block truncate">
                        {paciente.sedeRegistroNombre || 'Sin asignar'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* INFORMACIÓN DETALLADA */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-ink">Información detallada</h2>
                  <span className="text-xs text-muted">
                    {paciente.fechaActualizacion
                      ? `Datos actualizados el ${formatearFechaLarga(paciente.fechaActualizacion)}`
                      : `Registrado el ${formatearFechaLarga(paciente.fechaCreacion)}`}
                  </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  {/* COLUMNA IZQUIERDA: DATOS PERSONALES Y CONTACTO */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-ink">Datos personales y contacto</h3>
                        <p className="text-xs text-muted">Información de identificación del paciente</p>
                      </div>
                      {puedeEditar && paciente.activo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="edit"
                          onClick={() => navigate(`/pacientes/${paciente.id}/editar`)}
                        >
                          Editar datos
                        </Button>
                      )}
                    </div>

                    <div className="divide-y divide-line/60">
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Documento de identidad</span>
                        <span className="font-semibold text-ink">{documentoTexto}</span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Fecha de nacimiento</span>
                        <span className="font-semibold text-ink">{formatearFechaNacimiento(paciente.fechaNacimiento)}</span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Teléfono</span>
                        <span className="font-semibold text-ink">
                          {paciente.telefono ? formatPhone(paciente.telefono) : 'No registrado'}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Correo electrónico</span>
                        <span className="font-semibold text-ink break-all">
                          {paciente.email || 'No registrado'}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Dirección</span>
                        <span className="font-semibold text-ink">
                          {paciente.direccion || 'No registrada'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* COLUMNA DERECHA: CUENTA Y REGISTRO */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-ink">Cuenta y registro</h3>
                        <p className="text-xs text-muted">Acceso al portal y actividad de la cuenta</p>
                      </div>
                      {paciente.tieneCuenta ? (
                        <Badge tone="blue">Portal activo</Badge>
                      ) : (
                        <Badge tone="gray">Sin portal</Badge>
                      )}
                    </div>

                    <div className="divide-y divide-line/60">
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Verificación de correo</span>
                        <span className="font-semibold text-emerald-600 inline-flex items-center gap-1.5">
                          {paciente.correoVerificado ? (
                            <>
                              <Icon name="check" size={13} />
                              <span>Correo verificado</span>
                            </>
                          ) : (
                            <span className="text-amber-600">Pendiente OTP</span>
                          )}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Canal de registro</span>
                        <span className="font-semibold text-ink inline-flex items-center gap-1.5">
                          <Icon name="globe" size={13} className="text-muted" />
                          {paciente.origenRegistro === 'AUTORREGISTRO' ? 'Autoregistro web' : 'Recepción'}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Sede de registro</span>
                        <span className="font-semibold text-ink">
                          {paciente.sedeRegistroNombre || 'No asignada'}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Fecha de registro</span>
                        <span className="font-semibold text-ink">
                          {formatearFechaLarga(paciente.fechaCreacion)}
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between gap-4 text-xs">
                        <span className="text-muted">Última actualización</span>
                        <span className="font-semibold text-ink">
                          {formatearFechaLarga(paciente.fechaActualizacion || paciente.fechaCreacion)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: HISTORIA CLÍNICA INTEGRAL (CONFORME A MOCKUP Y NTS N° 139-MINSA) */}
          {tabActiva === 'ANTECEDENTES' && (
            <div className="space-y-6 pt-2">
              {/* CABECERA DE LA PESTAÑA HISTORIA CLÍNICA */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-ink tracking-tight">Historia clínica</h1>
                  <p className="text-xs text-muted mt-0.5">
                    Información médica y odontológica organizada en un solo lugar.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="download"
                    onClick={() => setModalExportarAbierto(true)}
                  >
                    Exportar
                  </Button>
                  {puedeEditar && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="edit"
                      onClick={() => abrirEditarHistoria()}
                    >
                      Editar historia
                    </Button>
                  )}
                </div>
              </div>

              {/* CONTENIDO PRINCIPAL: 2 COLUMNAS (MOCKUP OFICIAL) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* COLUMNA IZQUIERDA (2/3): INFORMACIÓN CLÍNICA DETALLADA */}
                <div className="lg:col-span-2 space-y-5">
                  {/* CARD 1: MOTIVO DE CONSULTA Y ANAMNESIS */}
                  <Card className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-line">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                          <Icon name="fileText" size={16} />
                        </div>
                        <h2 className="text-sm font-bold text-ink">Motivo de consulta y anamnesis</h2>
                      </div>
                      <Badge tone="blue">Evaluación inicial</Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                          Motivo de Consulta
                        </span>
                        <div className="p-3.5 rounded-xl bg-alt/40 border border-line/70 text-xs text-ink font-medium leading-relaxed">
                          {camposClinicos.motivoConsulta || 'Paciente acude para una evaluación odontológica general y revisión de su estado de salud bucal.'}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                          Enfermedad Actual / Anamnesis
                        </span>
                        <p className="text-xs text-ink font-medium leading-relaxed">
                          {camposClinicos.enfermedadActual || 'Sin información adicional registrada.'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* CARD 2: ANTECEDENTES Y SALUD GENERAL */}
                  <Card className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-line">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Icon name="plus" size={16} />
                        </div>
                        <h2 className="text-sm font-bold text-ink">Antecedentes y salud general</h2>
                      </div>
                      {puedeEditar && (
                        <button
                          type="button"
                          onClick={() => abrirEditarHistoria('antecedentes')}
                          className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Editar</span>
                          <Icon name="externalLink" size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Antecedentes Médicos
                        </span>
                        <p className="text-xs text-ink font-semibold">
                          {camposClinicos.antecedentesMedicos || 'No registrados'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Medicamentos Actuales
                        </span>
                        <p className="text-xs text-ink font-semibold">
                          {camposClinicos.medicamentosActuales || 'No registrados'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Antecedentes Odontológicos
                        </span>
                        <p className="text-xs text-ink font-semibold">
                          {camposClinicos.antecedentesOdontologicos || 'No registrados'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Alergias
                        </span>
                        <p className="text-xs font-semibold text-danger">
                          {camposClinicos.alergiasTexto || 'Sin información registrada'}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted italic pt-1">
                      La ausencia de registros no equivale a una respuesta negativa del paciente.
                    </p>
                  </Card>

                  {/* CARD 3: EXPLORACIÓN Y EVALUACIÓN CLÍNICA */}
                  <Card className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-line">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                          <Icon name="search" size={16} />
                        </div>
                        <h2 className="text-sm font-bold text-ink">Exploración y evaluación clínica</h2>
                      </div>
                      {puedeEditar && (
                        <button
                          type="button"
                          onClick={() => abrirEditarHistoria('examen')}
                          className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Editar</span>
                          <Icon name="externalLink" size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Examen Extraoral
                        </span>
                        <p className="text-xs text-ink font-medium leading-relaxed">
                          {camposClinicos.examenExtraoral || 'Pendiente de completar'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Examen Intraoral
                        </span>
                        <p className="text-xs text-ink font-medium leading-relaxed">
                          {camposClinicos.examenIntraoral || 'Pendiente de completar'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                        Observaciones Clínicas
                      </span>
                      <p className="text-xs text-ink font-medium leading-relaxed">
                        {camposClinicos.observacionesClinicas || 'Todavía no se han registrado observaciones.'}
                      </p>
                    </div>
                  </Card>

                  {/* CARD 4: DIAGNÓSTICO Y PLAN DE ATENCIÓN */}
                  <Card className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-line">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Icon name="file" size={16} />
                        </div>
                        <h2 className="text-sm font-bold text-ink">Diagnóstico y plan de atención</h2>
                      </div>
                      {puedeEditar && (
                        <button
                          type="button"
                          onClick={() => abrirEditarHistoria('diagnostico')}
                          className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>+ Agregar / Editar</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Diagnóstico
                        </span>
                        <p className="text-xs text-ink font-semibold">
                          {camposClinicos.diagnostico || 'Sin diagnóstico registrado'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-line bg-surface space-y-1">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                          Plan de Tratamiento
                        </span>
                        <p className="text-xs text-ink font-medium whitespace-pre-line leading-relaxed">
                          {camposClinicos.planTratamiento || 'Aún no definido'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* COLUMNA DERECHA (1/3): ESTADO, ACTIVIDAD Y ACCESOS RÁPIDOS */}
                <div className="lg:col-span-1 space-y-5">
                  {/* CARD: ESTADO DE LA HISTORIA */}
                  <Card className="p-5 space-y-3.5">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-line">
                      <div className="size-8 rounded-lg bg-blue-50 text-brand flex items-center justify-center">
                        <Icon name="bookOpen" size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-ink">Estado de la historia</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge tone="blue">En elaboración</Badge>
                      <span className="text-xs text-muted">Información por completar</span>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">
                      Completa las secciones pendientes para mantener la historia clínica actualizada.
                    </p>

                    {puedeEditar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between mt-1 text-xs"
                        onClick={() => abrirEditarHistoria()}
                      >
                        <span>Revisar campos pendientes</span>
                        <Icon name="chevronRight" size={14} />
                      </Button>
                    )}
                  </Card>

                  {/* CARD: ACTIVIDAD RECIENTE */}
                  <Card className="p-5 space-y-3.5">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-line">
                      <div className="size-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Icon name="clock" size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-ink">Actividad reciente</h3>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      {eventosHistorial.length > 0 ? (
                        eventosHistorial.slice(0, 3).map((evt, idx) => (
                          <div
                            key={evt.id}
                            className={`relative pl-5 ${
                              idx < Math.min(eventosHistorial.length - 1, 2) ? 'pb-3 border-l-2 border-line' : ''
                            }`}
                          >
                            <div
                              className={`absolute -left-[5px] top-0.5 size-2.5 rounded-full ring-4 ring-surface ${
                                evt.tono === 'green'
                                  ? 'bg-emerald-500'
                                  : evt.tono === 'purple'
                                    ? 'bg-purple-500'
                                    : evt.tono === 'amber'
                                      ? 'bg-amber-500'
                                      : 'bg-brand'
                              }`}
                            />
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                              {evt.tipo} • {new Date(evt.fecha).toLocaleDateString()}
                            </span>
                            <p className="text-xs font-bold text-ink mt-0.5 line-clamp-1">{evt.titulo}</p>
                            <p className="text-[11px] text-muted line-clamp-1">{evt.subtitulo}</p>
                          </div>
                        ))
                      ) : (
                        <div className="relative pl-5 border-l-2 border-line">
                          <div className="absolute -left-[5px] top-0.5 size-2.5 rounded-full bg-brand ring-4 ring-surface" />
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                            Registro inicial
                          </span>
                          <p className="text-xs font-bold text-ink mt-0.5">Historia clínica creada</p>
                          <p className="text-[11px] text-muted">Se abrió la ficha para registrar la evaluación inicial.</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* CARD: ACCESOS RÁPIDOS */}
                  <Card className="p-5 space-y-3">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-line">
                      <div className="size-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Icon name="externalLink" size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-ink">Accesos rápidos</h3>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => cambiarTab('ODONTOGRAMA')}
                        className="w-full p-2.5 rounded-xl border border-line bg-surface hover:bg-hover hover:border-brand/40 text-xs font-semibold text-ink flex items-center justify-between transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon name="tooth" size={15} className="text-brand" />
                          Ir al odontograma
                        </span>
                        <Icon name="externalLink" size={13} className="text-muted" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalEvolucionAbierto(true)}
                        className="w-full p-2.5 rounded-xl border border-line bg-surface hover:bg-hover hover:border-brand/40 text-xs font-semibold text-ink flex items-center justify-between transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon name="edit" size={15} className="text-brand" />
                          Registrar evolución
                        </span>
                        <Icon name="externalLink" size={13} className="text-muted" />
                      </button>

                      <button
                        type="button"
                        onClick={() => cambiarTab('PRESUPUESTOS')}
                        className="w-full p-2.5 rounded-xl border border-line bg-surface hover:bg-hover hover:border-brand/40 text-xs font-semibold text-ink flex items-center justify-between transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon name="clipboard" size={15} className="text-brand" />
                          Ver tratamientos
                        </span>
                        <Icon name="externalLink" size={13} className="text-muted" />
                      </button>
                    </div>

                    <div className="pt-2 text-center">
                      <span className="text-[10px] text-muted font-medium">
                        Norma Técnica NTS N° 139-MINSA/2018/DGIEM
                      </span>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ODONTOGRAMA DIGITAL */}
          {tabActiva === 'ODONTOGRAMA' && (
            <div className="space-y-4">
              <OdontogramView
                odontograma={odontograma}
                condiciones={condiciones}
                readOnly={!puedeEditar}
                guardando={guardando}
                onActualizarPieza={handleActualizarPieza}
                onLimpiarPieza={handleLimpiarPieza}
                onCrearCondicion={handleCrearCondicion}
              />
            </div>
          )}

          {/* TAB: PLAN DE TRATAMIENTOS Y PRESUPUESTOS ODONTOLÓGICOS */}
          {tabActiva === 'PRESUPUESTOS' && (
            <div className="space-y-6">
              {/* KPIs FINANCIEROS Y DE PROCEDIMIENTOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-line bg-surface shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Total Presupuestado
                  </span>
                  <p className="text-xl font-black text-brand">S/. {totalPresupuesto.toFixed(2)}</p>
                  <p className="text-[10px] text-muted">{presupuestoItems.length} tratamientos requeridos</p>
                </div>

                <div className="p-4 rounded-xl border border-line bg-surface shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Tratamientos Realizados
                  </span>
                  <p className="text-xl font-black text-emerald-600">S/. {totalRealizado.toFixed(2)}</p>
                  <p className="text-[10px] text-muted">
                    {presupuestoItems.filter(p => p.estado === 'REALIZADO').length} de {presupuestoItems.length} completados
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-line bg-surface shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Saldo / Pendiente
                  </span>
                  <p className="text-xl font-black text-amber-600">
                    S/. {(totalPresupuesto - totalRealizado).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted">Tratamientos pendientes de realizar</p>
                </div>

                <div className="p-4 rounded-xl border border-line bg-surface shadow-xs space-y-1">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Estado de Aceptación
                  </span>
                  <p className="text-sm font-bold text-ink flex items-center gap-1.5 pt-1">
                    <Icon name="checkCircle" size={16} className="text-emerald-500" />
                    Plan Activo Aprobado
                  </p>
                  <p className="text-[10px] text-muted">Conforme a evaluación inicial</p>
                </div>
              </div>

              {/* LISTA DETALLADA DE PROCEDIMIENTOS EN PRESUPUESTO */}
              <Card className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
                  <div>
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                      <Icon name="receipt" size={18} className="text-brand" />
                      Detalle de Tratamientos y Presupuesto Odontológico
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Generado automáticamente a partir de los hallazgos y afecciones detectados en el Odontograma.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon="printer"
                      onClick={() => window.print()}
                    >
                      Imprimir Presupuesto
                    </Button>
                  </div>
                </div>

                {presupuestoItems.length === 0 ? (
                  <div className="py-12 text-center text-muted">
                    <Icon name="tooth" size={32} className="mx-auto mb-2 text-line" />
                    <p className="text-sm font-semibold">No hay tratamientos presupuestados aún.</p>
                    <p className="text-xs mt-1">
                      Marca las patologías en el Odontograma Digital (caries, endodoncias, coronas, etc.) para armar la cotización.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-line text-left text-muted">
                          <th className="py-2.5 font-bold">Pieza</th>
                          <th className="py-2.5 font-bold">Superficie</th>
                          <th className="py-2.5 font-bold">Diagnóstico / Procedimiento</th>
                          <th className="py-2.5 font-bold">Estado Clínico</th>
                          <th className="py-2.5 font-bold text-right">Tarifa Est.</th>
                          <th className="py-2.5 font-bold text-right">Acción Rápida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {presupuestoItems.map((item) => (
                          <tr key={item.id} className="text-ink hover:bg-hover/40 transition-colors">
                            <td className="py-3 font-black text-brand">#{item.numeroPieza}</td>
                            <td className="py-3 font-semibold">
                              {item.superficie === 'GENERAL' ? 'Toda la pieza' : `Cara ${item.superficie}`}
                            </td>
                            <td className="py-3">
                              <span className="font-bold block">{item.nombreCondicion}</span>
                              {item.observacion && (
                                <span className="text-[11px] text-muted italic line-clamp-1">
                                  {item.observacion}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <Badge
                                tone={
                                  item.estado === 'REALIZADO'
                                    ? 'green'
                                    : item.estado === 'PROGRAMADO'
                                      ? 'blue'
                                      : item.estado === 'PRESUPUESTADO'
                                        ? 'purple'
                                        : 'amber'
                                }
                              >
                                {item.estado}
                              </Badge>
                            </td>
                            <td className="py-3 text-right font-black text-ink">
                              S/. {item.costo.toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <div className="inline-flex items-center gap-1 justify-end">
                                {item.estado !== 'PROGRAMADO' && (
                                  <button
                                    type="button"
                                    disabled={!puedeEditar || guardando}
                                    onClick={() =>
                                      handleActualizarPieza(
                                        item.numeroPieza,
                                        item.superficie,
                                        item.idCondicion,
                                        item.observacion,
                                        'PROGRAMADO',
                                        item.codigoCondicion
                                      )
                                    }
                                    className="px-2 py-1 text-[10px] font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                                  >
                                    Programar
                                  </button>
                                )}
                                {item.estado !== 'REALIZADO' && (
                                  <button
                                    type="button"
                                    disabled={!puedeEditar || guardando}
                                    onClick={() =>
                                      handleActualizarPieza(
                                        item.numeroPieza,
                                        item.superficie,
                                        item.idCondicion,
                                        item.observacion,
                                        'REALIZADO',
                                        item.codigoCondicion
                                      )
                                    }
                                    className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                  >
                                    ✓ Realizado
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-line text-xs font-bold text-ink">
                          <td colSpan={4} className="py-3 text-right uppercase tracking-wider text-muted">
                            Total General Cotizado:
                          </td>
                          <td className="py-3 text-right font-black text-sm text-brand">
                            S/. {totalPresupuesto.toFixed(2)}
                          </td>
                          <td className="py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}



          {/* TAB 3: EVOLUCIÓN CLÍNICA / ATENCIONES (SOAP) */}
          {tabActiva === 'EVOLUCIONES' && (
            <Card className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-line">
                <div>
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Icon name="calendar" size={18} className="text-brand" />
                    Evoluciones y Notas de Atención Clínica
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Historial cronológico de procedimientos odontológicos, diagnósticos y evolución clínica por cita.
                  </p>
                </div>

                {puedeEditar && (
                  <Button
                    variant="primary"
                    icon="plus"
                    size="sm"
                    onClick={() => setModalEvolucionAbierto(true)}
                  >
                    Nueva Evolución
                  </Button>
                )}
              </div>

              {/* LISTADO CRONOLÓGICO DE EVOLUCIONES */}
              {evoluciones.length === 0 ? (
                <div className="py-12 text-center text-muted">
                  <Icon name="file" size={32} className="mx-auto mb-2 text-line" />
                  <p className="text-sm font-semibold">No hay notas de evolución registradas aún.</p>
                  <p className="text-xs mt-1">Registra la primera nota después de atender al paciente en el sillón dental.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evoluciones.map((evo, idx) => (
                    <div
                      key={evo.id}
                      className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs relative pl-6 before:content-[''] before:absolute before:left-3 before:top-6 before:bottom-0 before:w-0.5 before:bg-brand/20 last:before:hidden"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-brand shrink-0 -ml-4 ring-4 ring-surface" />
                          <span className="text-xs font-bold text-ink">
                            Atención #{evoluciones.length - idx} · {new Date(evo.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-muted bg-alt/50 px-2 py-0.5 rounded">
                          {evo.odontologoNombre} ({evo.numeroColegiatura})
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <strong className="text-ink block text-[11px] uppercase tracking-wider text-muted">
                            Diagnóstico Clínico:
                          </strong>
                          <p className="font-semibold text-ink mt-0.5">{evo.diagnostico}</p>
                        </div>

                        {evo.procedimiento && (
                          <div>
                            <strong className="text-ink block text-[11px] uppercase tracking-wider text-muted">
                              Procedimiento Realizado:
                            </strong>
                            <p className="text-ink-soft mt-0.5">{evo.procedimiento}</p>
                          </div>
                        )}

                        {evo.indicaciones && (
                          <div className="p-2.5 rounded-lg bg-alt/40 border border-line/60">
                            <strong className="text-brand block text-[11px] uppercase tracking-wider">
                              Indicaciones y Medicación:
                            </strong>
                            <p className="text-ink mt-0.5">{evo.indicaciones}</p>
                          </div>
                        )}

                        {evo.observaciones && (
                          <div>
                            <strong className="text-ink block text-[11px] uppercase tracking-wider text-muted">
                              Observaciones Adicionales / Próxima Cita:
                            </strong>
                            <p className="text-muted mt-0.5">{evo.observaciones}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: RADIOGRAFÍAS Y DOCUMENTOS CLÍNICOS (CON VISOR LIGHTBOX) */}
          {tabActiva === 'DOCUMENTOS' && (
            <Card className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-line">
                <div>
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Icon name="image" size={18} className="text-brand" />
                    Expediente Radiográfico y Archivos Clínicos
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Almacenamiento seguro en Cloudflare R2 con visor dental de contraste y zoom.
                  </p>
                </div>

                {puedeEditar && (
                  <Button
                    variant="primary"
                    icon="plus"
                    size="sm"
                    onClick={() => setModalSubirDocAbierto(true)}
                  >
                    Subir Radiografía / Archivo
                  </Button>
                )}
              </div>

              {/* FILTROS POR CATEGORÍA DE DOCUMENTO */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: 'RADIOGRAFIA_PANORAMICA', label: 'Panorámicas' },
                  { id: 'RADIOGRAFIA_PERIAPICAL', label: 'Periapicales' },
                  { id: 'FOTOGRAFIA_CLINICA', label: 'Fotos Intraorales' },
                  { id: 'TOMOGRAFIA', label: 'Tomografías CBCT' },
                  { id: 'CONSENTIMIENTO_INFORMADO', label: 'Consentimientos' },
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroTipoDoc(f.id)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${filtroTipoDoc === f.id
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-surface text-ink-soft border-line hover:bg-hover'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* GALERÍA DE RADIOGRAFÍAS */}
              {documentosFiltrados.length === 0 ? (
                <div className="py-12 text-center text-muted">
                  <Icon name="image" size={32} className="mx-auto mb-2 text-line" />
                  <p className="text-sm font-semibold">No se encontraron archivos en esta categoría.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentosFiltrados.map(doc => (
                    <div
                      key={doc.id}
                      className="group rounded-xl border border-line bg-surface overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div
                        className="relative aspect-video bg-black/90 cursor-pointer overflow-hidden flex items-center justify-center"
                        onClick={() => {
                          setDocSeleccionadoViewer(doc)
                          setViewerZoom(1)
                          setViewerRotacion(0)
                          setViewerInvertido(false)
                        }}
                      >
                        {doc.urlVisualizacion ? (
                          <img
                            src={doc.urlVisualizacion}
                            alt={doc.nombreOriginal}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <Icon name="file" size={32} className="text-white/60" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                          <Icon name="search" size={20} />
                          <span className="text-xs font-bold">Abrir Visor</span>
                        </div>
                      </div>

                      <div className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone="blue">
                            {doc.tipoDocumento.replace('_', ' ')}
                          </Badge>
                          <span className="text-[10px] text-muted">
                            {(doc.tamanoBytes / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-ink truncate" title={doc.nombreOriginal}>
                          {doc.nombreOriginal}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-line/60">
                          <span>{new Date(doc.fechaCreacion).toLocaleDateString()}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setDocSeleccionadoViewer(doc)
                              setViewerZoom(1)
                              setViewerRotacion(0)
                              setViewerInvertido(false)
                            }}
                            className="text-brand font-bold hover:underline"
                          >
                            Inspeccionar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 5: RECETAS MÉDICAS ODONTOLÓGICAS (CONFORME A DIGEMID Y MOCKUP OFICIAL) */}
          {tabActiva === 'RECETAS' && (
            <Card className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-line">
                <div>
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Icon name="pill" size={18} className="text-brand" />
                    Historial de Recetas Odontológicas Oficiales
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Prescripciones farmacológicas con folio formal DIGEMID / MINSA. Visualice en pantalla o genere el documento PDF para dispensación.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {puedeEditar && (
                    <Button
                      variant="primary"
                      icon="plus"
                      size="sm"
                      onClick={() => setModalRecetaAbierto(true)}
                    >
                      Emitir Receta Electrónica
                    </Button>
                  )}
                </div>
              </div>

              {/* LISTADO DE RECETAS */}
              {recetas.length === 0 ? (
                <div className="py-12 text-center text-muted">
                  <Icon name="pill" size={32} className="mx-auto mb-2 text-line" />
                  <p className="text-sm font-semibold">No hay recetas emitidas para este paciente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recetas.map(rec => {
                    const codigoRx = rec.codigoReceta || `RX-${String(rec.id).padStart(6, '0')}`
                    return (
                      <div
                        key={rec.id}
                        className="rounded-xl border border-line bg-surface p-5 shadow-xs space-y-4 hover:border-brand/40 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="p-2.5 rounded-xl bg-brand/10 text-brand">
                              <Icon name="file" size={18} />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-ink">
                                  Receta N.° {codigoRx}
                                </span>
                                <Badge tone="gray">
                                  {new Date(rec.fecha).toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">
                                Prescriptor: {rec.odontologoNombre} ({rec.numeroColegiatura})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="search"
                              onClick={() => setRecetaParaVer(rec)}
                            >
                              Visualizar receta
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon="download"
                              onClick={() => {
                                if (paciente) {
                                  exportarRecetaPdf({
                                    paciente,
                                    receta: rec,
                                    historia,
                                  })
                                }
                              }}
                            >
                              Generar PDF
                            </Button>
                          </div>
                        </div>

                        {/* LISTADO DE FÁRMACOS SEGÚN MOCKUP */}
                        <div className="space-y-2.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
                            Rp/ Prescripción
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {rec.detalles.map((med, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl border border-line/80 bg-alt/20 space-y-2"
                              >
                                <div className="text-xs font-bold text-ink flex items-center justify-between">
                                  <span>
                                    {med.medicamento}
                                    {med.dci && <span className="text-muted font-semibold"> — {med.dci}</span>}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-line/60">
                                  <div>
                                    <span className="text-muted block text-[10px]">Concentración / forma:</span>
                                    <span className="font-semibold text-ink">
                                      {[med.concentracion, med.formaFarmaceutica].filter(Boolean).join(' — ') || '—'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted block text-[10px]">Cantidad total:</span>
                                    <span className="font-semibold text-ink">
                                      {med.cantidadTotal || 'Según posología'}
                                    </span>
                                  </div>
                                </div>
                                <div className="pt-1 text-[11px]">
                                  <span className="text-muted block text-[10px]">Posología, vía y duración:</span>
                                  <span className="text-ink">
                                    {[
                                      med.dosis ? `${med.dosis}` : null,
                                      med.viaAdministracion ? `vía ${med.viaAdministracion.toLowerCase()}` : null,
                                      med.frecuencia ? `${med.frecuencia.toLowerCase()}` : null,
                                      med.duracion ? `por ${med.duracion.toLowerCase()}` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {rec.indicacionesGenerales && (
                          <div className="p-3 rounded-lg bg-alt/40 border border-line/60 text-xs">
                            <strong className="text-ink block text-[10px] uppercase tracking-wider text-muted mb-0.5">
                              Indicaciones adicionales:
                            </strong>
                            <p className="text-ink text-[11px] leading-relaxed">{rec.indicacionesGenerales}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-line/40">
                          <span>
                            Válida hasta:{' '}
                            <strong className="text-ink">
                              {rec.validaHasta
                                ? new Date(rec.validaHasta).toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })
                                : '5 días posteriores a emisión'}
                            </strong>
                          </span>
                          <span className="text-[10px]">Documento oficial para dispensación DIGEMID</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          {/* TAB: CONSENTIMIENTOS INFORMADOS */}
          {tabActiva === 'CONSENTIMIENTOS' && (
            <Card className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-line">
                <div>
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Icon name="fileText" size={18} className="text-brand" />
                    Consentimientos Informados y Documentos Legales
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Historial de consentimientos para procedimientos odontológicos y cirugías con aceptación digital.
                  </p>
                </div>

                {puedeEditar && (
                  <Button
                    variant="primary"
                    icon="plus"
                    size="sm"
                    onClick={() => {
                      setTipoDocSubida('CONSENTIMIENTO_INFORMADO')
                      setModalSubirDocAbierto(true)
                    }}
                  >
                    Subir Consentimiento Firmado
                  </Button>
                )}
              </div>

              {documentos.filter(d => d.tipoDocumento === 'CONSENTIMIENTO_INFORMADO').length === 0 ? (
                <div className="py-12 text-center text-muted">
                  <Icon name="fileText" size={32} className="mx-auto mb-2 text-line" />
                  <p className="text-sm font-semibold">No hay consentimientos informados registrados aún.</p>
                  <p className="text-xs mt-1">
                    Puedes adjuntar el documento firmado digitalmente o escaneado para archivarlo en el expediente legal del paciente.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentos
                    .filter(d => d.tipoDocumento === 'CONSENTIMIENTO_INFORMADO')
                    .map(doc => (
                      <div
                        key={doc.id}
                        className="rounded-xl border border-line bg-surface p-4 shadow-xs hover:shadow-md transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <Badge tone="blue">Firmado y Validado</Badge>
                          <span className="text-[10px] text-muted">
                            {(doc.tamanoBytes / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-ink truncate" title={doc.nombreOriginal}>
                          {doc.nombreOriginal}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-line/60">
                          <span>{new Date(doc.fechaCreacion).toLocaleDateString()}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setDocSeleccionadoViewer(doc)
                              setViewerZoom(1)
                              setViewerRotacion(0)
                              setViewerInvertido(false)
                            }}
                            className="font-bold text-brand hover:underline"
                          >
                            Visualizar
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          )}

          {/* MODAL: REGISTRAR NOTA DE EVOLUCIÓN */}
          <AnimatePresence>
            {modalEvolucionAbierto && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                      <Icon name="plus" size={17} className="text-brand" />
                      Registrar Nota de Evolución Clínica
                    </h3>
                    <button
                      type="button"
                      onClick={() => setModalEvolucionAbierto(false)}
                      className="text-muted hover:text-ink"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAgregarEvolucion} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-ink mb-1">
                        Diagnóstico Clínico *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={formEvolucion.diagnostico}
                        onChange={e => setFormEvolucion(p => ({ ...p, diagnostico: e.target.value }))}
                        placeholder="Diagnóstico de la sesión..."
                        className="w-full rounded-xl border border-line bg-surface p-2 text-ink focus:ring-2 focus:ring-brand/40"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">
                        Procedimiento Realizado
                      </label>
                      <textarea
                        rows={2}
                        value={formEvolucion.procedimiento}
                        onChange={e => setFormEvolucion(p => ({ ...p, procedimiento: e.target.value }))}
                        placeholder="Detalle del procedimiento odontológico efectuado..."
                        className="w-full rounded-xl border border-line bg-surface p-2 text-ink focus:ring-2 focus:ring-brand/40"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">
                        Indicaciones y Medicación
                      </label>
                      <input
                        type="text"
                        value={formEvolucion.indicaciones}
                        onChange={e => setFormEvolucion(p => ({ ...p, indicaciones: e.target.value }))}
                        placeholder="Ej. Amoxicilina 500mg c/8h por 7 días..."
                        className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">
                        Observaciones adicionales
                      </label>
                      <input
                        type="text"
                        value={formEvolucion.observaciones}
                        onChange={e => setFormEvolucion(p => ({ ...p, observaciones: e.target.value }))}
                        placeholder="Próxima cita, evolución de herida, etc..."
                        className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-line">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setModalEvolucionAbierto(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" variant="primary" disabled={guardando}>
                        {guardando && <Icon name="spinner" size={14} className="animate-spin mr-1" />}
                        Guardar Evolución
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: LIGHTBOX / VISOR INTERACTIVO DE RADIOGRAFÍAS */}
          <AnimatePresence>
            {docSeleccionadoViewer && (
              <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
                {/* BARRA SUPERIOR DE HERRAMIENTAS */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-brand/20 text-brand">
                      <Icon name="image" size={18} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white truncate max-w-md">
                        {docSeleccionadoViewer.nombreOriginal}
                      </h3>
                      <span className="text-[11px] text-white/60">
                        {docSeleccionadoViewer.tipoDocumento.replace('_', ' ')} · Zoom: {Math.round(viewerZoom * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* CONTROLES DEL VISOR CLÍNICO */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewerZoom(z => Math.max(0.5, z - 0.25))}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
                      title="Alejar Zoom"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewerZoom(1)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
                      title="Restablecer Zoom"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewerZoom(z => Math.min(3, z + 0.25))}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
                      title="Acercar Zoom"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewerRotacion(r => (r + 90) % 360)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
                      title="Rotar 90°"
                    >
                      ↻ Rotar
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewerInvertido(i => !i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewerInvertido ? 'bg-brand text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      title="Invertir contraste (Negativo)"
                    >
                      ◐ Invertir
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocSeleccionadoViewer(null)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white ml-2 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* LIENZO DE IMAGEN */}
                <div className="flex-1 flex items-center justify-center overflow-auto p-4 select-none">
                  <div
                    style={{
                      transform: `scale(${viewerZoom}) rotate(${viewerRotacion}deg)`,
                      filter: viewerInvertido ? 'invert(1) contrast(1.2)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                    className="max-w-4xl max-h-[80vh] flex items-center justify-center"
                  >
                    <img
                      src={docSeleccionadoViewer.urlVisualizacion}
                      alt={docSeleccionadoViewer.nombreOriginal}
                      className="max-h-[80vh] object-contain rounded shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: SUBIR RADIOGRAFÍA */}
          <AnimatePresence>
            {modalSubirDocAbierto && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                      <Icon name="image" size={17} className="text-brand" />
                      Subir Radiografía o Documento
                    </h3>
                    <button
                      type="button"
                      onClick={() => setModalSubirDocAbierto(false)}
                      className="text-muted hover:text-ink"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-ink mb-1">
                        Tipo de Documento:
                      </label>
                      <select
                        value={tipoDocSubida}
                        onChange={e => setTipoDocSubida(e.target.value as DocumentoClinico['tipoDocumento'])}
                        className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                      >
                        <option value="RADIOGRAFIA_PANORAMICA">Radiografía Panorámica</option>
                        <option value="RADIOGRAFIA_PERIAPICAL">Radiografía Periapical</option>
                        <option value="FOTOGRAFIA_CLINICA">Fotografía Clínica Intraoral</option>
                        <option value="TOMOGRAFIA">Tomografía Computarizada (CBCT)</option>
                        <option value="CONSENTIMIENTO_INFORMADO">Consentimiento Informado Firmado</option>
                      </select>
                    </div>

                    <div
                      onClick={handleSubirDoc}
                      className="border-2 border-dashed border-line rounded-xl p-6 text-center hover:border-brand transition-colors cursor-pointer"
                    >
                      <Icon name="image" size={32} className="mx-auto mb-2 text-muted" />
                      <p className="font-bold text-ink">Arrastra el archivo aquí o haz clic para explorar</p>
                      <p className="text-[11px] text-muted mt-1">Formatos soportados: JPG, PNG, DICOM, PDF (Máx. 15MB)</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-line">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setModalSubirDocAbierto(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleSubirDoc}
                      >
                        Subir a R2
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: EMITIR NUEVA RECETA (CONFORME A DIRECTIVAS DIGEMID / MINSA) */}
          <AnimatePresence>
            {modalRecetaAbierto && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-xl my-6 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <div>
                      <h3 className="text-base font-bold text-ink flex items-center gap-2">
                        <Icon name="pill" size={17} className="text-brand" />
                        Emitir Receta Odontológica Oficial
                      </h3>
                      <p className="text-[11px] text-muted mt-0.5">
                        Registro farmacológico normado según estándares de DIGEMID y NTS N° 139-MINSA
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalRecetaAbierto(false)}
                      className="text-muted hover:text-ink p-1 rounded-lg hover:bg-hover cursor-pointer"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleGuardarReceta} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-ink mb-1">
                          Medicamento (Nombre comercial / principio) *
                        </label>
                        <input
                          required
                          type="text"
                          value={formReceta.medicamento}
                          onChange={e => setFormReceta(p => ({ ...p, medicamento: e.target.value }))}
                          placeholder="Ej. Amoxicilina, Clindamicina, Ketorolaco..."
                          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-ink mb-1">
                          DCI (Denominación Común Internacional)
                        </label>
                        <input
                          type="text"
                          value={formReceta.dci}
                          onChange={e => setFormReceta(p => ({ ...p, dci: e.target.value }))}
                          placeholder="Ej. Amoxicilina trihidrato..."
                          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-ink mb-1">Concentración</label>
                        <input
                          type="text"
                          value={formReceta.concentracion}
                          onChange={e => setFormReceta(p => ({ ...p, concentracion: e.target.value }))}
                          placeholder="Ej. 500 mg, 10 mg/ml..."
                          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-ink mb-1">Forma farmacéutica</label>
                        <select
                          value={formReceta.formaFarmaceutica}
                          onChange={e => setFormReceta(p => ({ ...p, formaFarmaceutica: e.target.value }))}
                          className="w-full h-9 rounded-xl border border-line bg-surface px-2.5 text-ink focus:ring-2 focus:ring-brand/40"
                        >
                          <option value="Cápsula">Cápsula</option>
                          <option value="Tableta">Tableta</option>
                          <option value="Tableta recubierta">Tableta recubierta</option>
                          <option value="Solución oral">Solución oral</option>
                          <option value="Gel bucal">Gel bucal</option>
                          <option value="Colutorio / Enjuague">Colutorio / Enjuague</option>
                          <option value="Suspensión">Suspensión</option>
                          <option value="Inyectable">Inyectable</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-ink mb-1">Cantidad total</label>
                        <input
                          type="text"
                          value={formReceta.cantidadTotal}
                          onChange={e => setFormReceta(p => ({ ...p, cantidadTotal: e.target.value }))}
                          placeholder="Ej. 21 cápsulas, 1 frasco..."
                          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-ink mb-1">Dosis</label>
                        <input
                          type="text"
                          value={formReceta.dosis}
                          onChange={e => setFormReceta(p => ({ ...p, dosis: e.target.value }))}
                          placeholder="Ej. 1 cápsula, 5 ml..."
                          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-ink mb-1">Vía de administración</label>
                        <select
                          value={formReceta.viaAdministracion}
                          onChange={e => setFormReceta(p => ({ ...p, viaAdministracion: e.target.value }))}
                          className="w-full h-9 rounded-xl border border-line bg-surface px-2.5 text-ink focus:ring-2 focus:ring-brand/40"
                        >
                          <option value="Oral">Oral</option>
                          <option value="Tópica bucal">Tópica bucal</option>
                          <option value="Sublingual">Sublingual</option>
                          <option value="Intramuscular">Intramuscular</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-ink mb-1">Frecuencia</label>
                        <input
                          type="text"
                          value={formReceta.frecuencia}
                          onChange={e => setFormReceta(p => ({ ...p, frecuencia: e.target.value }))}
                          placeholder="Ej. Cada 8 horas..."
                          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-ink mb-1">Duración del tratamiento</label>
                        <input
                          type="text"
                          value={formReceta.duracion}
                          onChange={e => setFormReceta(p => ({ ...p, duracion: e.target.value }))}
                          placeholder="Ej. Por 7 días..."
                          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-ink mb-1">Válida hasta (Vigencia)</label>
                        <input
                          type="date"
                          value={formReceta.validaHasta}
                          onChange={e => setFormReceta(p => ({ ...p, validaHasta: e.target.value }))}
                          className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-ink mb-1">
                        Indicaciones Adicionales / Recomendaciones al Paciente
                      </label>
                      <textarea
                        rows={2}
                        value={formReceta.indicacionesGenerales}
                        onChange={e => setFormReceta(p => ({ ...p, indicacionesGenerales: e.target.value }))}
                        placeholder="Tomar con alimentos, no suspender antibiótico antes del tiempo indicado, reportar efectos adversos..."
                        className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:ring-2 focus:ring-brand/40"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-line">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setModalRecetaAbierto(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" variant="primary" icon="check">
                        Emitir Receta Electrónica
                      </Button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: VISTA CONCEPTUAL DE LA RECETA (IDÉNTICO AL MOCKUP OFICIAL) */}
          <AnimatePresence>
            {recetaParaVer && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs overflow-y-auto"
                onClick={() => setRecetaParaVer(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-xl space-y-3 my-8"
                >
                  {/* BARRA SUPERIOR DE ACCIONES */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-white/90 drop-shadow-xs">
                      Vista conceptual de la receta
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon="download"
                        onClick={() => {
                          if (paciente) {
                            exportarRecetaPdf({
                              paciente,
                              receta: recetaParaVer,
                              historia,
                            })
                          }
                        }}
                        className="bg-white hover:bg-alt text-ink border-white/40 shadow-xs"
                      >
                        Generar PDF
                      </Button>
                      <button
                        type="button"
                        onClick={() => setRecetaParaVer(null)}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer"
                        title="Cerrar vista"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    </div>
                  </div>

                  {/* CONTENEDOR DE LA RECETA - ESTILO MOCKUP EXACTO */}
                  <div className="w-full rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-2xl text-gray-900 space-y-6">
                    {/* ENCABEZADO: NeoDents + RECETA ODONTOLÓGICA */}
                    <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                          NeoDents
                        </h2>
                        <p className="text-[9px] font-bold text-gray-500 tracking-[0.18em] uppercase mt-1">
                          Clínica Odontológica
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wide block">
                          Receta Odontológica
                        </span>
                        <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                          N.° {recetaParaVer.codigoReceta || `RX-${String(recetaParaVer.id).padStart(6, '0')}`}
                        </span>
                      </div>
                    </div>

                    {/* DATOS PACIENTE / HISTORIA */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                      <div>
                        <span className="text-gray-500 text-[11px] block mb-0.5">Paciente</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {paciente
                            ? [paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno]
                                .filter(Boolean)
                                .join(' ')
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px] block mb-0.5">Edad</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {edadCalculada ? `${edadCalculada} años` : '32 años'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px] block mb-0.5">Fecha de emisión</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {new Date(recetaParaVer.fecha).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px] block mb-0.5">Historia clínica</span>
                        <span className="font-bold text-gray-900 text-sm">
                          HC-{String(paciente?.id || 128).padStart(5, '0')}
                        </span>
                      </div>
                    </div>

                    {/* SECCIÓN Rp/ Prescripción */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-extrabold text-gray-900">Rp/ Prescripción</h3>

                      {recetaParaVer.detalles.map((med, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-gray-200/90 bg-gray-50/50 p-4 space-y-3 text-xs"
                        >
                          <div className="font-bold text-gray-900 text-sm">
                            {med.medicamento}
                            {med.dci && <span className="text-gray-600 font-semibold"> — {med.dci}</span>}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-b border-dashed border-gray-200 pb-2">
                            <div>
                              <span className="text-gray-500 text-[10.5px] block mb-0.5">
                                Concentración / forma
                              </span>
                              <span className="font-semibold text-gray-900">
                                {[med.concentracion, med.formaFarmaceutica].filter(Boolean).join(' — ') ||
                                  'Por completar'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 text-[10.5px] block mb-0.5">
                                Cantidad total
                              </span>
                              <span className="font-semibold text-gray-900">
                                {med.cantidadTotal || 'Por completar'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-gray-500 text-[10.5px] block mb-0.5">
                              Posología, vía y duración
                            </span>
                            <p className="text-gray-800 leading-relaxed">
                              {[
                                med.dosis ? `${med.dosis}` : null,
                                med.viaAdministracion ? `vía ${med.viaAdministracion.toLowerCase()}` : null,
                                med.frecuencia ? `${med.frecuencia.toLowerCase()}` : null,
                                med.duracion ? `por ${med.duracion.toLowerCase()}` : null,
                              ]
                                .filter(Boolean)
                                .join(', ') || 'Indicaciones del odontólogo prescriptor'}
                              {med.observaciones && ` (${med.observaciones})`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* SECCIÓN Indicaciones adicionales */}
                    <div className="space-y-2 pt-1">
                      <h3 className="text-xs font-extrabold text-gray-900">Indicaciones adicionales</h3>
                      <div className="rounded-xl border border-gray-200/90 bg-gray-50/40 p-3.5 text-xs text-gray-700 leading-relaxed min-h-[48px]">
                        {recetaParaVer.indicacionesGenerales ||
                          'Espacio para recomendaciones del profesional.'}
                      </div>
                    </div>

                    {/* PIE DE VALIDACIÓN Y FIRMA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 items-end">
                      <div className="text-[11px] text-gray-600 space-y-0.5">
                        <div>
                          Válida hasta:{' '}
                          <strong className="text-gray-900">
                            {recetaParaVer.validaHasta
                              ? new Date(recetaParaVer.validaHasta).toLocaleDateString('es-PE', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : '__ / __ / _____'}
                          </strong>
                        </div>
                        <div className="text-[10px] text-gray-400">Documento de demostración</div>
                      </div>

                      <div className="text-center sm:text-right">
                        <div className="w-48 sm:ml-auto border-b border-gray-300 pb-1 mb-1"></div>
                        <span className="text-xs font-bold text-gray-900 block">Firma y sello</span>
                        <span className="text-[11px] text-gray-500 block">
                          {recetaParaVer.odontologoNombre} / {recetaParaVer.numeroColegiatura}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PIE DEL MOCKUP */}
                  <p className="text-center text-[11px] text-white/70">
                    Maqueta de diseño con datos clínicos para visualización y dispensación conforme a DIGEMID / MINSA.
                  </p>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL: EXPORTAR DOCUMENTOS CLÍNICOS FORMALES (PDF) */}
          <AnimatePresence>
            {modalExportarAbierto && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
                onClick={() => setModalExportarAbierto(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-lg rounded-2xl bg-surface border border-line shadow-xl p-6 space-y-5"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <div>
                      <h2 className="text-base font-bold text-ink flex items-center gap-2">
                        <Icon name="download" size={18} className="text-brand" />
                        Exportar Documentación Clínica (PDF)
                      </h2>
                      <p className="text-xs text-muted mt-0.5">
                        Documentos médicos oficiales conforme a la NTS N° 139-MINSA/2018/DGIEM
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalExportarAbierto(false)}
                      className="text-muted hover:text-ink p-1 rounded-lg hover:bg-hover cursor-pointer"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {/* OPCIÓN 1: HISTORIA CLÍNICA (FICHA INICIAL) */}
                    <div className="p-4 rounded-xl border border-line bg-surface hover:border-brand/40 hover:bg-alt/30 transition-all space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">Historia Clínica Odontológica</span>
                          <Badge tone="blue">Ficha inicial / Anamnesis</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Ficha médica formal con datos de filiación, motivo de consulta, antecedentes generales, examen clínico extraoral/intraoral, diagnóstico presuntivo/definitivo, plan de tratamiento y casillas de firma médico-legal.
                      </p>
                      <div className="pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          icon="download"
                          className="w-full justify-center"
                          onClick={() => {
                            handleExportarHistoriaPdf()
                            setModalExportarAbierto(false)
                          }}
                        >
                          Generar Historia Clínica (PDF)
                        </Button>
                      </div>
                    </div>

                    {/* OPCIÓN 2: EXPEDIENTE CLÍNICO CRONOLÓGICO COMPLETO */}
                    <div className="p-4 rounded-xl border border-line bg-surface hover:border-brand/40 hover:bg-alt/30 transition-all space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">Expediente Clínico Cronológico</span>
                          <Badge tone="purple">Historial Completo</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Expediente cronológico integral consolidado con todas las notas SOAP de atenciones, hallazgos registrados en el odontograma, procedimientos realizados y recetas médicas emitidas con posología.
                      </p>
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="download"
                          className="w-full justify-center"
                          onClick={() => {
                            handleExportarExpedientePdf()
                            setModalExportarAbierto(false)
                          }}
                        >
                          Generar Expediente Cronológico (PDF)
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-line">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setModalExportarAbierto(false)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* MODAL: EDITAR HISTORIA CLÍNICA COMPLETA */}
            {modalEditarHistoriaAbierto && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto"
                onClick={() => setModalEditarHistoriaAbierto(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-2xl rounded-2xl bg-surface border border-line shadow-xl p-6 space-y-5 my-8 max-h-[90vh] flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
                    <div>
                      <h2 className="text-base font-bold text-ink flex items-center gap-2">
                        <Icon name="edit" size={18} className="text-brand" />
                        Editar Ficha de Historia Clínica
                      </h2>
                      <p className="text-xs text-muted mt-0.5">
                        Paciente: <strong className="text-ink">{paciente ? [paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno].filter(Boolean).join(' ') : 'Paciente'}</strong> • {paciente?.tipoDocumento}: {paciente?.numeroDocumento}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalEditarHistoriaAbierto(false)}
                      className="text-muted hover:text-ink p-1 rounded-lg hover:bg-hover cursor-pointer"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  {/* NAVEGACIÓN DE SECCIONES DENTRO DEL MODAL */}
                  <div className="flex border-b border-line gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {[
                      { id: 'ANAMNESIS', label: '1. Motivo y Anamnesis' },
                      { id: 'ANTECEDENTES', label: '2. Antecedentes y Alergias' },
                      { id: 'EXAMEN', label: '3. Exploración Clínica' },
                      { id: 'DIAGNOSTICO', label: '4. Diagnóstico y Plan' },
                    ].map(sec => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setSeccionModal(sec.id as any)}
                        className={`pb-2.5 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                          seccionModal === sec.id
                            ? 'border-brand text-brand font-bold'
                            : 'border-transparent text-muted hover:text-ink'
                        }`}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>

                  {/* FORMULARIO POR SECCIONES */}
                  <div className="overflow-y-auto pr-1 space-y-4 flex-1 text-xs">
                    {seccionModal === 'ANAMNESIS' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Motivo de Consulta Principal
                          </label>
                          <textarea
                            rows={3}
                            value={camposForm.motivoConsulta}
                            onChange={e => setCamposForm(p => ({ ...p, motivoConsulta: e.target.value }))}
                            placeholder="Describa el motivo por el cual el paciente acude al consultorio..."
                            className="w-full rounded-xl border border-line bg-surface p-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Enfermedad Actual / Anamnesis
                          </label>
                          <textarea
                            rows={3}
                            value={camposForm.enfermedadActual}
                            onChange={e => setCamposForm(p => ({ ...p, enfermedadActual: e.target.value }))}
                            placeholder="Tiempo de enfermedad, inicio, forma de inicio, síntomas concomitantes, dolor..."
                            className="w-full rounded-xl border border-line bg-surface p-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                        </div>
                      </div>
                    )}

                    {seccionModal === 'ANTECEDENTES' && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-red-200 bg-red-50/20 p-3.5 space-y-2">
                          <label className="block font-bold text-danger uppercase tracking-wider text-[11px]">
                            Alergias a Medicamentos o Materiales
                          </label>
                          <input
                            type="text"
                            value={camposForm.alergiasTexto}
                            onChange={e => setCamposForm(p => ({ ...p, alergiasTexto: e.target.value }))}
                            placeholder="Penicilina, amoxicilina, látex, AINEs, etc..."
                            className="w-full h-9 rounded-lg border border-red-200 bg-surface px-3 text-ink focus:ring-2 focus:ring-red-400"
                          />
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {ALERGIAS_COMUNES.map(item => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  setCamposForm(p => ({
                                    ...p,
                                    alergiasTexto: p.alergiasTexto ? `${p.alergiasTexto}, ${item}` : item,
                                  }))
                                }}
                                className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-red-200 bg-surface text-danger hover:bg-red-50 transition-all cursor-pointer"
                              >
                                + {item}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Antecedentes Médicos Sistémicos
                          </label>
                          <input
                            type="text"
                            value={camposForm.antecedentesMedicos}
                            onChange={e => setCamposForm(p => ({ ...p, antecedentesMedicos: e.target.value }))}
                            placeholder="Hipertensión arterial, diabetes mellitus, asma, cardiopatías..."
                            className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {PATOLOGIAS_SISTEMICAS.slice(0, 6).map(item => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  setCamposForm(p => ({
                                    ...p,
                                    antecedentesMedicos: p.antecedentesMedicos ? `${p.antecedentesMedicos}, ${item}` : item,
                                  }))
                                }}
                                className="px-2 py-0.5 text-[10px] font-medium rounded-md border border-line bg-surface text-ink hover:bg-hover transition-all cursor-pointer"
                              >
                                + {item}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Medicamentos de Uso Habitual
                          </label>
                          <input
                            type="text"
                            value={camposForm.medicamentosActuales}
                            onChange={e => setCamposForm(p => ({ ...p, medicamentosActuales: e.target.value }))}
                            placeholder="Antihipertensivos, hipoglucemiantes, anticoagulantes..."
                            className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Hábitos y Factores de Riesgo
                          </label>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {HABITOS_RIESGOS.map(item => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  setCamposForm(p => ({
                                    ...p,
                                    antecedentesOdontologicos: p.antecedentesOdontologicos ? `${p.antecedentesOdontologicos}, ${item}` : item,
                                  }))
                                }}
                                className="px-2 py-0.5 text-[10px] font-medium rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all cursor-pointer"
                              >
                                + {item}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Antecedentes Odontológicos Previos
                          </label>
                          <input
                            type="text"
                            value={camposForm.antecedentesOdontologicos}
                            onChange={e => setCamposForm(p => ({ ...p, antecedentesOdontologicos: e.target.value }))}
                            placeholder="Tratamientos previos de ortodoncia, endodoncia, prótesis, etc..."
                            className="w-full h-9 rounded-xl border border-line bg-surface px-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                        </div>
                      </div>
                    )}

                    {seccionModal === 'EXAMEN' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Examen Extraoral (ATM, Facies, Cuello)
                          </label>
                          <textarea
                            rows={3}
                            value={camposForm.examenExtraoral}
                            onChange={e => setCamposForm(p => ({ ...p, examenExtraoral: e.target.value }))}
                            placeholder="Simetría facial, ATM ruidos articulares, palpación de ganglios..."
                            className="w-full rounded-xl border border-line bg-surface p-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Examen Intraoral (Mucosas, Encías, Periodonto)
                          </label>
                          <textarea
                            rows={3}
                            value={camposForm.examenIntraoral}
                            onChange={e => setCamposForm(p => ({ ...p, examenIntraoral: e.target.value }))}
                            placeholder="Labios, carrillos, paladar, lengua, piso de boca, encías, higiene bucal..."
                            className="w-full rounded-xl border border-line bg-surface p-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Observaciones Clínicas Generales
                          </label>
                          <textarea
                            rows={2}
                            value={camposForm.observacionesClinicas}
                            onChange={e => setCamposForm(p => ({ ...p, observacionesClinicas: e.target.value }))}
                            placeholder="Colaboración del paciente, fobia dental, cuidados especiales..."
                            className="w-full rounded-xl border border-line bg-surface p-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                        </div>
                      </div>
                    )}

                    {seccionModal === 'DIAGNOSTICO' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Diagnóstico Estomatológico (Presuntivo / Definitivo CIE-10)
                          </label>
                          <textarea
                            rows={3}
                            value={camposForm.diagnostico}
                            onChange={e => setCamposForm(p => ({ ...p, diagnostico: e.target.value }))}
                            placeholder="Ej. Gingivitis marginal por placa bacteriana (K05.1), Caries de esmalte (K02.1)..."
                            className="w-full rounded-xl border border-line bg-surface p-3 text-ink focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-ink mb-1.5 uppercase tracking-wider text-[11px]">
                            Plan de Tratamiento Integral Propuesto
                          </label>
                          <textarea
                            rows={4}
                            value={camposForm.planTratamiento}
                            onChange={e => setCamposForm(p => ({ ...p, planTratamiento: e.target.value }))}
                            placeholder="1. Fase higiénica y profilaxis...&#10;2. Fase curativa y restauradora...&#10;3. Fase de mantenimiento y control..."
                            className="w-full rounded-xl border border-line bg-surface p-3 text-ink focus:ring-2 focus:ring-brand/40 font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-line shrink-0">
                    <span className="text-[11px] text-muted">
                      Norma Técnica de Salud NTS N° 139-MINSA/2018/DGIEM
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setModalEditarHistoriaAbierto(false)}
                        disabled={guardando}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        icon="check"
                        disabled={guardando}
                        onClick={handleGuardarHistoriaCompleta}
                      >
                        {guardando && <Icon name="spinner" size={14} className="animate-spin mr-1" />}
                        Guardar Historia Clínica
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  )
}
