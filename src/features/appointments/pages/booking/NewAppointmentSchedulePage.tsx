import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Button, Icon, Toast, type ToastAviso } from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { ApiError } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth/model/useAuth'
import { BookingLayout } from '../../components/booking/BookingLayout'
import { bookingApi, type AvailableSlot, type BookingSpecialist } from '../../api/bookingApi'
import { STAFF_BOOKING_STEPS } from '../../model/catalog'

type Draft = {
  paciente?: unknown
  pacienteId?: number
  pacienteNombre?: string
  pacienteDocumento?: string

  servicioId: number
  servicioNombre: string
  especialidadId: number
  duracionMinutos?: number | null
  precioReferencial?: number | null

  sedeId: number
  sedeNombre: string
  sedeDireccion: string
}

type Agenda = { fecha: string; horarios: AvailableSlot[]; error: boolean }
type Slot = { fecha: string; hora: string }

const fechaISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fechaLocal = (iso: string) => new Date(`${iso}T12:00:00`)
const nombreDoctor = (d: BookingSpecialist) => `${d.nombres} ${d.apellidoPaterno} ${d.apellidoMaterno ?? ''}`.trim()

const hora12 = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(fechaLocal(iso))

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(fechaLocal(iso))

function DoctorPhoto({
  doctor,
  accessToken,
}: {
  doctor: BookingSpecialist
  accessToken: string | null
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken || !doctor.tieneFoto) {
      setSrc(null)
      return
    }

    let activo = true
    let objectUrl: string | null = null

    bookingApi.fotoOdontologo(accessToken, doctor.odontologoId)
      .then(blob => {
        if (!activo) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (activo) setSrc(null)
      })

    return () => {
      activo = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessToken, doctor.odontologoId, doctor.tieneFoto])

  if (src) {
    return (
      <div className="size-14 shrink-0 overflow-hidden rounded-full border border-line bg-alt shadow-sm">
        <img
          src={src}
          alt={`Dr(a). ${nombreDoctor(doctor)}`}
          className="size-full object-cover"
        />
      </div>
    )
  }

  return (
    <Avatar
      nombre={doctor.nombres}
      apellido={doctor.apellidoPaterno}
      seed={doctor.odontologoId}
      size={56}
      animate="hover"
      trackCursor={false}
    />
  )
}

export function NewAppointmentSchedulePage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { accessToken, user } = useAuth()
  const administrativo = user?.rol === 'Administrador' || user?.rol === 'Recepcionista'
  const draft = state as Draft | null

  const [doctores, setDoctores] = useState<BookingSpecialist[]>([])
  const [doctorId, setDoctorId] = useState<number | null>(null)
  const [semana, setSemana] = useState(0)
  const [agenda, setAgenda] = useState<Agenda[]>([])
  const [fechaElegida, setFechaElegida] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)

  const [cargandoDoctores, setCargandoDoctores] = useState(true)
  const [cargandoAgenda, setCargandoAgenda] = useState(false)
  const [reservando, setReservando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)

  const reservandoRef = useRef(false)

  // CALENDARIO: Siete días desde la fecha actual.
  const fechas = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + semana * 7 + i)
    return fechaISO(d)
  }), [semana])

  const mesInicio = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(fechaLocal(fechas[0]))
  const mesFin = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(fechaLocal(fechas[6]))
  const periodo = mesInicio === mesFin ? mesInicio : `${mesInicio} – ${mesFin}`

  const doctor = doctores.find(d => d.odontologoEspecialidadId === doctorId)
  const dia = agenda.find(d => d.fecha === fechaElegida)
  const primerCupo = agenda.find(d => d.horarios.length > 0)?.fecha

  const horarios = dia?.horarios ?? []
  const manana = horarios.filter(h => Number(h.horaInicio.slice(0, 2)) < 12)
  const tarde = horarios.filter(h => Number(h.horaInicio.slice(0, 2)) >= 12)

  // CARGAR ESPECIALISTAS REALES.
  useEffect(() => {
    if (!accessToken || !draft?.especialidadId) {
      setCargandoDoctores(false)
      return
    }

    let activo = true
    setCargandoDoctores(true)

    bookingApi.especialistas(accessToken, draft.especialidadId, draft.sedeId)
      .then(data => {
        if (!activo) return
        setDoctores(data)
        setDoctorId(data[0]?.odontologoEspecialidadId ?? null)
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los especialistas.')
      })
      .finally(() => {
        if (activo) setCargandoDoctores(false)
      })

    return () => { activo = false }
  }, [accessToken, draft?.especialidadId, draft?.sedeId])

  // CONSULTAR DISPONIBILIDAD REAL DEL ESPECIALISTA.
  useEffect(() => {
    if (!accessToken || !draft || doctorId === null) return

    let activo = true

    setAgenda([])
    setFechaElegida(null)
    setSlot(null)
    setCargandoAgenda(true)

    Promise.allSettled(fechas.map(fecha =>
      bookingApi.disponibilidad(accessToken, doctorId, draft.sedeId, draft.servicioId, fecha)
    )).then(resultados => {
      if (!activo) return

      const dias: Agenda[] = resultados.map((resultado, i) => ({
        fecha: fechas[i],
        horarios: resultado.status === 'fulfilled' ? resultado.value.horarios : [],
        error: resultado.status === 'rejected',
      }))

      setAgenda(dias)
      setFechaElegida(dias.find(d => d.horarios.length > 0)?.fecha ?? fechas[0])

      if (dias.some(d => d.error)) {
        setError('Algunas fechas no pudieron consultarse. Puedes pulsar «Actualizar» para intentarlo de nuevo.')
      }
    }).finally(() => {
      if (activo) setCargandoAgenda(false)
    })

    return () => { activo = false }
  }, [accessToken, draft?.sedeId, draft?.servicioId, doctorId, fechas, actualizacion])

  // SELECCIONAR ESPECIALISTA.
  const elegirDoctor = (id: number) => {
    if (reservandoRef.current || id === doctorId) return

    setDoctorId(id)
    setAgenda([])
    setFechaElegida(null)
    setSlot(null)
    setError('')
    setCargandoAgenda(true)
  }

  // NAVEGAR ENTRE SEMANAS.
  const cambiarSemana = (n: number) => {
    if (n < 0 || reservandoRef.current) return

    setSemana(n)
    setAgenda([])
    setFechaElegida(null)
    setSlot(null)
    setError('')
    setCargandoAgenda(true)
  }

  // ACTUALIZAR DISPONIBILIDAD.
  const actualizar = () => {
    if (cargandoAgenda || reservandoRef.current) return

    setError('')
    setSlot(null)
    setActualizacion(n => n + 1)
  }

  // SOLICITAR HOLD Y CONTINUAR.
  const continuar = async () => {
    if (!accessToken || !draft || !doctor || !slot || reservandoRef.current) return

    reservandoRef.current = true
    setReservando(true)
    setError('')

    try {
      const hora = slot.hora.slice(0, 5)

      const hold = await bookingApi.reservar(accessToken, {
        ...(administrativo ? { pacienteId: draft.pacienteId } : {}),
        odontologoEspecialidadId: doctor.odontologoEspecialidadId,
        sedeId: draft.sedeId,
        servicioId: draft.servicioId,
        fechaHoraInicio: `${slot.fecha}T${hora}:00`,
      })

      navigate(administrativo ? '/citas/nueva/confirmar' : '/mis-citas/nueva/confirmar',
        {
          state: {
            ...draft,
            odontologoEspecialidadId: doctor.odontologoEspecialidadId,
            odontologoNombre: nombreDoctor(doctor),
            fecha: slot.fecha,
            hora,
            tokenReserva: hold.tokenReserva,
            expiresAt: hold.expiresAt,
            segundosRestantes: hold.segundosRestantes,
            venceEnMs: Date.now() + hold.segundosRestantes * 1000,
          },
        }
      )
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const msg = 'Ese horario acaba de ser reservado por otra persona. Actualizamos la disponibilidad para ti.'
        setError(msg)
        setAviso({ tipo: 'error', texto: msg })
        setSlot(null)
        setActualizacion(n => n + 1)
      } else {
        const msg = e instanceof Error ? e.message : 'No se pudo reservar el horario. Inténtalo de nuevo.'
        setError(msg)
        setAviso({ tipo: 'error', texto: msg })
      }
    } finally {
      reservandoRef.current = false
      setReservando(false)
    }
  }

  if (!draft?.servicioId || !draft?.sedeId || !draft?.especialidadId ||
    (administrativo && !draft?.pacienteId)) {
    return (
      <Navigate to={administrativo ? '/citas/nueva' : '/mis-citas/nueva'} replace />
    )
  }

  return (
    <BookingLayout
      step={administrativo ? 2 : 1}
      steps={administrativo ? STAFF_BOOKING_STEPS : undefined}
      exitTo={administrativo ? '/citas' : '/mis-citas'}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* RESUMEN DE LA SELECCIÓN */}
          <div className="min-w-0 text-sm max-sm:w-full">
            <p className="text-xs text-muted">Tu selección</p>
            <p className="truncate font-semibold text-ink">
              {slot && doctor
                ? `${fechaCorta(slot.fecha)} a las ${hora12(slot.hora)} · Dr(a). ${nombreDoctor(doctor)}`
                : `${draft.servicioNombre} · ${draft.sedeNombre}`}
            </p>
          </div>

          <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-end">
            <Button 
              variant="ghost"
              disabled={reservando}
              onClick={() => navigate(administrativo ? '/citas/nueva/datos' : '/mis-citas/nueva', 
                  {
                    state: {
                      ...(administrativo
                        ? {
                            paciente: draft.paciente,
                            pacienteId: draft.pacienteId,
                            pacienteNombre: draft.pacienteNombre,
                            pacienteDocumento: draft.pacienteDocumento,
                          }
                        : {}),
                      servicioId: draft.servicioId,
                      sedeId: draft.sedeId,
                    },
                  },
                )
              }
            >
              Regresar
            </Button>

            <Button onClick={() => void continuar()} disabled={!slot || reservando || cargandoAgenda}>
              {reservando ? 'Reservando…' : 'Continuar'}
            </Button>
          </div>
        </div>
      }
    >

      <section className="mt-6 grid min-w-0 gap-7 rounded-card border border-line bg-surface p-6 shadow-card lg:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)] max-sm:p-4">

        {/* COLUMNA IZQUIERDA: ESPECIALISTAS */}
        <div className="min-w-0">

          <h2 className="text-base font-bold text-ink">
            Selecciona un especialista
          </h2>

          <div className="mt-1 text-sm text-muted">
            <p>{draft.servicioNombre} · {draft.sedeNombre}</p>

            <p className="mt-1 text-xs">
              {draft.duracionMinutos != null && `${draft.duracionMinutos} min · `}
              {draft.precioReferencial == null
                ? 'Precio por definir'
                : `S/ ${draft.precioReferencial.toFixed(2)} referencial`}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3" role="group" aria-label="Especialista">

            {cargandoDoctores && (
              <p className="text-sm text-muted">Cargando especialistas…</p>
            )}

            {!cargandoDoctores && doctores.length === 0 && (
              <p className="rounded-card bg-alt p-4 text-sm text-muted">
                No hay especialistas asociados a este servicio.
              </p>
            )}

            {doctores.map(d => {
              const elegido = doctorId === d.odontologoEspecialidadId

              const textoCupo = elegido && !cargandoAgenda
                ? primerCupo
                  ? `Cita disponible: ${fechaCorta(primerCupo)}`
                  : agenda.some(a => a.error)
                    ? 'Disponibilidad no verificada'
                    : 'Sin cupos esta semana'
                : elegido
                  ? 'Consultando disponibilidad…'
                  : 'Consultar disponibilidad'

              return (
                <motion.button
                  key={d.odontologoEspecialidadId}
                  type="button"
                  aria-pressed={elegido}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => elegirDoctor(d.odontologoEspecialidadId)}
                  disabled={reservando}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-card border p-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait',
                    elegido
                      ? 'border-brand bg-brand-soft shadow-sm'
                      : 'border-line bg-surface hover:border-brand/50 hover:bg-alt',
                  )}
                >

                  {/* AVATAR DEL ESPECIALISTA */}
                  <DoctorPhoto
                    doctor={d}
                    accessToken={accessToken}
                  />

                  {/* DATOS DEL ESPECIALISTA */}
                  <div className="min-w-0 flex-1">

                    <p className="text-sm font-bold leading-snug text-ink">
                      Dr(a). {nombreDoctor(d)}
                    </p>

                    <p className="mt-0.5 text-xs text-muted">
                      {d.especialidad}
                    </p>

                    {/* BADGE DE DISPONIBILIDAD */}
                    <span className={cn(
                      'mt-2 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-medium leading-tight',
                      elegido && primerCupo && !cargandoAgenda
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-alt text-muted',
                    )}>

                      <span className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        elegido && primerCupo && !cargandoAgenda
                          ? 'bg-emerald-500'
                          : 'bg-slate-400',
                      )} />

                      {textoCupo}

                    </span>
                  </div>

                </motion.button>
              )
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: FECHA Y HORA */}
        <div className="min-w-0 lg:border-l lg:border-line lg:pl-7">

          {/* ENCABEZADO DEL CALENDARIO */}
          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>
              <h2 className="text-base font-bold text-ink">
                Elige fecha y hora
              </h2>

              <p className="mt-1 text-sm capitalize text-muted">
                {periodo}
              </p>
            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                aria-label="Semana anterior"
                onClick={() => cambiarSemana(semana - 1)}
                disabled={semana === 0 || reservando}
                className="rounded-lg border border-line p-2 text-ink transition hover:bg-alt disabled:opacity-40"
              >
                <Icon name="chevronLeft" size={18} />
              </button>

              <button
                type="button"
                aria-label="Semana siguiente"
                onClick={() => cambiarSemana(semana + 1)}
                disabled={reservando}
                className="rounded-lg border border-line p-2 text-ink transition hover:bg-alt disabled:opacity-40"
              >
                <Icon name="chevronRight" size={18} />
              </button>

              <button
                type="button"
                onClick={actualizar}
                disabled={cargandoAgenda || reservando}
                className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition hover:bg-alt disabled:opacity-40"
              >
                Actualizar
              </button>

            </div>
          </div>

          {/* MENSAJES DE ERROR */}
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          {/* CALENDARIO SEMANAL */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Selecciona una fecha">

            {fechas.map(fecha => {
              const d = agenda.find(a => a.fecha === fecha)
              const disponible = !!d?.horarios.length
              const seleccionado = fecha === fechaElegida
              const fechaObj = fechaLocal(fecha)

              return (
                <button
                  key={fecha}
                  type="button"
                  aria-pressed={seleccionado}
                  disabled={reservando || cargandoAgenda || !doctor || !disponible}
                  onClick={() => { setFechaElegida(fecha); setSlot(null) }}
                  className={cn(
                    'flex min-w-[4.25rem] flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed',
                    seleccionado
                      ? 'border-brand bg-brand text-white shadow-sm'
                      : disponible
                        ? 'border-line text-ink hover:border-brand hover:bg-brand-soft'
                        : 'border-line bg-alt text-muted opacity-60',
                  )}
                >

                  <span className="text-[0.7rem] font-medium uppercase">
                    {new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(fechaObj)}
                  </span>

                  <span className="text-lg font-bold">
                    {fechaObj.getDate()}
                  </span>

                  <span className={cn(
                    'h-1 w-1 rounded-full',
                    seleccionado ? 'bg-white' : disponible ? 'bg-brand' : 'bg-transparent',
                  )} />

                </button>
              )
            })}
          </div>

          <p className="mt-1 text-xs text-muted">
            El punto azul indica fechas con horarios disponibles.
          </p>

          {/* HORARIOS DISPONIBLES */}
          <div className="mt-6 border-t border-line pt-5">

            {cargandoAgenda ? (
              <p className="text-sm text-muted">
                Consultando horarios disponibles…
              </p>
            ) : !doctor ? (
              <p className="text-sm text-muted">
                Selecciona un especialista para consultar su agenda.
              </p>
            ) : (

              <AnimatePresence mode="wait">

                <motion.div
                  key={`${doctorId}-${fechaElegida}-${actualizacion}`}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >

                  <h3 className="text-sm font-bold capitalize text-ink">
                    {fechaElegida ? fechaLarga(fechaElegida) : 'Selecciona una fecha'}
                  </h3>

                  {dia?.error ? (

                    <p className="mt-4 text-sm text-muted">
                      No se pudo consultar esta fecha. Pulsa «Actualizar».
                    </p>

                  ) : horarios.length === 0 ? (

                    <div className="mt-4 rounded-xl bg-alt p-5 text-sm text-muted">

                      <p>No hay horarios disponibles para esta fecha.</p>

                      <button
                        type="button"
                        onClick={() => cambiarSemana(semana + 1)}
                        className="mt-2 font-semibold text-brand hover:underline"
                      >
                        Ver los próximos 7 días →
                      </button>

                    </div>

                  ) : (

                    <div className="mt-5 space-y-5">

                      {([
                        ['MAÑANA', manana],
                        ['TARDE', tarde],
                      ] as const).map(([titulo, turnos]) => turnos.length > 0 && (

                        <div key={titulo}>

                          <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-muted">
                            <Icon name="clock" size={15} />
                            {titulo}
                          </p>

                          <div
                            role="radiogroup"
                            aria-label={`Horarios de ${titulo.toLowerCase()}`}
                            className="flex flex-wrap gap-2"
                          >

                            {turnos.map(h => {
                              const elegido = slot?.fecha === fechaElegida && slot.hora === h.horaInicio

                              return (
                                <motion.button
                                  key={h.horaInicio}
                                  type="button"
                                  role="radio"
                                  aria-checked={elegido}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => setSlot({ fecha: fechaElegida!, hora: h.horaInicio })}
                                  disabled={reservando}
                                  className={cn(
                                    'rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                                    elegido
                                      ? 'border-brand bg-brand text-white shadow-sm'
                                      : 'border-line bg-surface text-ink hover:border-brand hover:bg-brand-soft',
                                  )}
                                >
                                  {hora12(h.horaInicio)}
                                </motion.button>
                              )
                            })}

                          </div>
                        </div>

                      ))}
                    </div>

                  )}

                </motion.div>

              </AnimatePresence>

            )}
          </div>

          {/* RESUMEN DE LA SELECCIÓN */}
          {slot && (

            <p className="mt-5 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-ink">

              <Icon
                name="checkCircle"
                size={16}
                className="mr-2 inline-block align-text-bottom text-brand"
              />

              Seleccionaste el <span className="font-semibold">{fechaLarga(slot.fecha)}</span> a las{' '}
              <span className="font-semibold">{hora12(slot.hora)}</span>.

            </p>

          )}

        </div>
      </section>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </BookingLayout>
  )
}