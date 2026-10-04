import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AnimatedDatePicker,
  Button,
  Card,
  Icon,
  PageHead,
  Toast,
  type ToastAviso,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import {
  citaDetalleApi,
  type DetalleCita,
} from '../api/citaDetalleApi'
import {
  bookingApi,
  type AvailableSlot,
} from '../api/bookingApi'

const hoy = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Lima',
  })

const hora12 = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function ReprogramAppointmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const citaId = Number(id)

  const [cita, setCita] = useState<DetalleCita | null>(null)
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [motivo, setMotivo] = useState('')
  const [horarios, setHorarios] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [cargandoHoras, setCargandoHoras] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)

  const manana = useMemo(
    () => horarios.filter(h => Number(h.horaInicio.slice(0, 2)) < 12),
    [horarios],
  )

  const tarde = useMemo(
    () => horarios.filter(h => Number(h.horaInicio.slice(0, 2)) >= 12),
    [horarios],
  )

  useEffect(() => {
    if (!accessToken || !Number.isSafeInteger(citaId)) return

    citaDetalleApi.detalle(accessToken, citaId)
      .then(data => {
        setCita(data)
        setFecha(data.fechaHoraInicio.slice(0, 10))
      })
      .catch(e =>
        setError(
          e instanceof Error
            ? e.message
            : 'No se pudo cargar la cita.',
        ),
      )
      .finally(() => setLoading(false))
  }, [accessToken, citaId])

  useEffect(() => {
    if (
      !accessToken ||
      !cita ||
      !fecha ||
      cita.servicioId == null
    ) return

    let activo = true

    setCargandoHoras(true)
    setHora('')
    setError('')

    bookingApi.disponibilidad(
      accessToken,
      cita.odontologoEspecialidadId,
      cita.sedeId,
      cita.servicioId,
      fecha,
    )
      .then(data => {
        if (activo) setHorarios(data.horarios)
      })
      .catch(e => {
        if (activo) {
          setHorarios([])
          setError(
            e instanceof Error
              ? e.message
              : 'No se pudo consultar la disponibilidad.',
          )
        }
      })
      .finally(() => {
        if (activo) setCargandoHoras(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, cita, fecha])

  const guardar = async () => {
    if (
      !accessToken ||
      !cita ||
      !fecha ||
      !hora ||
      saving
    ) return

    setSaving(true)
    setError('')

    try {
      await citaDetalleApi.reprogramar(
        accessToken,
        cita.idCita,
        `${fecha}T${hora.slice(0, 5)}:00`,
        motivo,
      )

      navigate(`/citas/${cita.idCita}`, {
        replace: true,
        state: {
          aviso: {
            tipo: 'success',
            texto: 'Cita reprogramada correctamente.',
          },
        },
      })
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'No se pudo reprogramar la cita.'
      setError(msg)
      setAviso({ tipo: 'error', texto: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHead
        title="Reprogramar cita"
        description="Selecciona una nueva fecha y horario disponible."
      />

      {loading ? (
        <Card className="flex items-center justify-center gap-3 p-12">
          <Icon name="spinner" size={22} className="animate-spin text-brand" />
          <span className="text-sm text-muted">
            Cargando cita…
          </span>
        </Card>
      ) : cita ? (
        <div className="mx-auto max-w-4xl space-y-5">
          <Card className="p-5">
            <h2 className="font-bold text-ink">
              Cita actual
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted">Paciente</p>
                <p className="mt-1 font-semibold text-ink">
                  {cita.pacienteNombre}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted">Especialista</p>
                <p className="mt-1 font-semibold text-ink">
                  Dr(a). {cita.odontologoNombre}
                </p>
                <p className="text-xs text-muted">
                  {cita.especialidadNombre}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted">Servicio</p>
                <p className="mt-1 font-semibold text-ink">
                  {cita.servicioNombre}
                </p>
                {cita.duracionMinutos != null && (
                  <p className="text-xs text-muted">
                    {cita.duracionMinutos} min
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted">Sede</p>
                <p className="mt-1 font-semibold text-ink">
                  {cita.sedeNombre}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
              <div>
                <label className="mb-2 block text-sm font-bold text-ink">
                  Nueva fecha
                </label>

                <AnimatedDatePicker
                  value={fecha}
                  onChange={setFecha}
                  min={hoy()}
                  label="Nueva fecha"
                />

                <p className="mt-2 text-xs text-muted">
                  Se consultan los turnos configurados del especialista para la fecha seleccionada.
                </p>
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-bold text-ink">
                    Horarios disponibles
                  </label>
                  {hora && (
                    <span className="text-xs font-semibold text-brand">
                      Seleccionado: {hora12(hora)}
                    </span>
                  )}
                </div>

                {cargandoHoras ? (
                  <div className="flex h-12 items-center gap-2 rounded-xl bg-alt px-4 text-sm text-muted">
                    <Icon
                      name="spinner"
                      size={18}
                      className="animate-spin text-brand"
                    />
                    Consultando disponibilidad del especialista…
                  </div>
                ) : horarios.length === 0 ? (
                  <div className="rounded-xl border border-line bg-alt p-4 text-sm text-muted">
                    <p className="font-semibold text-ink">No hay horarios disponibles</p>
                    <p className="mt-1 text-xs text-muted">
                      El especialista no cuenta con turnos de atención configurados para esta fecha, o todos los cupos se encuentran ocupados o con bloqueos activos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {([
                      ['MAÑANA', manana],
                      ['TARDE', tarde],
                    ] as const).map(([titulo, turnos]) => turnos.length > 0 && (
                      <div key={titulo}>
                        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted">
                          <Icon name="clock" size={14} />
                          {titulo}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {turnos.map(slot => {
                            const value = slot.horaInicio.slice(0, 5)
                            const elegido = hora === value

                            return (
                              <button
                                key={slot.horaInicio}
                                type="button"
                                onClick={() => setHora(value)}
                                className={
                                  elegido
                                    ? 'rounded-xl border border-brand bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-xs'
                                    : 'rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:border-brand hover:bg-brand-soft'
                                }
                              >
                                {hora12(slot.horaInicio)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-bold text-ink">
                Motivo del cambio
              </label>

              <textarea
                value={motivo}
                maxLength={255}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej. El paciente solicitó cambiar la fecha…"
                className="min-h-24 w-full resize-y rounded-control border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand"
              />
            </div>

            {error && (
              <p className="mt-4 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/citas/${cita.idCita}`)
                }
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button
                onClick={() => void guardar()}
                disabled={!fecha || !hora || saving}
              >
                {saving
                  ? 'Reprogramando…'
                  : 'Guardar nueva fecha'}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-danger">
          {error || 'Cita no encontrada.'}
        </Card>
      )}

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </>
  )
}