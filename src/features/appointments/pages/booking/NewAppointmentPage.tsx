import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Icon, SearchInput, Toast, type ToastAviso } from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/model/useAuth'
import { BookingLayout } from '../../components/booking/BookingLayout'
import { bookingApi, type BookingBranch, type BookingService } from '../../api/bookingApi'
import { STAFF_BOOKING_STEPS } from '../../model/catalog'

// ICONOS SEGÚN EL TIPO DE SERVICIO.
function iconForService(name: string) {
  const value = name.toLowerCase()

  if (/ortodoncia|bracket|alineador/.test(value)) return 'braces' as const
  if (/extracci|exodoncia/.test(value)) return 'forceps' as const
  if (/conducto|endodoncia|curaci|restauraci/.test(value)) return 'toothCracked' as const

  return 'tooth' as const
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

type StaffPatientDraft = {
  paciente?: unknown
  pacienteId: number
  pacienteNombre: string
  pacienteDocumento: string
  servicioId?: number
  sedeId?: number
}

export function NewAppointmentPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { accessToken, user } = useAuth()

  const draftState = state as (StaffPatientDraft & { servicioId?: number; sedeId?: number }) | null
  const pacienteDraft = draftState
  const administrativo = user?.rol === 'Administrador' || user?.rol === 'Recepcionista'

  const [servicios, setServicios] = useState<BookingService[]>([])
  const [sedes, setSedes] = useState<BookingBranch[]>([])
  const [servicioId, setServicioId] = useState<number | null>(draftState?.servicioId ?? null)
  const [sedeId, setSedeId] = useState<number | null>(draftState?.sedeId ?? null)

  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(() => {
    return (state as { aviso?: ToastAviso } | null)?.aviso ?? null
  })
  const [actualizacion, setActualizacion] = useState(0)

  // CARGAR SERVICIOS Y SEDES REALES.
  useEffect(() => {
    let active = true

    if (!accessToken) {
      setLoading(false)
      setError('No se encontró una sesión activa.')
      return
    }

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const [services, branches] = await Promise.all([
          bookingApi.servicios(accessToken),
          bookingApi.sedes(accessToken),
        ])

        if (!active) return

        setServicios(services)
        setSedes(branches)

        setServicioId(actual => {
          if (actual && services.some(s => s.id === actual)) return actual
          if (draftState?.servicioId && services.some(s => s.id === draftState.servicioId)) return draftState.servicioId
          return services[0]?.id ?? null
        })
        setSedeId(actual => {
          if (actual && branches.some(s => s.id === actual)) return actual
          if (draftState?.sedeId && branches.some(s => s.id === draftState.sedeId)) return draftState.sedeId
          return branches[0]?.id ?? null
        })

      } catch (err) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'No se pudieron cargar los servicios y las sedes.'
          setError(msg)
          setAviso({ tipo: 'error', texto: msg })
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }

  }, [accessToken, actualizacion])

  const servicioSeleccionado = servicios.find(s => s.id === servicioId)
  const sedesCompatibles = sedes.filter(s => servicioSeleccionado?.sedeIds.includes(s.id))
  const sedeSeleccionada = sedesCompatibles.find(s => s.id === sedeId)

  useEffect(() => {
    if (!sedesCompatibles.length) return
    setSedeId(actual =>
      actual && sedesCompatibles.some(s => s.id === actual)
        ? actual
        : sedesCompatibles[0]?.id ?? null
    )
  }, [servicioId, servicios, sedes])

  const serviciosVisibles = servicios.filter(s =>
    normalizar(`${s.nombre} ${s.descripcion ?? ''}`).includes(normalizar(busqueda.trim()))
  )

  // CONTINUAR CON EL SERVICIO Y LA SEDE SELECCIONADOS.
  const goNext = () => {
    if (!servicioSeleccionado || !sedeSeleccionada) return
    if (administrativo && !pacienteDraft?.pacienteId) return

    navigate(administrativo ? '/citas/nueva/fecha-y-hora' : '/mis-citas/nueva/fecha-y-hora',
      {
        state: {
          ...(administrativo && pacienteDraft ? pacienteDraft : {}),
          servicioId: servicioSeleccionado.id,
          servicioNombre: servicioSeleccionado.nombre,
          especialidadId: servicioSeleccionado.especialidadId,
          duracionMinutos: servicioSeleccionado.duracionMinutos,
          precioReferencial: servicioSeleccionado.precioReferencial,
          sedeId: sedeSeleccionada.id,
          sedeNombre: sedeSeleccionada.nombre,
          sedeDireccion: sedeSeleccionada.direccion,
        },
      },
    )
  }

  if (administrativo && !pacienteDraft?.pacienteId) {
    return (<Navigate to="/citas/nueva" replace />)
  }

  return (
    <BookingLayout
      step={administrativo ? 1 : 0}
      steps={administrativo ? STAFF_BOOKING_STEPS : undefined}
      exitTo={administrativo ? '/citas' : '/mis-citas'}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* RESUMEN DE LA SELECCIÓN */}
          <div className="min-w-0 text-sm max-sm:w-full">
            {servicioSeleccionado && sedeSeleccionada && !loading && !error && (
              <>
                <p className="text-xs text-muted">Tu selección</p>
                <p className="truncate font-semibold text-ink">
                  {servicioSeleccionado.nombre} · {sedeSeleccionada.nombre}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-end">
            <Button
              variant="ghost"
              onClick={() =>
                navigate(administrativo ? '/citas/nueva' : '/mis-citas', {
                  state: administrativo
                    ? {
                        paciente: pacienteDraft?.paciente,
                        pacienteId: pacienteDraft?.pacienteId,
                        pacienteNombre: pacienteDraft?.pacienteNombre,
                        pacienteDocumento: pacienteDraft?.pacienteDocumento,
                      }
                    : undefined,
                })
              }
            >
              {administrativo ? 'Regresar' : 'Cancelar'}
            </Button>

            <Button onClick={goNext} disabled={loading || !!error || !servicioSeleccionado || !sedeSeleccionada}>
              Continuar
            </Button>
          </div>
        </div>
      }
    >

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-6 rounded-card border border-line bg-surface px-7 py-6 shadow-card max-sm:px-5"
      >

        {/* ESTADO DE CARGA */}
        {loading && (
          <div role="status" className="flex flex-col items-center gap-3 py-12">
            <Icon name="spinner" size={28} className="animate-spin text-brand" />
            <p className="text-sm text-muted">Cargando servicios y sedes…</p>
          </div>
        )}

        {/* ERROR DE CARGA */}
        {!loading && error && (
          <div className="flex flex-col items-start gap-3 py-6">
            <p role="alert" className="text-sm text-danger">{error}</p>

            {accessToken && (
              <Button variant="ghost" onClick={() => setActualizacion(n => n + 1)}>
                Intentar nuevamente
              </Button>
            )}
          </div>
        )}

        {!loading && !error && (
          <>

            {/* ENCABEZADO DE SERVICIOS */}
            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>
                <h2 className="text-[1.05rem] font-bold text-ink">Selecciona un servicio</h2>
                <p className="mt-1 text-sm text-muted">¿Qué tratamiento deseas realizarte?</p>
              </div>

              {servicios.length > 8 && (
                <SearchInput
                  aria-label="Buscar servicio odontológico"
                  placeholder="Buscar servicio..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onClear={() => setBusqueda('')}
                  className="w-full sm:w-64"
                />
              )}

            </div>

            {/* SERVICIOS NO DISPONIBLES */}
            {servicios.length === 0 && (
              <div className="mt-5 rounded-card bg-alt p-5">
                <p className="text-sm text-muted">Todavía no hay servicios disponibles para reservar.</p>
              </div>
            )}

            {/* SIN RESULTADOS DE BÚSQUEDA */}
            {servicios.length > 0 && serviciosVisibles.length === 0 && (
              <div className="mt-5 rounded-card bg-alt p-5">
                <p className="text-sm text-muted">No encontramos servicios que coincidan con tu búsqueda.</p>
              </div>
            )}

            {/* TARJETAS DE SERVICIOS */}
            {serviciosVisibles.length > 0 && (
              <div role="group" aria-label="Seleccionar servicio"
                className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

                {serviciosVisibles.map(service => {
                  const active = service.id === servicioId

                  return (
                    <motion.button
                      key={service.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setServicioId(service.id)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        'relative flex min-h-[11.5rem] w-full flex-col items-center justify-center rounded-card border p-3 text-center transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                        active
                          ? 'border-brand bg-brand-soft shadow-sm'
                          : 'border-transparent bg-alt hover:border-brand/40 hover:bg-hover',
                      )}
                    >

                      {/* INDICADOR DE SELECCIÓN */}
                      {active && (
                        <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.18 }} className="absolute right-2 top-2 text-brand">
                          <Icon name="checkCircle" size={17} />
                        </motion.span>
                      )}

                      {/* ICONO DEL SERVICIO */}
                      <div className={cn(
                        'grid h-12 w-12 place-items-center rounded-xl transition-colors',
                        active ? 'bg-brand/10 text-brand' : 'bg-surface text-ink-soft',
                      )}>
                        <Icon name={iconForService(service.nombre)} size={32} strokeWidth={1.5} />
                      </div>

                      {/* NOMBRE Y DESCRIPCIÓN */}
                      <h3 className={cn(
                        'mt-3 text-[0.9rem] font-bold leading-snug',
                        active ? 'text-brand' : 'text-ink',
                      )}>
                        {service.nombre}
                      </h3>

                      {service.descripcion && (
                        <p className="mt-1 line-clamp-3 break-words text-[0.78rem] leading-relaxed text-muted"
                          title={service.descripcion}>
                          {service.descripcion}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[0.7rem]">

                        {service.duracionMinutos !== null && (
                          <span className="rounded-lg bg-surface px-2 py-1 font-semibold text-ink-soft">
                            {service.duracionMinutos} min
                          </span>
                        )}

                        <span className="rounded-lg bg-surface px-2 py-1 font-semibold text-brand">
                          {service.precioReferencial === null
                            ? 'Precio por definir'
                            : `S/ ${service.precioReferencial.toFixed(2)}`}
                        </span>

                      </div>

                    </motion.button>
                  )
                })}

              </div>
            )}

            {/* SELECCIÓN DE SEDE */}
            <div className="mt-8 border-t border-line pt-7">

              <h2 className="text-[1.05rem] font-bold text-ink">¿Dónde quieres atenderte?</h2>
              <p className="mt-1 text-sm text-muted">Selecciona la sede donde deseas realizar tu cita.</p>

              {sedesCompatibles.length === 0 ? (
                <div className="mt-4 rounded-card bg-alt p-5">
                  <p className="text-sm text-muted">
                    Este servicio no está disponible en ninguna sede habilitada.
                    Selecciona otro tratamiento.
                  </p>
                </div>
              ) : (

                <div role="group" aria-label="Seleccionar sede" className="mt-4 flex flex-wrap gap-3">

                  {sedesCompatibles.map(branch => {
                    const active = branch.id === sedeId

                    return (
                      <motion.button
                        key={branch.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSedeId(branch.id)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-card border p-4 text-left transition-colors sm:w-[17rem]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                          active
                            ? 'border-brand bg-brand-soft shadow-sm'
                            : 'border-line bg-surface hover:border-brand/40 hover:bg-hover',
                        )}
                      >

                        {/* ICONO DE UBICACIÓN */}
                        <span className={cn(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                          active ? 'bg-brand/10 text-brand' : 'bg-alt text-ink-soft',
                        )}>
                          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
                            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                        </span>

                        {/* INFORMACIÓN DE LA SEDE */}
                        <span className="min-w-0 flex-1">
                          <span className={cn(
                            'block text-sm font-bold leading-snug',
                            active ? 'text-brand' : 'text-ink',
                          )}>
                            {branch.nombre}
                          </span>

                          {branch.direccion && (
                            <span className="mt-1 block text-xs leading-relaxed text-muted">
                              {branch.direccion}
                            </span>
                          )}
                        </span>

                        {active && <Icon name="checkCircle" size={18} className="shrink-0 text-brand" />}

                      </motion.button>
                    )
                  })}

                </div>
              )}

            </div>

          </>
        )}

      </motion.section>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </BookingLayout>
  )
}