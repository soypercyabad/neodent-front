import { useEffect, useState } from 'react'
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

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              </div>

              <div>
                <p className="text-xs text-muted">Servicio</p>
                <p className="mt-1 font-semibold text-ink">
                  {cita.servicioNombre}
                </p>
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
            <div className="grid gap-5 sm:grid-cols-2">
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-ink">
                  Horario
                </label>

                {cargandoHoras ? (
                  <div className="flex h-11 items-center gap-2 text-sm text-muted">
                    <Icon
                      name="spinner"
                      size={17}
                      className="animate-spin"
                    />
                    Consultando…
                  </div>
                ) : horarios.length === 0 ? (
                  <div className="rounded-xl bg-alt p-3 text-sm text-muted">
                    No hay horarios disponibles.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {horarios.map(slot => {
                      const value = slot.horaInicio.slice(0, 5)

                      return (
                        <button
                          key={slot.horaInicio}
                          type="button"
                          onClick={() => setHora(value)}
                          className={
                            hora === value
                              ? 'rounded-xl border border-brand bg-brand px-4 py-2 text-sm font-bold text-white'
                              : 'rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-brand'
                          }
                        >
                          {value}
                        </button>
                      )
                    })}
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