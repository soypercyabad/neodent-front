import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Icon, Toast, type ToastAviso } from '@/shared/components/ui'
import { useAuth } from '@/features/auth/model/useAuth'
import { ApiError } from '@/shared/api/apiClient'
import { BookingLayout } from '../../components/booking/BookingLayout'
import { bookingApi, type CreatedAppointment } from '../../api/bookingApi'
import { citaReferencia } from '../../model/citaReferencia'
import { STAFF_BOOKING_STEPS } from '../../model/catalog'
import { dispararCelebracion } from '@/shared/lib/confetti'

type HoldDraft = {
  paciente?: unknown
  pacienteId?: number
  pacienteNombre?: string
  pacienteDocumento?: string
  servicioId: number
  servicioNombre: string
  especialidadId: number
  sedeId: number
  sedeNombre: string
  sedeDireccion: string
  odontologoEspecialidadId: number
  odontologoNombre: string
  fecha: string
  hora: string
  tokenReserva: string
  venceEnMs: number
  duracionMinutos?: number | null
  precioReferencial?: number | null
}

const reservasLiberadas = new Set<string>()
const reservasConfirmadas = new Set<string>()

const formatoFecha = (fecha: string) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'full' }).format(new Date(`${fecha}T12:00:00`))

const tiempoRestante = (venceEnMs: number) =>
  Math.max(0, Math.ceil((venceEnMs - Date.now()) / 1000))

export function NewAppointmentConfirmPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { accessToken, user } = useAuth()
  const administrativo = user?.rol === 'Administrador' || user?.rol === 'Recepcionista'

  const reserva = state as HoldDraft | null
  const token = reserva?.tokenReserva ?? ''
  const venceEnMs = reserva?.venceEnMs ?? 0

  const [restante, setRestante] = useState(() => tiempoRestante(venceEnMs))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [cita, setCita] = useState<CreatedAppointment | null>(null)

  useEffect(() => {
    if (cita) {
      dispararCelebracion()
    }
  }, [cita])

  const montado = useRef(false)
  const confirmando = useRef(false)
  const confirmado = useRef(false)
  const liberado = useRef(false)

  const liberar = useCallback((keepalive = false) => {
    if (!accessToken || !token || confirmado.current || confirmando.current) return
    if (liberado.current || reservasLiberadas.has(token)) return

    liberado.current = true
    reservasLiberadas.add(token)

    void bookingApi.liberar(accessToken, token, keepalive).catch(() => {
      // Si falla la liberación, el backend conserva la expiración automática.
    })
  }, [accessToken, token])

const formatoHora = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

  useEffect(() => {
    montado.current = true

    const actualizar = () => setRestante(tiempoRestante(venceEnMs))
    actualizar()

    const intervalo = window.setInterval(actualizar, 500)
    const salir = () => liberar(true)

    window.addEventListener('pagehide', salir)

    return () => {
      montado.current = false
      window.clearInterval(intervalo)
      window.removeEventListener('pagehide', salir)

      queueMicrotask(() => {
        if (!montado.current) liberar()
      })
    }
  }, [venceEnMs, liberar])

  const regresar = () => {
    if (guardando || confirmando.current) return

    liberar()

    if (!reserva) {
      navigate(administrativo ? '/citas/nueva' : '/mis-citas/nueva', { replace: true })
      return
    }

    const {
      pacienteId,
      pacienteNombre,
      pacienteDocumento,
      servicioId,
      servicioNombre,
      especialidadId,
      duracionMinutos,
      precioReferencial,
      sedeId,
      sedeNombre,
      sedeDireccion,
    } = reserva

    navigate(
      administrativo
        ? '/citas/nueva/fecha-y-hora'
        : '/mis-citas/nueva/fecha-y-hora',
      {
        replace: true,

        state: {
          paciente: reserva.paciente,
          pacienteId,
          pacienteNombre,
          pacienteDocumento,
          servicioId,
          servicioNombre,
          especialidadId,
          duracionMinutos,
          precioReferencial,
          sedeId,
          sedeNombre,
          sedeDireccion,
        },
      },
    )
  }

  const confirmar = async () => {
    if (!accessToken || !reserva || confirmado.current || confirmando.current) return
    if (liberado.current || reservasLiberadas.has(token) || tiempoRestante(venceEnMs) <= 0) return

    confirmando.current = true
    setGuardando(true)
    setError('')

    try {
      const creada = await bookingApi.confirmar(accessToken, token)

      confirmado.current = true
      reservasConfirmadas.add(token)

      if (montado.current) setCita(creada)
    } catch (e) {
      if (montado.current) {
        const msg =
          e instanceof ApiError && [404, 409].includes(e.status)
            ? 'La reserva expiró o el horario ya no está disponible. Selecciona otro horario.'
            : e instanceof Error
              ? e.message
              : 'No se pudo confirmar la cita. Inténtalo nuevamente.'
        if (e instanceof ApiError && [404, 409].includes(e.status)) {
          setRestante(0)
        }
        setError(msg)
        setAviso({ tipo: 'error', texto: msg })
      }
    } finally {
      confirmando.current = false

      if (montado.current) setGuardando(false)
      else liberar()
    }
  }

  if (!reserva?.servicioId || !reserva?.sedeId || !token || !Number.isFinite(venceEnMs) || venceEnMs <= 0) {
    return (
      <Navigate
        to={administrativo ? '/citas/nueva' : '/mis-citas/nueva'}
        replace
      />
    )
  }

  if (reservasConfirmadas.has(token) && !cita) {
    return (
      <Navigate
        to={administrativo ? '/citas' : '/mis-citas'}
        replace
      />
    )
  }

  if (reservasLiberadas.has(token) && !cita) {
    return (
  <Navigate
    to={
      administrativo
        ? '/citas/nueva/fecha-y-hora'
        : '/mis-citas/nueva/fecha-y-hora'
    }
    state={reserva}
    replace
  />
)
  }

  return (
    <BookingLayout
      step={administrativo ? 3 : 2}
      steps={administrativo ? STAFF_BOOKING_STEPS : undefined}
      exitTo={administrativo ? '/citas' : '/mis-citas'}
      footer={cita ? (
        <>
          <Button
            variant="ghost"
            onClick={() =>
              navigate(administrativo ? '/citas' : '/mis-citas', {
                replace: true,
                state: {
                  aviso: {
                    tipo: 'success',
                    texto: 'Cita programada correctamente.',
                  },
                },
              })
            }
          >
            {administrativo ? 'Volver a citas' : 'Ver mis citas'}
          </Button>

          <Button
            onClick={() =>
              navigate(
                administrativo
                  ? `/citas/${cita.idCita}`
                  : `/mis-citas/${cita.idCita}`,
                {
                  replace: true,
                  state: {
                    aviso: {
                      tipo: 'success',
                      texto: 'Cita programada correctamente.',
                    },
                  },
                },
              )
            }
          >
            Ver detalle
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={regresar} disabled={guardando}>
            Elegir otro horario
          </Button>

          <Button onClick={() => void confirmar()} disabled={guardando || restante <= 0 || !accessToken}>
            {guardando ? 'Confirmando…' : administrativo ? 'Programar cita' : 'Confirmar mi cita'}
          </Button>
        </>
      )}
    >
      <section className="mt-6 mb-8 rounded-2xl border border-line bg-surface p-6 shadow-card sm:mb-10 sm:p-8">
        {cita ? (
          <div role="status" className="py-2 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-success-soft text-success shadow-xs">
              <Icon name="checkCircle" size={32} />
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              ¡Tu cita fue programada con éxito!
            </h2>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-alt px-4 py-1.5 text-xs text-muted shadow-2xs">
              <span>Código de referencia:</span>
              <span className="font-mono text-sm font-bold text-brand">{citaReferencia(cita.idCita)}</span>
            </div>

            <p className="mt-2 text-sm text-muted">
              {administrativo
                ? 'La cita ya se encuentra registrada en la agenda del centro odontológico.'
                : 'Tu cita se registró correctamente. Puedes consultar los detalles y gestionarla desde Mis citas.'}
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Revisa y confirma tu cita
            </h2>

            <p className="mt-1 text-sm text-muted">
              Verifica los datos de tu reserva antes de confirmarla.
            </p>

            <div
              className="mt-5 rounded-2xl border border-brand/20 bg-gradient-to-b from-brand-soft/80 to-brand-soft/30 p-5 text-center shadow-xs sm:p-6"
              role="timer"
              aria-label="Tiempo restante de reserva"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-surface/90 px-3.5 py-1 text-xs font-semibold text-brand shadow-2xs">
                <Icon name="clock" size={14} className="text-brand" />
                <span>Horario reservado temporalmente</span>
              </div>

              <div className="mt-3 text-4xl font-extrabold tracking-tight tabular-nums text-brand sm:text-5xl">
                {String(Math.floor(restante / 60)).padStart(2, '0')}:
                {String(restante % 60).padStart(2, '0')}
              </div>

              <p className="mt-2 text-xs font-medium text-muted sm:text-sm">
                {restante > 0
                  ? 'Por favor confirma tu reserva antes de que finalice la cuenta regresiva.'
                  : 'El tiempo de reserva ha finalizado. Por favor selecciona otro horario disponible.'}
              </p>
            </div>
          </>
        )}

        <div className="mt-7 border-t border-line pt-6 sm:mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-ink sm:text-[1.05rem]">
              Resumen de tu cita
            </h3>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              {reserva.duracionMinutos ? `${reserva.duracionMinutos} min de atención` : 'Atención clínica'}
            </span>
          </div>

          {/* PACIENTE (SOLO VISTA ADMINISTRATIVA) */}
          {administrativo && reserva.pacienteNombre && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-alt/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon name="user" size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Paciente</p>
                  <p className="font-bold text-ink">{reserva.pacienteNombre}</p>
                </div>
              </div>

              {reserva.pacienteDocumento && (
                <div className="rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink shadow-2xs">
                  {reserva.pacienteDocumento}
                </div>
              )}
            </div>
          )}

          {/* GRID MODULAR DE DETALLES */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* SERVICIO Y ESPECIALISTA */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-alt/40 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-brand shadow-2xs">
                  <Icon name="tooth" size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Tratamiento o servicio</p>
                  <p className="mt-0.5 text-sm font-bold text-ink sm:text-base">
                    {reserva.servicioNombre}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-line/80 pt-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-brand shadow-2xs">
                  <Icon name="user" size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Especialista asignado</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">
                    {reserva.odontologoNombre.startsWith('Dr')
                      ? reserva.odontologoNombre
                      : `Dr(a). ${reserva.odontologoNombre}`}
                  </p>
                </div>
              </div>
            </div>

            {/* FECHA, HORA Y SEDE */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-alt/40 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-brand shadow-2xs">
                  <Icon name="calendar" size={19} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Fecha y horario</p>
                  <p className="mt-0.5 text-sm font-bold capitalize text-ink sm:text-base">
                    {formatoFecha(reserva.fecha)}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-brand sm:text-sm">
                    {formatoHora(reserva.hora)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-line/80 pt-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-brand shadow-2xs">
                  <Icon name="mapPin" size={19} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">Sede de atención</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{reserva.sedeNombre}</p>
                  {reserva.sedeDireccion && (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {reserva.sedeDireccion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* DETALLE DE COSTO REFERENCIAL */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-alt/30 p-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Icon name="clock" size={17} className="text-muted" />
              <span className="text-xs text-muted">Duración estimada:</span>
              <span className="text-xs font-semibold text-ink">
                {reserva.duracionMinutos != null ? `${reserva.duracionMinutos} minutos` : 'Por determinar en consulta'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Precio referencial:</span>
              <span className="text-sm font-extrabold text-ink sm:text-base">
                {reserva.precioReferencial != null
                  ? `S/ ${reserva.precioReferencial.toFixed(2)}`
                  : 'Por definir'}
              </span>
            </div>
          </div>

          {/* AVISO INFORMATIVO */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line/80 bg-alt/50 p-3.5 text-xs leading-relaxed text-muted">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-brand" />
            <span>
              El precio mostrado es referencial. El importe definitivo se determinará según los procedimientos clínicos y materiales requeridos durante la atención.
            </span>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </section>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </BookingLayout>
  )
}