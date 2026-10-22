import { ClinicalHistoryPage } from './ClinicalHistoryPage'

/**
 * Vista integral del paciente (unificada con el expediente clínico)
 * Muestra por defecto la pestaña "Detalles del paciente" con la cabecera oscura
 * y el resumen sin redundancia.
 */
export function PatientDetailPage() {
  return <ClinicalHistoryPage defaultTab="DETALLES" />
}