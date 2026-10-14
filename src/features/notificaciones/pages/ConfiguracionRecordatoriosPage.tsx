import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth'
import {
  Button,
  Card,
  Icon,
  PageHead,
  Toast,
  type ToastAviso,
} from '@/shared/components/ui'
import { notificacionesApi, type ConfiguracionNotificacionItem } from '../api/notificacionesApi'

type PresetHours = '12' | '24' | '48' | 'custom'

interface FormState {
  activoRecordatorio: boolean
  hoursSelection: PresetHours
  customHours: number
  canalCorreo: boolean
  canalPortal: boolean
  cancelCorreo: boolean
  cancelPortal: boolean
}

const DEFAULT_STATE: FormState = {
  activoRecordatorio: true,
  hoursSelection: '24',
  customHours: 36,
  canalCorreo: true,
  canalPortal: true,
  cancelCorreo: true,
  cancelPortal: true,
}

export function ConfiguracionRecordatoriosPage() {
  const { accessToken, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastAviso | null>(null)

  // Estados del formulario
  const [form, setForm] = useState<FormState>(DEFAULT_STATE)
  const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_STATE)

  // Auditoría
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null)
  const [actualizadoPor, setActualizadoPor] = useState<string | null>(null)

  // Estado del tester de notificaciones
  const [testTipo, setTestTipo] = useState<'RECORDATORIO_CITA' | 'CANCELACION_CITA'>('RECORDATORIO_CITA')
  const [testEmail, setTestEmail] = useState(user?.correo || '')
  const [enviandoPrueba, setEnviandoPrueba] = useState(false)
  const [testFeedback, setTestFeedback] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    if (user?.correo && !testEmail) {
      setTestEmail(user.correo)
    }
  }, [user?.correo])

  const cargarConfiguracion = async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const items = await notificacionesApi.getConfiguraciones(accessToken)

      const recordatorio = items.find((i: ConfiguracionNotificacionItem) => i.codigo === 'RECORDATORIO_CITA_PROXIMA')
      const cancelacion = items.find((i: ConfiguracionNotificacionItem) => i.codigo === 'CANCELACION_CITA')

      let hoursSel: PresetHours = '24'
      let customH = 36

      if (recordatorio) {
        const val = recordatorio.anticipacionValor
        if (recordatorio.anticipacionUnidad === 'HORAS' && (val === 12 || val === 24 || val === 48)) {
          hoursSel = String(val) as PresetHours
        } else {
          hoursSel = 'custom'
          customH = recordatorio.anticipacionUnidad === 'DIAS' ? val * 24 : val
        }
      }

      const loadedState: FormState = {
        activoRecordatorio: recordatorio ? recordatorio.activo : true,
        hoursSelection: hoursSel,
        customHours: customH,
        canalCorreo: recordatorio ? recordatorio.canalCorreo : true,
        canalPortal: recordatorio ? recordatorio.canalPortal : true,
        cancelCorreo: cancelacion ? cancelacion.canalCorreo : true,
        cancelPortal: cancelacion ? cancelacion.canalPortal : true,
      }

      setForm(loadedState)
      setInitialForm(loadedState)

      if (recordatorio?.fechaActualizacion) {
        setUltimaActualizacion(recordatorio.fechaActualizacion)
        setActualizadoPor(recordatorio.actualizadoPor || null)
      }
    } catch (err: any) {
      setToast({
        tipo: 'error',
        titulo: 'Error al cargar',
        texto: err.message || 'No se pudo cargar la configuración de notificaciones.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      cargarConfiguracion()
    }
  }, [accessToken])

  // Detectar cambios sin guardar
  const tieneCambios = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm)
  }, [form, initialForm])

  // Calcular valor efectivo en horas
  const horasEfectivas = useMemo(() => {
    if (form.hoursSelection === 'custom') {
      return form.customHours
    }
    return parseInt(form.hoursSelection, 10) || 24
  }, [form.hoursSelection, form.customHours])

  // Resumen legible de canales de recordatorio
  const canalesRecordatorioTexto = useMemo(() => {
    if (!form.activoRecordatorio) return 'Recordatorios desactivados'
    const activos = [
      form.canalCorreo && 'Correo electrónico',
      form.canalPortal && 'Portal web',
    ].filter(Boolean)
    return activos.length > 0 ? activos.join(' y ') : 'Ningún canal seleccionado'
  }, [form.activoRecordatorio, form.canalCorreo, form.canalPortal])

  // Resumen legible de canales de cancelación
  const canalesCancelacionTexto = useMemo(() => {
    const activos = [
      form.cancelCorreo && 'Correo',
      form.cancelPortal && 'Portal',
    ].filter(Boolean)
    return activos.length > 0 ? activos.join(' y ') : 'Ninguno'
  }, [form.cancelCorreo, form.cancelPortal])

  const handleRestablecer = () => {
    setForm(initialForm)
    setTestFeedback(null)
    setToast({
      tipo: 'info',
      titulo: 'Valores restablecidos',
      texto: 'Se recuperó la configuración guardada anteriormente.',
    })
  }

  const handleGuardar = async () => {
    if (!accessToken) return

    if (form.activoRecordatorio && !form.canalCorreo && !form.canalPortal) {
      setToast({
        tipo: 'warning',
        titulo: 'Canal requerido',
        texto: 'Debes mantener al menos un canal activo (Correo o Portal) para los recordatorios.',
      })
      return
    }

    if (form.hoursSelection === 'custom' && (form.customHours < 1 || form.customHours > 168)) {
      setToast({
        tipo: 'warning',
        titulo: 'Rango de anticipación',
        texto: 'La anticipación personalizada debe estar comprendida entre 1 y 168 horas (máximo 7 días).',
      })
      return
    }

    setSaving(true)
    try {
      // 1. Guardar regla de recordatorio
      const respRecordatorio = await notificacionesApi.actualizarConfiguracion(
        accessToken,
        'RECORDATORIO_CITA_PROXIMA',
        {
          activo: form.activoRecordatorio,
          canalCorreo: form.canalCorreo,
          canalPortal: form.canalPortal,
          anticipacionValor: horasEfectivas,
          anticipacionUnidad: 'HORAS',
        }
      )

      // 2. Guardar canales de cancelación
      try {
        await notificacionesApi.actualizarConfiguracion(accessToken, 'CANCELACION_CITA', {
          activo: true,
          canalCorreo: form.cancelCorreo,
          canalPortal: form.cancelPortal,
          anticipacionValor: 0,
          anticipacionUnidad: 'HORAS',
        })
      } catch (e) {
        console.warn('Nota: Cancelación guardada localmente', e)
      }

      setInitialForm(form)
      setUltimaActualizacion(respRecordatorio.fechaActualizacion || new Date().toISOString())
      setActualizadoPor(respRecordatorio.actualizadoPor || user?.correo || null)

      setToast({
        tipo: 'success',
        titulo: 'Configuración actualizada',
        texto: 'Las reglas de notificación y recordatorios se guardaron correctamente en el sistema.',
      })
    } catch (err: any) {
      setToast({
        tipo: 'error',
        titulo: 'Error al guardar',
        texto: err.message || 'Ocurrió un error al intentar actualizar la configuración.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEnviarPrueba = async () => {
    if (!accessToken) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!testEmail || !emailRegex.test(testEmail.trim())) {
      setTestFeedback({
        tipo: 'error',
        texto: 'Por favor, ingresa un correo electrónico de prueba válido.',
      })
      return
    }

    setEnviandoPrueba(true)
    setTestFeedback(null)

    try {
      const resp = await notificacionesApi.probarNotificacion(
        accessToken,
        testTipo,
        testEmail.trim()
      )
      setTestFeedback({
        tipo: 'success',
        texto: resp.mensaje || `Prueba enviada exitosamente a ${testEmail.trim()}`,
      })
    } catch (err: any) {
      setTestFeedback({
        tipo: 'error',
        texto: err.message || 'No se pudo enviar el correo de prueba. Verifica las credenciales de Brevo.',
      })
    } finally {
      setEnviandoPrueba(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Encabezado principal */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHead
          title="Configuración de Notificaciones"
          description="Define las reglas de anticipación y los canales de aviso para los pacientes de la clínica."
        />
      </div>

      {loading ? (
        <Card className="flex h-64 items-center justify-center p-8 text-center">
          <div className="flex items-center gap-3 text-slate-700">
            <Icon name="spinner" size={22} className="animate-spin text-brand" />
            <span className="text-sm font-semibold">Cargando configuración del sistema…</span>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] gap-6 items-start">
          {/* ========================================================
              COLUMNA PRINCIPAL (FORMULARIO Y ACCIONES)
             ======================================================== */}
          <div className="space-y-6">
            {/* TARJETA 1: RECORDATORIOS DE CITAS */}
            <Card className="p-6">
              {/* Header con Switch de activación */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-5">
                <div className="flex items-start gap-3.5">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand border border-blue-100">
                    <Icon name="bell" size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                      Recordatorios de citas
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                      Envío automático antes de cada cita médica programada o confirmada.
                    </p>
                  </div>
                </div>

                {/* Switch de activación con etiqueta clara */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                  <span
                    className={`text-xs font-bold ${
                      form.activoRecordatorio ? 'text-brand' : 'text-slate-500'
                    }`}
                  >
                    {form.activoRecordatorio ? 'Activos' : 'Desactivados'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.activoRecordatorio}
                    onClick={() =>
                      setForm(prev => ({
                        ...prev,
                        activoRecordatorio: !prev.activoRecordatorio,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand/40 ${
                      form.activoRecordatorio ? 'bg-brand' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        form.activoRecordatorio ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Contenedor interactivo (atenuado si está desactivado) */}
              <div
                className={`space-y-6 pt-5 transition-opacity duration-200 ${
                  form.activoRecordatorio
                    ? 'opacity-100'
                    : 'opacity-40 pointer-events-none select-none'
                }`}
              >
                {/* 1. Selección de anticipación */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    ¿Con cuánta anticipación se enviará el recordatorio?
                  </label>
                  <p className="text-xs text-slate-600 mb-3.5">
                    El horario de envío se calcula respecto a la fecha y hora fijada para cada cita.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Opción 12 horas */}
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, hoursSelection: '12' }))}
                      className={`cursor-pointer rounded-xl border p-4 text-left transition select-none flex flex-col justify-between ${
                        form.hoursSelection === '12'
                          ? 'border-2 border-brand bg-blue-50/70 text-brand shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-900">12 horas antes</span>
                      <span className="text-xs mt-1.5 font-medium text-slate-500">
                        Aviso cercano
                      </span>
                    </button>

                    {/* Opción 24 horas (Sugerida) */}
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, hoursSelection: '24' }))}
                      className={`cursor-pointer rounded-xl border p-4 text-left transition select-none flex flex-col justify-between ${
                        form.hoursSelection === '24'
                          ? 'border-2 border-brand bg-blue-50/70 text-brand shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-900">24 horas antes</span>
                      <span className="text-xs mt-1.5 font-semibold text-brand">
                        Opción sugerida
                      </span>
                    </button>

                    {/* Opción 48 horas */}
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, hoursSelection: '48' }))}
                      className={`cursor-pointer rounded-xl border p-4 text-left transition select-none flex flex-col justify-between ${
                        form.hoursSelection === '48'
                          ? 'border-2 border-brand bg-blue-50/70 text-brand shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-900">48 horas antes</span>
                      <span className="text-xs mt-1.5 font-medium text-slate-500">
                        2 días antes
                      </span>
                    </button>

                    {/* Opción Personalizado */}
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, hoursSelection: 'custom' }))}
                      className={`cursor-pointer rounded-xl border p-4 text-left transition select-none flex flex-col justify-between ${
                        form.hoursSelection === 'custom'
                          ? 'border-2 border-brand bg-blue-50/70 text-brand shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="text-sm font-bold text-slate-900">Personalizado</span>
                      <span className="text-xs mt-1.5 font-medium text-slate-500">
                        Definir plazo
                      </span>
                    </button>
                  </div>

                  {/* Campo de horas personalizadas con rango razonable (1 a 72 horas) */}
                  {form.hoursSelection === 'custom' && (
                    <div className="mt-3.5 p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-0.5">
                          Anticipación personalizada (en horas)
                        </label>
                        <p className="text-xs text-slate-600">
                          Define entre 1 y 72 horas previas a la cita (ej. 36 horas = 1 día y medio).
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={72}
                          value={form.customHours}
                          onChange={e =>
                            setForm(prev => ({
                              ...prev,
                              customHours: Math.max(1, Math.min(72, parseInt(e.target.value) || 1)),
                            }))
                          }
                          className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                        />
                        <span className="text-xs font-bold text-slate-700">horas</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Canales de comunicación */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1">
                    Canales de comunicación
                  </label>
                  <p className="text-xs text-slate-600 mb-3.5">
                    Selecciona las vías por donde el paciente recibirá su recordatorio.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Canal Correo Electrónico */}
                    <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={form.canalCorreo}
                        onChange={e => setForm(prev => ({ ...prev, canalCorreo: e.target.checked }))}
                        className="mt-1 size-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon name="mail" size={17} className="text-brand shrink-0" />
                          <span className="text-sm font-bold text-slate-900">Correo electrónico</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          Envía la plantilla corporativa con doctor, fecha, hora y enlace directo al correo registrado.
                        </p>
                      </div>
                    </label>

                    {/* Canal Portal Web */}
                    <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={form.canalPortal}
                        onChange={e => setForm(prev => ({ ...prev, canalPortal: e.target.checked }))}
                        className="mt-1 size-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon name="bell" size={17} className="text-brand shrink-0" />
                          <span className="text-sm font-bold text-slate-900">Portal NeoDents</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          Notificación visible en la barra superior al iniciar sesión en el portal web de pacientes.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </Card>

            {/* TARJETA 2: AVISOS DE CANCELACIÓN */}
            <Card className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-4">
                <div className="flex items-start gap-3.5">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <Icon name="xCircle" size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                        Avisos de cancelación
                      </h2>
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        Automático
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                      Avisos inmediatos al paciente cuando una cita es cancelada en el sistema.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Notifica al paciente el cambio de estado, conserva el motivo registrado en la plataforma y cancela
                  definitivamente cualquier recordatorio futuro programado para esa cita.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-2">Canales de cancelación</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={form.cancelCorreo}
                        onChange={e => setForm(prev => ({ ...prev, cancelCorreo: e.target.checked }))}
                        className="mt-1 size-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon name="mail" size={17} className="text-rose-600 shrink-0" />
                          <span className="text-sm font-bold text-slate-900">Correo electrónico</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Envío del mensaje con el motivo registrado y fecha cancelada.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition select-none">
                      <input
                        type="checkbox"
                        checked={form.cancelPortal}
                        onChange={e => setForm(prev => ({ ...prev, cancelPortal: e.target.checked }))}
                        className="mt-1 size-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon name="bell" size={17} className="text-rose-600 shrink-0" />
                          <span className="text-sm font-bold text-slate-900">Portal NeoDents</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Registro inmediato en la bandeja de alertas internas del paciente.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </Card>

            {/* BARRA DE CONTROLES: RESTABLECER Y GUARDAR */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="text-xs">
                {tieneCambios ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    Hay cambios pendientes de guardar
                  </span>
                ) : (
                  <span className="text-slate-600">Todas las reglas coinciden con la base de datos</span>
                )}
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <Button
                  variant="ghost"
                  onClick={handleRestablecer}
                  disabled={saving || !tieneCambios}
                  icon="refreshCw"
                >
                  Restablecer cambios
                </Button>

                <Button
                  variant="primary"
                  onClick={handleGuardar}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Icon name="spinner" size={16} className="animate-spin" />
                      <span>Guardando cambios…</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={16} />
                      <span>Guardar configuración</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* ========================================================
              COLUMNA LATERAL (RESUMEN REACTIVO Y BUENAS PRÁCTICAS)
             ======================================================== */}
          <aside className="space-y-6 lg:sticky lg:top-6">
            {/* TARJETA LATERAL 1: RESUMEN DE LA CONFIGURACIÓN */}
            <Card className="p-6">
              <h2 className="text-base font-bold text-slate-900">Resumen de la configuración</h2>
              <p className="text-xs text-slate-600 mt-0.5 mb-4">Vista previa de la regla que se aplicará.</p>

              <ul className="divide-y divide-slate-200 text-xs">
                {/* Estado de recordatorios */}
                <li className="py-3">
                  <strong className="block text-slate-900 text-[13px] mb-1 font-semibold">Recordatorios</strong>
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${
                      form.activoRecordatorio
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {form.activoRecordatorio ? 'Activos' : 'Desactivados'}
                  </span>
                </li>

                {/* Anticipación */}
                <li className="py-3">
                  <strong className="block text-slate-900 text-[13px] mb-0.5 font-semibold">Anticipación</strong>
                  <span className="text-slate-700 font-semibold">
                    {horasEfectivas} {horasEfectivas === 1 ? 'hora' : 'horas'} antes
                  </span>
                </li>

                {/* Canales */}
                <li className="py-3">
                  <strong className="block text-slate-900 text-[13px] mb-0.5 font-semibold">Canales</strong>
                  <span className="text-slate-700 font-medium">
                    {canalesRecordatorioTexto}
                  </span>
                </li>

                {/* Citas consideradas */}
                <li className="py-3">
                  <strong className="block text-slate-900 text-[13px] mb-0.5 font-semibold">Citas consideradas</strong>
                  <span className="text-slate-700 font-medium">Programadas y confirmadas</span>
                </li>

                {/* Cancelaciones */}
                <li className="py-3">
                  <strong className="block text-slate-900 text-[13px] mb-0.5 font-semibold">Cancelaciones</strong>
                  <span className="text-slate-700 font-medium">
                    Aviso inmediato ({canalesCancelacionTexto})
                  </span>
                </li>
              </ul>

              {/* Pie de auditoría */}
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px]">
                {tieneCambios ? (
                  <span className="text-amber-700 font-bold">
                    ● Cambios sin guardar
                  </span>
                ) : ultimaActualizacion ? (
                  <span className="text-slate-600">
                    Última sincronización: {new Date(ultimaActualizacion).toLocaleString('es-PE')}
                    {actualizadoPor && ` (${actualizadoPor})`}
                  </span>
                ) : (
                  <span className="text-slate-500">Sin modificaciones recientes</span>
                )}
              </div>
            </Card>

            {/* TARJETA LATERAL 2: PROBAR ENVÍO DE NOTIFICACIÓN */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="flask" size={18} className="text-brand" />
                <h2 className="text-base font-bold text-slate-900">Probar Notificación</h2>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Envía un correo de prueba usando la plantilla y el servicio transaccional configurado.
              </p>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de plantilla
                  </label>
                  <select
                    value={testTipo}
                    onChange={e => setTestTipo(e.target.value as 'RECORDATORIO_CITA' | 'CANCELACION_CITA')}
                    disabled={enviandoPrueba}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-xs focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  >
                    <option value="RECORDATORIO_CITA">Recordatorio de Cita Próxima</option>
                    <option value="CANCELACION_CITA">Aviso de Cancelación de Cita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo electrónico de destino
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    disabled={enviandoPrueba}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-xs focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  />
                </div>

                {testFeedback && (
                  <div
                    className={`rounded-lg p-2.5 text-xs flex items-start gap-2 ${
                      testFeedback.tipo === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <Icon
                      name={testFeedback.tipo === 'success' ? 'check' : 'alertCircle'}
                      size={15}
                      className="shrink-0 mt-0.5"
                    />
                    <span className="leading-snug">{testFeedback.texto}</span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnviarPrueba}
                  disabled={enviandoPrueba || !testEmail.trim()}
                  className="w-full justify-center text-xs"
                >
                  {enviandoPrueba ? (
                    <>
                      <Icon name="spinner" size={14} className="animate-spin" />
                      <span>Enviando prueba…</span>
                    </>
                  ) : (
                    <>
                      <Icon name="mail" size={14} />
                      <span>Enviar correo de prueba</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      )}

      {toast && <Toast aviso={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
