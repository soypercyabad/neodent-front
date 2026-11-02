import type { PacienteResponse } from '../api/patientsApi'
import type {
  HistoriaClinicaResponse,
  EvolucionClinicaResponse,
  OdontogramaResponse,
  RecetaClinica,
} from '../api/clinicalApi'

export interface CamposClinicos {
  motivoConsulta: string
  enfermedadActual: string
  antecedentesMedicos: string
  medicamentosActuales: string
  antecedentesOdontologicos: string
  habitos: string
  alergiasTexto: string
  examenExtraoral: string
  examenIntraoral: string
  observacionesClinicas: string
  diagnostico: string
  planTratamiento: string
}

function obtenerNombrePaciente(paciente: PacienteResponse): string {
  return [paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno].filter(Boolean).join(' ')
}

function calcularEdad(fechaNac?: string | null): string {
  if (!fechaNac) return 'No especificada'
  try {
    const partes = fechaNac.split('-')
    if (partes.length === 3) {
      const nac = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
      const hoy = new Date()
      let edad = hoy.getFullYear() - nac.getFullYear()
      const m = hoy.getMonth() - nac.getMonth()
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
      return edad >= 0 ? `${edad} años` : 'No especificada'
    }
  } catch {
    // fallback
  }
  return 'No especificada'
}

export function parsearCamposClinicos(historia?: HistoriaClinicaResponse | null): CamposClinicos {
  const defecto: CamposClinicos = {
    motivoConsulta: '',
    enfermedadActual: '',
    antecedentesMedicos: '',
    medicamentosActuales: '',
    antecedentesOdontologicos: '',
    habitos: '',
    alergiasTexto: '',
    examenExtraoral: '',
    examenIntraoral: '',
    observacionesClinicas: '',
    diagnostico: '',
    planTratamiento: '',
  }

  if (!historia) return defecto

  // Priorizar campos estructurados nativos devueltos por el backend
  if (
    historia.motivoConsulta ||
    historia.enfermedadActual ||
    historia.antecedentesMedicos ||
    historia.medicamentosActuales ||
    historia.habitos ||
    historia.antecedentesOdontologicos ||
    historia.diagnostico ||
    historia.planTratamiento
  ) {
    return {
      motivoConsulta: historia.motivoConsulta || '',
      enfermedadActual: historia.enfermedadActual || '',
      antecedentesMedicos: historia.antecedentesMedicos || historia.antecedentes || '',
      medicamentosActuales: historia.medicamentosActuales || '',
      antecedentesOdontologicos: historia.antecedentesOdontologicos || '',
      habitos: historia.habitos || '',
      alergiasTexto: historia.alergias || '',
      examenExtraoral: historia.examenExtraoral || '',
      examenIntraoral: historia.examenIntraoral || '',
      observacionesClinicas: historia.observacionesGenerales || '',
      diagnostico: historia.diagnostico || '',
      planTratamiento: historia.planTratamiento || '',
    }
  }

  // Fallback para registros antiguos con formato JSON serializado en observacionesGenerales
  if (historia.observacionesGenerales && historia.observacionesGenerales.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(historia.observacionesGenerales)
      let antOdonto = parsed.antecedentesOdontologicos || ''
      let habitosExtraidos = parsed.habitos || ''
      if (antOdonto.includes('[Hábito:')) {
        if (!habitosExtraidos) {
          const matches = Array.from(antOdonto.matchAll(/\[Hábito:\s*([^\]]+)\]/g)).map(m => (m as any)[1].trim())
          habitosExtraidos = matches.join(', ')
        }
        antOdonto = antOdonto.replace(/\[Hábito:\s*[^\]]+\]/g, '').replace(/,\s*,/g, ',').replace(/^[\s,]+|[\s,]+$/g, '').trim()
      }

      return {
        motivoConsulta: parsed.motivoConsulta || '',
        enfermedadActual: parsed.enfermedadActual || '',
        antecedentesMedicos: parsed.antecedentesMedicos || historia.antecedentes || '',
        medicamentosActuales: parsed.medicamentosActuales || '',
        antecedentesOdontologicos: antOdonto,
        habitos: habitosExtraidos,
        alergiasTexto: historia.alergias || parsed.alergiasTexto || '',
        examenExtraoral: parsed.examenExtraoral || '',
        examenIntraoral: parsed.examenIntraoral || '',
        observacionesClinicas: parsed.observacionesClinicas || '',
        diagnostico: parsed.diagnostico || '',
        planTratamiento: parsed.planTratamiento || '',
      }
    } catch {
      // Ignorar error de parseo y continuar con campos nativos
    }
  }

  return {
    ...defecto,
    alergiasTexto: historia.alergias || '',
    antecedentesMedicos: historia.antecedentes || '',
    observacionesClinicas: historia.observacionesGenerales || '',
  }
}

function generarEstilosImpresion(): string {
  return `
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #0f172a;
      background: #ffffff;
      padding: 10px;
    }
    .document-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header-logo {
      font-size: 18pt;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: -0.5px;
    }
    .header-sublogo {
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-doc-title {
      text-align: right;
    }
    .doc-main-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-meta {
      font-size: 8pt;
      color: #475569;
      margin-top: 2px;
    }
    .badge-hc {
      display: inline-block;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9pt;
      margin-top: 3px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0369a1;
      background: #f0f9ff;
      border-left: 3.5px solid #0284c7;
      padding: 4px 8px;
      margin-top: 12px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      page-break-after: avoid;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 8.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
      vertical-align: top;
    }
    table.data-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #334155;
      width: 25%;
    }
    .text-box {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 8.5pt;
      margin-bottom: 8px;
      min-height: 28px;
    }
    .text-box-title {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .alert-box {
      border: 1px solid #fecaca;
      background: #fff5f5;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 8px;
      font-size: 8.5pt;
      color: #991b1b;
    }
    .grid-2 {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 6px;
    }
    .col-half {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      padding-right: 5px;
    }
    .col-half:last-child {
      padding-right: 0;
      padding-left: 5px;
    }
    .signature-area {
      margin-top: 30px;
      display: table;
      width: 100%;
      table-layout: fixed;
      page-break-inside: avoid;
    }
    .signature-col {
      display: table-cell;
      width: 50%;
      text-align: center;
      vertical-align: bottom;
      padding: 0 28px;
    }
    .signature-space {
      height: 75px;
    }
    .signature-line {
      border-top: 1.5px solid #334155;
      margin-bottom: 5px;
    }
    .signature-label {
      font-size: 8pt;
      font-weight: 600;
      color: #1e293b;
    }
    .signature-sub {
      font-size: 7pt;
      color: #64748b;
    }
    .footer-legal {
      margin-top: 25px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 7pt;
      color: #64748b;
      text-align: justify;
      line-height: 1.3;
      page-break-inside: avoid;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .btn-print {
      background: #0284c7;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-print:hover {
      background: #0369a1;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
    }
  `
}

function formatearFecha(fechaStr?: string | null): string {
  if (!fechaStr) return 'No registrada'
  try {
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return fechaStr
  }
}

/**
 * Genera el documento PDF formal de HISTORIA CLÍNICA ODONTOLÓGICA (Evaluación inicial, anamnesis, examen clínico y plan de tratamiento)
 * Conforme a la NTS N° 139-MINSA/2018/DGIEM de la República del Perú.
 */
export function exportarHistoriaClinicaPdf(options: {
  paciente: PacienteResponse
  historia?: HistoriaClinicaResponse | null
  camposClinicos: CamposClinicos
  odontologoNombre?: string
  odontologoCop?: string
}): void {
  const { paciente, camposClinicos, odontologoNombre, odontologoCop } = options
  const numHC = `HC-${paciente.id.toString().padStart(6, '0')}`
  const nombrePaciente = obtenerNombrePaciente(paciente)
  const edadTexto = calcularEdad(paciente.fechaNacimiento)
  const fechaEmision = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Historia Clínica - ${nombrePaciente} - NeoDents</title>
  <style>${generarEstilosImpresion()}</style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>Vista previa médica - Historia Clínica Oficial</strong>
      <span style="opacity: 0.7; font-size: 11px; margin-left: 8px;">(NTS N° 139-MINSA/2018/DGIEM)</span>
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">Imprimir o Guardar PDF</button>
    </div>
  </div>

  <div class="document-container">
    <table class="header-table">
      <tr>
        <td style="width: 55%; vertical-align: top;">
          <div class="header-logo">NeoDents</div>
          <div class="header-sublogo">Centro Odontológico Especializado</div>
          <div style="font-size: 7.5pt; color: #475569; margin-top: 3px;">
            RUC: 20608934512 • Sede Principal: San Isidro, Lima - Perú • Tel: (01) 421-9988
          </div>
        </td>
        <td class="header-doc-title" style="width: 45%; vertical-align: top;">
          <div class="doc-main-title">Historia Clínica Odontológica</div>
          <div class="badge-hc">N° ${numHC}</div>
          <div class="doc-meta">Fecha de Emisión: ${fechaEmision}</div>
          <div class="doc-meta">Estado: <strong>REGISTRO CLÍNICO OFICIAL</strong></div>
        </td>
      </tr>
    </table>

    <!-- I. FILIACIÓN E IDENTIFICACIÓN DEL PACIENTE -->
    <div class="section-title">I. Filiación e Identificación del Paciente</div>
    <table class="data-table">
      <tr>
        <th>Apellidos y Nombres:</th>
        <td style="width: 40%; font-weight: bold;">${nombrePaciente}</td>
        <th>Documento de Identidad:</th>
        <td style="width: 25%; font-weight: bold;">${paciente.tipoDocumento} ${paciente.numeroDocumento}</td>
      </tr>
      <tr>
        <th>Fecha de Nacimiento / Edad:</th>
        <td>${formatearFecha(paciente.fechaNacimiento)} (${edadTexto})</td>
        <th>Sede de Registro:</th>
        <td>${paciente.sedeRegistroNombre || 'Sede Principal San Isidro'}</td>
      </tr>
      <tr>
        <th>Teléfono / Celular:</th>
        <td>${paciente.telefono || 'No registrado'}</td>
        <th>Correo Electrónico:</th>
        <td>${paciente.email || 'No registrado'}</td>
      </tr>
      <tr>
        <th>Dirección Domiciliaria:</th>
        <td colspan="3">${paciente.direccion || 'No registrada'} - Lima, Perú</td>
      </tr>
    </table>

    <!-- II. MOTIVO DE CONSULTA Y ANAMNESIS -->
    <div class="section-title">II. Motivo de Consulta y Anamnesis</div>
    <div class="text-box">
      <div class="text-box-title">Motivo Principal de Consulta:</div>
      <div>${camposClinicos.motivoConsulta || 'Evaluación odontológica general.'}</div>
    </div>
    <div class="text-box">
      <div class="text-box-title">Enfermedad Actual / Relato Cronológico de Síntomas:</div>
      <div>${camposClinicos.enfermedadActual || 'Sin sintomatología dolorosa espontánea.'}</div>
    </div>

    <!-- III. ANTECEDENTES MÉDICOS Y SALUD GENERAL -->
    <div class="section-title">III. Antecedentes Médicos y Salud General</div>
    <div class="grid-2">
      <div class="col-half">
        <div class="alert-box">
          <div class="text-box-title" style="color: #991b1b;">Alergias a Medicamentos / Sustancias:</div>
          <div style="font-weight: 600;">${camposClinicos.alergiasTexto || 'Sin alergias conocidas declaradas.'}</div>
        </div>
        <div class="text-box">
          <div class="text-box-title">Antecedentes Patológicos Sistémicos:</div>
          <div>${camposClinicos.antecedentesMedicos || 'Ninguno relevante registrado.'}</div>
        </div>
      </div>
      <div class="col-half">
        <div class="text-box">
          <div class="text-box-title">Medicamentos de Uso Habitual:</div>
          <div>${camposClinicos.medicamentosActuales || 'No consume medicación habitual.'}</div>
        </div>
        <div class="text-box">
          <div class="text-box-title">Antecedentes Odontológicos Previos:</div>
          <div>${camposClinicos.antecedentesOdontologicos || 'Limpiezas y controles periódicos.'}</div>
        </div>
      </div>
    </div>

    <!-- IV. EXPLORACIÓN Y EVALUACIÓN CLÍNICA -->
    <div class="section-title">IV. Exploración y Examen Clínico Odontológico</div>
    <div class="grid-2">
      <div class="col-half">
        <div class="text-box">
          <div class="text-box-title">Examen Clínico Extraoral (Facies, Ganglios, ATM):</div>
          <div>${camposClinicos.examenExtraoral || 'Simetría facial y ATM asintomática.'}</div>
        </div>
      </div>
      <div class="col-half">
        <div class="text-box">
          <div class="text-box-title">Examen Clínico Intraoral (Mucosas, Encías, Oclusión):</div>
          <div>${camposClinicos.examenIntraoral || 'Mucosas normocoloreadas y normotróficas.'}</div>
        </div>
      </div>
    </div>
    <div class="text-box">
      <div class="text-box-title">Observaciones Estomatológicas y Hallazgos Clínicos:</div>
      <div>${camposClinicos.observacionesClinicas || 'Higiene oral regular, presencia de placa bacteriana.'}</div>
    </div>

    <!-- V. DIAGNÓSTICO ESTOMATOLÓGICO Y PLAN DE TRATAMIENTO -->
    <div class="section-title">V. Diagnóstico Presuntivo / Definitivo y Plan de Atención</div>
    <div class="text-box" style="border-left: 3.5px solid #2563eb;">
      <div class="text-box-title" style="color: #1d4ed8;">Diagnóstico Clínico (CIE-10 Odontología):</div>
      <div style="font-weight: 600;">${camposClinicos.diagnostico || 'Caries dental y gingivitis.'}</div>
    </div>
    <div class="text-box">
      <div class="text-box-title">Plan de Tratamiento Integral Propuesto:</div>
      <div style="white-space: pre-line;">${camposClinicos.planTratamiento || 'Profilaxis y restauraciones con resina.'}</div>
    </div>

    <!-- VI. RESPONSABILIDAD MÉDICO-LEGAL Y FIRMAS -->
    <div class="signature-area">
      <div class="signature-col">
        <div class="signature-space"></div>
        <div class="signature-line"></div>
        <div class="signature-label">${odontologoNombre || 'Dr(a). Odontólogo Tratante'}</div>
        <div class="signature-sub">C.O.P.: ${odontologoCop || '42589'} • Especialista Odontólogo</div>
        <div class="signature-sub">Firma y Sello Profesional</div>
      </div>
      <div class="signature-col">
        <div class="signature-space"></div>
        <div class="signature-line"></div>
        <div class="signature-label">${nombrePaciente}</div>
        <div class="signature-sub">${paciente.tipoDocumento}: ${paciente.numeroDocumento}</div>
        <div class="signature-sub">Firma y Huella Digital del Paciente / Apoderado</div>
      </div>
    </div>

    <!-- PIE DE PÁGINA LEGAL -->
    <div class="footer-legal">
      <strong>Declaración médico-legal:</strong> La presente Historia Clínica constituye un documento médico-legal confidencial, emitido conforme a la Ley General de Salud N° 26842, el Código de Ética y Deontología del Colegio Odontológico del Perú (COP) y la Norma Técnica de Salud NTS N° 139-MINSA/2018/DGIEM para la gestión de historias clínicas. La información consignada refleja fielmente el estado de salud bucal y general evaluado a la fecha de emisión.
    </div>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=950,height=900,scrollbars=yes')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
  } else {
    alert('Por favor permita las ventanas emergentes (pop-ups) en su navegador para ver e imprimir el PDF.')
  }
}

/**
 * Genera el documento PDF formal de EXPEDIENTE CLÍNICO CRONOLÓGICO COMPLETO
 * Incluye datos basales, odontograma, evoluciones clínicas cronológicas (SOAP) y recetas médicas.
 */
export function exportarExpedienteCronologicoPdf(options: {
  paciente: PacienteResponse
  historia?: HistoriaClinicaResponse | null
  camposClinicos: CamposClinicos
  evoluciones: EvolucionClinicaResponse[]
  odontograma?: OdontogramaResponse | null
  recetas?: RecetaClinica[]
  odontologoNombre?: string
  odontologoCop?: string
}): void {
  const { paciente, camposClinicos, evoluciones, odontograma, recetas, odontologoNombre, odontologoCop } = options
  const numHC = `HC-${paciente.id.toString().padStart(6, '0')}`
  const nombrePaciente = obtenerNombrePaciente(paciente)
  const edadTexto = calcularEdad(paciente.fechaNacimiento)
  const fechaEmision = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Filas de evoluciones clínicas
  const evolucionesHtml =
    evoluciones.length === 0
      ? `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 12px;">Sin evoluciones registradas aún en el expediente.</td></tr>`
      : evoluciones
        .map(
          ev => `
        <tr>
          <td style="font-weight: bold; width: 12%;">${formatearFecha(ev.fecha)}</td>
          <td style="width: 25%; font-weight: 600;">${ev.diagnostico || 'Control clínico'}</td>
          <td style="width: 30%;">${ev.procedimiento || 'Evaluación de rutina'}</td>
          <td style="width: 20%; font-size: 8pt; color: #475569;">${ev.indicaciones || '-'}</td>
          <td style="width: 13%; font-size: 8pt;">${ev.odontologoNombre || 'Odontólogo tratante'}<br><span style="color: #64748b;">COP: ${ev.numeroColegiatura || 'Colegiado'}</span></td>
        </tr>`,
        )
        .join('')

  // Piezas dentales con hallazgos en odontograma
  const piezasConHallazgos = odontograma?.piezas?.filter(p => p.codigoCondicion !== 'SANO') || []
  const odontogramaHtml =
    piezasConHallazgos.length === 0
      ? `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 10px;">Odontograma inicial sin hallazgos patológicos activos.</td></tr>`
      : piezasConHallazgos
        .map(
          p => `
        <tr>
          <td style="font-weight: bold; width: 15%; text-align: center;">Pieza #${p.numeroPieza}</td>
          <td style="width: 25%; text-align: center;">${p.superficie || 'General'}</td>
          <td style="width: 35%; font-weight: 600; color: #b91c1c;">${p.nombreCondicion}</td>
          <td style="width: 25%; font-size: 8pt;">${p.estado || 'HALLAZGO'} ${p.observacion ? `(${p.observacion})` : ''}</td>
        </tr>`,
        )
        .join('')

  // Recetas emitidas
  const recetasList = recetas || []
  const recetasHtml =
    recetasList.length === 0
      ? `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 10px;">Sin recetas médicas registradas en el expediente.</td></tr>`
      : recetasList
        .map(
          rec => `
        <tr>
          <td style="font-weight: bold; width: 15%;">${formatearFecha(rec.fecha)}</td>
          <td style="width: 50%;">${rec.detalles.map(d => `<strong>${d.medicamento}</strong> (${d.concentracion || ''}) - ${d.dosis || ''} cada ${d.frecuencia || ''} x ${d.duracion || ''}`).join('<br>')}</td>
          <td style="width: 20%; font-size: 8pt;">${rec.indicacionesGenerales || '-'}</td>
          <td style="width: 15%; font-size: 8pt;">${rec.odontologoNombre}</td>
        </tr>`,
        )
        .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Expediente Clínico Cronológico - ${nombrePaciente} - NeoDents</title>
  <style>${generarEstilosImpresion()}</style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>Vista previa médica - Expediente Clínico Cronológico Completo</strong>
      <span style="opacity: 0.7; font-size: 11px; margin-left: 8px;">(Historial Integral de Atenciones y Evoluciones)</span>
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">Imprimir o Guardar PDF</button>
    </div>
  </div>

  <div class="document-container">
    <table class="header-table">
      <tr>
        <td style="width: 55%; vertical-align: top;">
          <div class="header-logo">NeoDents</div>
          <div class="header-sublogo">Centro Odontológico Especializado</div>
          <div style="font-size: 7.5pt; color: #475569; margin-top: 3px;">
            RUC: 20608934512 • Sede Principal: San Isidro, Lima - Perú • Tel: (01) 421-9988
          </div>
        </td>
        <td class="header-doc-title" style="width: 45%; vertical-align: top;">
          <div class="doc-main-title">Expediente Clínico Completo</div>
          <div class="badge-hc">N° ${numHC}</div>
          <div class="doc-meta">Fecha de Emisión: ${fechaEmision}</div>
          <div class="doc-meta">Total de Atenciones: <strong>${evoluciones.length}</strong></div>
        </td>
      </tr>
    </table>

    <!-- IDENTIFICACIÓN DEL PACIENTE -->
    <div class="section-title">I. Datos del Paciente</div>
    <table class="data-table">
      <tr>
        <th>Paciente:</th>
        <td style="font-weight: bold;">${nombrePaciente}</td>
        <th>Documento:</th>
        <td style="font-weight: bold;">${paciente.tipoDocumento} ${paciente.numeroDocumento}</td>
      </tr>
      <tr>
        <th>Edad / Nacimiento:</th>
        <td>${edadTexto} (${formatearFecha(paciente.fechaNacimiento)})</td>
        <th>Contacto:</th>
        <td>${paciente.telefono || 'Sin teléfono'} • ${paciente.email || 'Sin email'}</td>
      </tr>
      <tr>
        <th>Alergias Identificadas:</th>
        <td colspan="3" style="color: #b91c1c; font-weight: bold;">${camposClinicos.alergiasTexto || 'Sin alergias declaradas'}</td>
      </tr>
    </table>

    <!-- HISTORIAL CRONOLÓGICO DE ATENCIONES (SOAP) -->
    <div class="section-title">II. Historial Cronológico de Atenciones y Evoluciones Clínicas (SOAP)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Diagnóstico</th>
          <th>Procedimiento Realizado</th>
          <th>Indicaciones / Prescripción</th>
          <th>Profesional</th>
        </tr>
      </thead>
      <tbody>
        ${evolucionesHtml}
      </tbody>
    </table>

    <!-- RESUMEN DEL ODONTOGRAMA -->
    <div class="section-title" style="margin-top: 14px;">III. Registro de Hallazgos en Odontograma</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Pieza Dental</th>
          <th>Superficie</th>
          <th>Condición / Patología</th>
          <th>Estado / Notas</th>
        </tr>
      </thead>
      <tbody>
        ${odontogramaHtml}
      </tbody>
    </table>

    <!-- RECETAS PRESCRITAS -->
    <div class="section-title" style="margin-top: 14px;">IV. Recetas y Prescripciones Médicas</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Medicamentos y Posología</th>
          <th>Indicaciones</th>
          <th>Prescriptor</th>
        </tr>
      </thead>
      <tbody>
        ${recetasHtml}
      </tbody>
    </table>

    <!-- FIRMAS DE RESPONSABILIDAD -->
    <div class="signature-area">
      <div class="signature-col">
        <div class="signature-space"></div>
        <div class="signature-line"></div>
        <div class="signature-label">${odontologoNombre || 'Dr(a). Odontólogo Tratante'}</div>
        <div class="signature-sub">C.O.P.: ${odontologoCop || '42589'} • Director Clínico</div>
        <div class="signature-sub">Firma y Sello de Certificación</div>
      </div>
      <div class="signature-col">
        <div class="signature-space"></div>
        <div class="signature-line"></div>
        <div class="signature-label">${nombrePaciente}</div>
        <div class="signature-sub">${paciente.tipoDocumento}: ${paciente.numeroDocumento}</div>
        <div class="signature-sub">Conformidad del Paciente</div>
      </div>
    </div>

    <!-- PIE DE PÁGINA -->
    <div class="footer-legal">
      Expediente clínico emitido automáticamente por el Sistema Integrado NeoDents. Validez oficial conforme a la Ley General de Salud N° 26842 y la Norma Técnica de Salud NTS N° 139-MINSA/2018/DGIEM para auditoría médica, remisión interprofesional y archivo del expediente.
    </div>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=950,height=900,scrollbars=yes')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
  } else {
    alert('Por favor permita las ventanas emergentes (pop-ups) en su navegador para ver e imprimir el PDF.')
  }
}

export interface ExportarRecetaParams {
  paciente: PacienteResponse
  receta: RecetaClinica
  historia?: HistoriaClinicaResponse | null
  clinicaInfo?: {
    nombre?: string
    subtitulo?: string
    direccion?: string
    telefono?: string
    ruc?: string
  }
}

/**
 * Genera y exporta la Receta Odontológica en formato clínico formal A5 / A4
 * adaptado a la regulación DIGEMID / MINSA y con la identidad visual de NeoDents.
 */
export function exportarRecetaPdf({
  paciente,
  receta,
  historia,
  clinicaInfo,
}: ExportarRecetaParams) {
  const nombrePaciente = obtenerNombrePaciente(paciente)
  const edadPaciente = calcularEdad(paciente.fechaNacimiento || historia?.fechaNacimiento)
  const codigoRx = receta.codigoReceta || `RX-${String(receta.id).padStart(6, '0')}`
  const codigoHc = `HC-${String(paciente.id).padStart(5, '0')}`

  const fechaEmision = new Date(receta.fecha).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  // Validez por defecto: 5 días tras emisión si no se indicó
  const fechaValidez = receta.validaHasta
    ? new Date(receta.validaHasta).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    : (() => {
      const d = new Date(receta.fecha)
      d.setDate(d.getDate() + 5)
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    })()

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Receta Odontológica - ${codigoRx} - ${nombrePaciente}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      background: #f1f5f9;
      color: #0f172a;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 11px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }
    .no-print-bar {
      width: 100%;
      max-width: 580px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: white;
      padding: 10px 16px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .no-print-bar button {
      background: #0284c7;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .no-print-bar button:hover {
      background: #0369a1;
    }
    .no-print-bar .btn-secondary {
      background: transparent;
      color: #cbd5e1;
      border: 1px solid #334155;
      margin-right: 8px;
    }
    .no-print-bar .btn-secondary:hover {
      background: #1e293b;
      color: white;
    }
    .receta-container {
      width: 100%;
      max-width: 580px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 28px 30px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      position: relative;
    }
    .receta-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .clinic-brand {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .clinic-sub {
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 3px;
    }
    .clinic-meta {
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 4px;
      line-height: 1.3;
    }
    .rx-title-box {
      text-align: right;
    }
    .rx-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .rx-number {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 3px;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 20px;
      margin-bottom: 20px;
      padding: 12px 14px;
      background: #f8fafc;
      border: 1px solid #edf2f7;
      border-radius: 10px;
    }
    .field-item {
      display: flex;
      flex-direction: column;
    }
    .field-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .field-val {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .rx-drugs-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }
    .drug-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .drug-name {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .drug-dci {
      color: #475569;
      font-weight: 600;
    }
    .drug-meta-row {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 12px;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .posology-title {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .posology-text {
      font-size: 11px;
      color: #1e293b;
      font-weight: 500;
      line-height: 1.4;
    }
    .indications-box {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      background: #f8fafc;
      color: #334155;
      font-size: 10.5px;
      min-height: 48px;
      line-height: 1.45;
      margin-bottom: 24px;
    }
    .footer-validation {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 20px;
      align-items: flex-end;
      padding-top: 10px;
    }
    .valida-box {
      font-size: 10px;
      color: #334155;
    }
    .valida-box strong {
      color: #0f172a;
      font-weight: 700;
    }
    .demo-tag {
      margin-top: 4px;
      font-size: 9px;
      color: #94a3b8;
    }
    .signature-block {
      text-align: center;
    }
    .sig-space {
      height: 50px;
    }
    .sig-line {
      border-bottom: 1px solid #94a3b8;
      width: 100%;
      margin-bottom: 6px;
    }
    .sig-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 9.5px;
      color: #64748b;
    }
    .bottom-disclaimer {
      margin-top: 18px;
      text-align: center;
      font-size: 9px;
      color: #64748b;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
    }

    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
      .receta-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 8px;">
      <span>Receta Médica Odontológica Oficial</span>
      <span style="background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 4px; font-size: 10px;">${codigoRx}</span>
    </div>
    <div>
      <button type="button" class="btn-secondary" onclick="window.close()">Cerrar</button>
      <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
  </div>

  <div class="receta-container">
    <!-- ENCABEZADO CLÍNICO INSTITUCIONAL -->
    <div class="receta-header">
      <div>
        <div class="clinic-brand">${clinicaInfo?.nombre || 'NeoDents'}</div>
        <div class="clinic-sub">${clinicaInfo?.subtitulo || 'CLÍNICA ODONTOLÓGICA'}</div>
        <div class="clinic-meta">
          ${clinicaInfo?.direccion || 'Av. Arequipa 1420, Miraflores, Lima'}<br>
          Tel: ${clinicaInfo?.telefono || '(01) 480-0190'} • RUC: ${clinicaInfo?.ruc || '20608945123'}
        </div>
      </div>
      <div class="rx-title-box">
        <div class="rx-title">Receta Odontológica</div>
        <div class="rx-number">N.° ${codigoRx}</div>
      </div>
    </div>

    <!-- DATOS DEL PACIENTE -->
    <div class="patient-grid">
      <div class="field-item">
        <span class="field-label">Paciente</span>
        <span class="field-val">${nombrePaciente}</span>
      </div>
      <div class="field-item">
        <span class="field-label">Edad</span>
        <span class="field-val">${edadPaciente}</span>
      </div>
      <div class="field-item">
        <span class="field-label">Fecha de emisión</span>
        <span class="field-val">${fechaEmision}</span>
      </div>
      <div class="field-item">
        <span class="field-label">Historia clínica</span>
        <span class="field-val">${codigoHc}</span>
      </div>
    </div>

    <!-- PRESCRIPCIÓN DE MEDICAMENTOS -->
    <div class="section-title">Rp/ Prescripción</div>
    <div class="rx-drugs-list">
      ${receta.detalles
      .map(
        item => `
        <div class="drug-card">
          <div class="drug-name">
            ${item.medicamento}${item.dci ? ` <span class="drug-dci">- ${item.dci}</span>` : ''}
          </div>
          <div class="drug-meta-row">
            <div>
              <div class="posology-title">Concentración / forma</div>
              <div class="field-val" style="font-size: 11px;">
                ${[item.concentracion, item.formaFarmaceutica].filter(Boolean).join(' - ') || 'Según presentación'}
              </div>
            </div>
            <div>
              <div class="posology-title">Cantidad total</div>
              <div class="field-val" style="font-size: 11px;">
                ${item.cantidadTotal || 'Según duración'}
              </div>
            </div>
          </div>
          <div>
            <div class="posology-title">Posología, vía y duración</div>
            <div class="posology-text">
              ${[
            item.dosis ? `${item.dosis}` : null,
            item.viaAdministracion ? `vía ${item.viaAdministracion.toLowerCase()}` : null,
            item.frecuencia ? `${item.frecuencia.toLowerCase()}` : null,
            item.duracion ? `por ${item.duracion.toLowerCase()}` : null,
          ]
            .filter(Boolean)
            .join(', ')}
              ${item.observaciones ? `. (${item.observaciones})` : ''}
            </div>
          </div>
        </div>
      `,
      )
      .join('')}
    </div>

    <!-- INDICACIONES ADICIONALES -->
    <div class="section-title">Indicaciones adicionales</div>
    <div class="indications-box">
      ${receta.indicacionesGenerales || 'Espacio para recomendaciones del profesional prescriptor. No suspender el tratamiento antes del tiempo estipulado.'}
    </div>

    <!-- VALIDACIÓN Y FIRMA -->
    <div class="footer-validation">
      <div class="valida-box">
        <div>Válida hasta: <strong>${fechaValidez}</strong></div>
        <div class="demo-tag">Conforme a Ley General de Salud N° 26842 y Directivas DIGEMID / MINSA.</div>
      </div>
      <div class="signature-block">
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-title">Firma y sello</div>
        <div class="sig-sub">${receta.odontologoNombre}</div>
        <div class="sig-sub">${receta.numeroColegiatura.toUpperCase().includes('COP') ? receta.numeroColegiatura : `COP: ${receta.numeroColegiatura}`}</div>
      </div>
    </div>

    <div class="bottom-disclaimer">
      Documento clínico formal emitido por Sistema Integrado NeoDents. Válido para dispensación farmacéutica reglamentaria.
    </div>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=750,height=850,scrollbars=yes')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
  } else {
    alert('Por favor permita las ventanas emergentes (pop-ups) en su navegador para ver e imprimir la receta.')
  }
}

export interface ExportarOdontogramaParams {
  paciente: PacienteResponse
  odontograma: OdontogramaResponse | null
  historia?: HistoriaClinicaResponse | null
  odontologoNombre?: string
  odontologoCop?: string
}

/**
 * Genera la Ficha Técnica del Odontograma Clínico conforme a la NTS N° 139-MINSA
 */
export function exportarOdontogramaPdf({
  paciente,
  odontograma,
  historia,
  odontologoNombre,
  odontologoCop,
}: ExportarOdontogramaParams) {
  const nombrePaciente = obtenerNombrePaciente(paciente)
  const edadPaciente = calcularEdad(paciente.fechaNacimiento || historia?.fechaNacimiento)
  const codigoHc = `HC-${String(paciente.id).padStart(5, '0')}`
  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const piezas = odontograma?.piezas || []

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Odontograma Clínico - ${codigoHc} - ${nombrePaciente}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { background: #f8fafc; color: #0f172a; padding: 20px; font-size: 11px; line-height: 1.4; display: flex; flex-direction: column; align-items: center; }
    .no-print-bar { width: 100%; max-width: 800px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 10px 16px; border-radius: 12px; }
    .no-print-bar button { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; }
    .doc-container { width: 100%; max-width: 800px; background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 20px; font-weight: 800; color: #0f172a; }
    .subbrand { font-size: 9px; font-weight: 700; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase; }
    .title-box { text-align: right; }
    .doc-title { font-size: 14px; font-weight: 800; color: #0284c7; text-transform: uppercase; }
    .doc-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
    .grid-info { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
    .label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .val { font-size: 11.5px; font-weight: 700; color: #0f172a; margin-top: 1px; }
    .section-title { font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 16px 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; }
    th { background: #f1f5f9; padding: 6px 10px; text-align: left; font-weight: 700; color: #334155; border: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px 10px; border: 1px solid #e2e8f0; color: #1e293b; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; }
    .sig-area { margin-top: 30px; display: flex; justify-content: flex-end; }
    .sig-col { width: 220px; text-align: center; }
    .sig-space { height: 70px; }
    .sig-line { border-bottom: 1px solid #94a3b8; margin-bottom: 6px; }
    @media print {
      body { background: transparent; padding: 0; }
      .no-print-bar { display: none !important; }
      .doc-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-weight: 700; font-size: 12px;">Odontograma Clínico Oficial · NTS N° 139-MINSA</div>
    <div>
      <button type="button" style="background: transparent; color: #cbd5e1; border: 1px solid #334155; margin-right: 8px;" onclick="window.close()">Cerrar</button>
      <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
  </div>

  <div class="doc-container">
    <div class="header">
      <div>
        <div class="brand">NeoDents</div>
        <div class="subbrand">Clínica Odontológica Especializada</div>
      </div>
      <div class="title-box">
        <div class="doc-title">Odontograma Clínico</div>
        <div class="doc-sub">Registro de Hallazgos y Patologías Dentales</div>
      </div>
    </div>

    <div class="grid-info">
      <div><span class="label">Paciente</span><div class="val">${nombrePaciente}</div></div>
      <div><span class="label">Edad</span><div class="val">${edadPaciente}</div></div>
      <div><span class="label">Historia Clínica</span><div class="val">${codigoHc}</div></div>
      <div><span class="label">Fecha Emisión</span><div class="val">${fechaHoy}</div></div>
    </div>

    <div class="section-title">Registro Tabulado de Hallazgos y Tratamientos (${piezas.length})</div>
    ${piezas.length === 0
      ? '<div style="padding: 24px; text-align: center; color: #64748b; font-size: 11px;">No se registraron patologías dentales en este examen clínico. Piezas en estado sano.</div>'
      : `<table>
        <thead>
          <tr>
            <th style="width: 70px;">Pieza FDI</th>
            <th style="width: 110px;">Superficie</th>
            <th>Diagnóstico / Condición Clínica</th>
            <th style="width: 110px;">Fase / Estado</th>
            <th>Observación Clínica</th>
          </tr>
        </thead>
        <tbody>
          ${piezas
        .map(
          p => `<tr>
              <td><strong>#${p.numeroPieza}</strong></td>
              <td>${p.superficie && p.superficie !== 'GENERAL' ? `Cara ${p.superficie}` : 'Toda la pieza'}</td>
              <td><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${p.colorHexadecimal}; margin-right:5px;"></span><strong>${p.nombreCondicion}</strong></td>
              <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${p.estado || 'HALLAZGO'}</span></td>
              <td>${p.observacion || '-'}</td>
            </tr>`,
        )
        .join('')}
        </tbody>
      </table>`
    }

    <div class="sig-area">
      <div class="sig-col">
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div style="font-weight: 700; font-size: 11px;">${odontologoNombre || 'Dr(a). Odontólogo Tratante'}</div>
        <div style="font-size: 9.5px; color: #64748b;">C.O.P. ${odontologoCop || '42589'}</div>
        <div style="font-size: 9.5px; color: #64748b;">Firma y Sello Profesional</div>
      </div>
    </div>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=850,height=900,scrollbars=yes')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
  } else {
    alert('Por favor permita las ventanas emergentes (pop-ups) en su navegador para ver el odontograma.')
  }
}

export interface PresupuestoItemExport {
  id?: number | string
  numeroPieza: number
  nombrePieza?: string
  superficie?: string
  nombreCondicion: string
  observacion?: string
  estado?: string
  costo: number
}

export interface ExportarPresupuestoParams {
  paciente: PacienteResponse
  items: PresupuestoItemExport[]
  totalPresupuesto: number
  totalRealizado: number
  historia?: HistoriaClinicaResponse | null
  odontologoNombre?: string
  odontologoCop?: string
}

/**
 * Genera el documento PDF formal de PRESUPUESTO Y PLAN DE TRATAMIENTO ODONTOLÓGICO
 * Con formato oficial unificado idéntico a la Historia Clínica y el Odontograma de NeoDents.
 */
export function exportarPresupuestoPdf({
  paciente,
  items,
  totalPresupuesto,
  totalRealizado,
  odontologoNombre,
  odontologoCop,
}: ExportarPresupuestoParams): void {
  const numHC = `HC-${paciente.id.toString().padStart(6, '0')}`
  const numPTO = `PTO-${paciente.id.toString().padStart(6, '0')}`
  const nombrePaciente = obtenerNombrePaciente(paciente)
  const edadTexto = calcularEdad(paciente.fechaNacimiento)
  const fechaEmision = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const saldoPendiente = Math.max(0, totalPresupuesto - totalRealizado)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto Odontológico - ${numPTO} - ${nombrePaciente}</title>
  <style>
    ${generarEstilosImpresion()}
    .kpi-row {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 12px;
    }
    .kpi-col {
      display: table-cell;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      vertical-align: top;
    }
    .kpi-title {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-val {
      font-size: 13pt;
      font-weight: 800;
      margin-top: 2px;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 2px;
    }
    .table-budget {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 14px;
      font-size: 8.5pt;
    }
    .table-budget th {
      background: #f1f5f9;
      padding: 7px 9px;
      text-align: left;
      font-weight: 700;
      color: #334155;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
      text-transform: uppercase;
    }
    .table-budget td {
      padding: 7px 9px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: middle;
    }
    .table-budget tfoot td {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 9px;
      font-weight: 800;
    }
    .badge-estado {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-realizado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-programado { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-presupuestado { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
    .badge-hallazgo { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>Presupuesto y Plan de Tratamientos Odontológicos</strong>
      <span style="opacity: 0.7; font-size: 11px; margin-left: 8px;">(Cotización Clínica Oficial NeoDents)</span>
    </div>
    <div>
      <button type="button" class="btn-print" onclick="window.print()">Imprimir o Guardar PDF</button>
    </div>
  </div>

  <div class="document-container">
    <table class="header-table">
      <tr>
        <td style="width: 55%; vertical-align: top;">
          <div class="header-logo">NeoDents</div>
          <div class="header-sublogo">Centro Odontológico Especializado</div>
          <div style="font-size: 7.5pt; color: #475569; margin-top: 3px;">
            RUC: 20608934512 • Sede Principal: San Isidro, Lima - Perú • Tel: (01) 421-9988
          </div>
        </td>
        <td class="header-doc-title" style="width: 45%; vertical-align: top;">
          <div class="doc-main-title">Presupuesto Odontológico</div>
          <div class="badge-hc">COTIZACIÓN N° ${numPTO}</div>
          <div class="doc-meta">Historia Clínica: <strong>${numHC}</strong></div>
          <div class="doc-meta">Fecha de Emisión: ${fechaEmision}</div>
          <div class="doc-meta">Validez: <strong>30 días calendario</strong></div>
        </td>
      </tr>
    </table>

    <!-- I. FILIACIÓN DEL PACIENTE -->
    <div class="section-title">I. Datos de Filiación del Paciente</div>
    <table class="data-table">
      <tr>
        <th>Apellidos y Nombres:</th>
        <td style="width: 40%; font-weight: bold;">${nombrePaciente}</td>
        <th>Documento de Identidad:</th>
        <td style="width: 25%; font-weight: bold;">${paciente.tipoDocumento} ${paciente.numeroDocumento}</td>
      </tr>
      <tr>
        <th>Edad / Fecha Nac.:</th>
        <td>${edadTexto} (${formatearFecha(paciente.fechaNacimiento)})</td>
        <th>Teléfono de Contacto:</th>
        <td>${paciente.telefono || 'No registrado'}</td>
      </tr>
      <tr>
        <th>Correo Electrónico:</th>
        <td>${paciente.email || 'No registrado'}</td>
        <th>Sede de Atención:</th>
        <td>${paciente.sedeRegistroNombre || 'Sede Principal San Isidro'}</td>
      </tr>
    </table>

    <!-- II. RESUMEN FINANCIERO DEL PLAN -->
    <div class="section-title">II. Resumen Económico del Plan de Tratamiento</div>
    <div class="kpi-row">
      <div class="kpi-col" style="border-right: none;">
        <div class="kpi-title">Total Presupuestado</div>
        <div class="kpi-val" style="color: #0284c7;">S/. ${totalPresupuesto.toFixed(2)}</div>
        <div class="kpi-sub">${items.length} procedimientos cotizados</div>
      </div>
      <div class="kpi-col" style="border-right: none;">
        <div class="kpi-title">Tratamientos Realizados</div>
        <div class="kpi-val" style="color: #16a34a;">S/. ${totalRealizado.toFixed(2)}</div>
        <div class="kpi-sub">${items.filter(i => i.estado === 'REALIZADO').length} procedimientos ejecutados</div>
      </div>
      <div class="kpi-col" style="border-right: none;">
        <div class="kpi-title">Saldo Pendiente</div>
        <div class="kpi-val" style="color: #d97706;">S/. ${saldoPendiente.toFixed(2)}</div>
        <div class="kpi-sub">Por ejecutar o cancelar</div>
      </div>
      <div class="kpi-col">
        <div class="kpi-title">Estado del Plan</div>
        <div class="kpi-val" style="font-size: 10.5pt; color: #16a34a; margin-top: 4px;">Activo Aprobado</div>
        <div class="kpi-sub">Conforme a evaluación clínica</div>
      </div>
    </div>

    <!-- III. DETALLE DE TRATAMIENTOS -->
    <div class="section-title">III. Detalle de Tratamientos y Presupuesto Odontológico</div>
    ${items.length === 0
      ? '<div style="padding: 16px; text-align: center; color: #64748b; font-size: 9pt; border: 1px dashed #cbd5e1; border-radius: 4px;">No se registran tratamientos en este presupuesto.</div>'
      : `<table class="table-budget">
        <thead>
          <tr>
            <th style="width: 80px;">Pieza FDI</th>
            <th style="width: 110px;">Superficie</th>
            <th>Diagnóstico / Procedimiento Odontológico</th>
            <th style="width: 105px; text-align: center;">Estado Clínico</th>
            <th style="width: 95px; text-align: right;">Tarifa Est.</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const badgeClass =
              item.estado === 'REALIZADO'
                ? 'badge-realizado'
                : item.estado === 'PROGRAMADO'
                  ? 'badge-programado'
                  : item.estado === 'PRESUPUESTADO'
                    ? 'badge-presupuestado'
                    : 'badge-hallazgo'
            const badgeLabel =
              item.estado === 'REALIZADO'
                ? 'Realizado'
                : item.estado === 'PROGRAMADO'
                  ? 'Programado'
                  : item.estado === 'PRESUPUESTADO'
                    ? 'Presupuestado'
                    : 'Hallazgo'

            return `<tr>
              <td>
                <strong style="color: #0369a1;">N° ${item.numeroPieza}</strong>
                ${item.nombrePieza ? `<div style="font-size: 7.5pt; color: #64748b;">${item.nombrePieza}</div>` : ''}
              </td>
              <td>${item.superficie || 'Toda la pieza'}</td>
              <td>
                <strong style="color: #0f172a;">${item.nombreCondicion}</strong>
                ${item.observacion && item.observacion.trim().toLowerCase() !== item.nombreCondicion.trim().toLowerCase()
                  ? `<div style="font-size: 7.5pt; color: #64748b; font-style: italic;">${item.observacion}</div>`
                  : ''}
              </td>
              <td style="text-align: center;">
                <span class="badge-estado ${badgeClass}">${badgeLabel}</span>
              </td>
              <td style="text-align: right; font-weight: 700; font-family: monospace; font-size: 9pt;">
                S/. ${item.costo.toFixed(2)}
              </td>
            </tr>`
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="text-align: right; text-transform: uppercase; font-size: 8.5pt; color: #334155;">
              TOTAL GENERAL COTIZADO:
            </td>
            <td style="text-align: right; font-size: 11pt; color: #0284c7; font-family: monospace;">
              S/. ${totalPresupuesto.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>`
    }

    <!-- CONDICIONES GENERALES -->
    <div class="text-box" style="margin-top: 10px;">
      <div class="text-box-title">Términos y Condiciones del Presupuesto</div>
      <ul style="padding-left: 14px; font-size: 7.5pt; color: #475569; line-height: 1.4;">
        <li>El presente presupuesto tiene una vigencia de 30 días naturales a partir de su emisión.</li>
        <li>Los pagos se efectúan por avance o de acuerdo con el plan de financiamiento coordinado con la clínica.</li>
        <li>Cualquier procedimiento adicional derivado de hallazgos durante el tratamiento será informado y presupuestado previamente.</li>
      </ul>
    </div>

    <!-- FIRMAS -->
    <div class="signature-area">
      <div class="signature-col">
        <div class="signature-space"></div>
        <div class="signature-line"></div>
        <div class="signature-label">Firma del Paciente / Tutor Legal</div>
        <div class="signature-sub">Aceptación de Plan de Tratamiento y Presupuesto</div>
        <div class="signature-sub">DNI / CE: ______________________</div>
      </div>
      <div class="signature-col">
        <div class="signature-space"></div>
        <div class="signature-line"></div>
        <div class="signature-label">${odontologoNombre || 'Dr(a). Odontólogo Tratante'}</div>
        <div class="signature-sub">C.O.P. ${odontologoCop || '42589'}</div>
        <div class="signature-sub">Firma y Sello Profesional</div>
      </div>
    </div>

    <!-- PIE DE PÁGINA LEGAL -->
    <div class="footer-legal">
      <strong>Aviso de Confidencialidad y Validez:</strong> Este documento es emitido con fines informativos y de planificación clínica odontológica por NeoDents Centro Odontológico Especializado. Los precios incluyen IGV y corresponden a las tarifas clínicas vigentes a la fecha de emisión.
    </div>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=950,height=900,scrollbars=yes')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
  } else {
    alert('Por favor permita las ventanas emergentes (pop-ups) en su navegador para ver e imprimir el presupuesto.')
  }
}



