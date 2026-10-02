import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Icon, SearchInput, Skeleton, Toast, type ToastAviso } from '@/shared/components/ui'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/model/useAuth'
import { BookingLayout } from '../../components/booking/BookingLayout'
import { bookingApi, type BookingBranch, type BookingService } from '../../api/bookingApi'
import { serviciosApi, type EspecialidadOption } from '@/features/servicios/api/serviciosApi'
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
  const [especialidades, setEspecialidades] = useState<EspecialidadOption[]>([])
  const [servicioId, setServicioId] = useState<number | null>(draftState?.servicioId ?? null)
  const [sedeId, setSedeId] = useState<number | null>(draftState?.sedeId ?? null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(() => {
    return (state as { aviso?: ToastAviso } | null)?.aviso ?? null
  })
  const [actualizacion, setActualizacion] = useState(0)

  // CARGAR SERVICIOS, SEDES Y ESPECIALIDADES.
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
        const [services, branches, specs] = await Promise.all([
          bookingApi.servicios(accessToken),
          bookingApi.sedes(accessToken),
          serviciosApi.especialidades(accessToken).catch(() => [] as EspecialidadOption[]),
        ])

        if (!active) return

        setServicios(services)
        setSedes(branches)
        setEspecialidades(specs)

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

  // CATEGORÍAS/ESPECIALIDADES QUE TIENEN SERVICIOS REGISTRADOS
  const categorias = useMemo(() => {
    const counts: Record<number, number> = {}
    servicios.forEach(s => {
      counts[s.especialidadId] = (counts[s.especialidadId] || 0) + 1
    })

    return especialidades
      .filter(e => Boolean(counts[e.id]))
      .map(e => ({
        id: e.id,
        nombre: e.nombre,
        conteo: counts[e.id] || 0,
      }))
  }, [servicios, especialidades])

  // SERVICIOS FILTRADOS POR CATEGORÍA Y BÚSQUEDA
  const serviciosVisibles = useMemo(() => {
    const q = normalizar(busqueda.trim())

    return servicios.filter(s => {
      if (filtroEspecialidad !== null && s.especialidadId !== filtroEspecialidad) {
        return false
      }
      if (q && !normalizar(`${s.nombre} ${s.descripcion ?? ''}`).includes(q)) {
        return false
      }
      return true
    })
  }, [servicios, busqueda, filtroEspecialidad])

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

        {/* ESTADO DE CARGA CON SKELETONS HORIZONTALES */}
        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-xs">
                <Skeleton variant="rounded" className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton variant="circular" className="h-4.5 w-4.5 shrink-0" />
                  </div>
                  <Skeleton className="mt-1.5 h-3 w-5/6 rounded-md opacity-70" />
                  <div className="mt-2.5 flex items-center justify-between border-t border-line/50 pt-2">
                    <Skeleton className="h-3 w-14 rounded-md" />
                    <Skeleton className="h-3 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
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
            {/* ENCABEZADO DE SERVICIOS Y BÚSQUEDA */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[1.05rem] font-bold text-ink">Selecciona un servicio</h2>
                <p className="mt-0.5 text-sm text-muted">¿Qué tratamiento deseas realizarte?</p>
              </div>

              {servicios.length > 4 && (
                <div className="w-full sm:w-64">
                  <SearchInput
                    aria-label="Buscar servicio odontológico"
                    placeholder="Buscar servicio…"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    onClear={() => setBusqueda('')}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* FILTROS RÁPIDOS POR ESPECIALIDAD (PILLS) */}
            {categorias.length > 1 && (
              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFiltroEspecialidad(null)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                    filtroEspecialidad === null
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-alt text-ink-soft hover:bg-hover hover:text-ink',
                  )}
                >
                  <span>Todos</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                      filtroEspecialidad === null ? 'bg-white/20 text-white' : 'bg-surface text-muted',
                    )}
                  >
                    {servicios.length}
                  </span>
                </button>

                {categorias.map(cat => {
                  const activo = filtroEspecialidad === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFiltroEspecialidad(activo ? null : cat.id)}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                        activo
                          ? 'bg-brand text-white shadow-xs'
                          : 'bg-alt text-ink-soft hover:bg-hover hover:text-ink',
                      )}
                    >
                      <span>{cat.nombre}</span>
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                          activo ? 'bg-white/20 text-white' : 'bg-surface text-muted',
                        )}
                      >
                        {cat.conteo}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* CONTADOR DE RESULTADOS */}
            {servicios.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>
                  Mostrando <strong className="text-ink">{serviciosVisibles.length}</strong> de{' '}
                  {servicios.length} tratamientos
                </span>

                {(busqueda.trim() || filtroEspecialidad !== null) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda('')
                      setFiltroEspecialidad(null)
                    }}
                    className="font-medium text-brand hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* SERVICIOS NO DISPONIBLES EN EL SISTEMA */}
            {servicios.length === 0 && (
              <div className="mt-5 rounded-card bg-alt p-5">
                <p className="text-sm text-muted">Todavía no hay servicios disponibles para reservar.</p>
              </div>
            )}

            {/* SIN RESULTADOS DE BÚSQUEDA O FILTRO */}
            {servicios.length > 0 && serviciosVisibles.length === 0 && (
              <div className="mt-4 rounded-xl border border-line bg-alt/40 p-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-muted shadow-xs">
                  <Icon name="search" size={20} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink">No se encontraron servicios</h3>
                <p className="mt-1 text-xs text-muted">
                  No hay tratamientos que coincidan con los filtros aplicados.
                </p>
                <Button
                  variant="ghost"
                  className="mt-3 text-xs"
                  onClick={() => {
                    setBusqueda('')
                    setFiltroEspecialidad(null)
                  }}
                >
                  Restablecer filtros
                </Button>
              </div>
            )}

            {/* TARJETAS DE SERVICIOS HORIZONTALES COMPACTAS */}
            {serviciosVisibles.length > 0 && (
              <div
                role="group"
                aria-label="Seleccionar servicio"
                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {serviciosVisibles.map(service => {
                  const active = service.id === servicioId

                  return (
                    <motion.button
                      key={service.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setServicioId(service.id)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ duration: 0.16 }}
                      className={cn(
                        'group relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                        active
                          ? 'border-brand bg-brand-soft/60 shadow-xs ring-1 ring-brand'
                          : 'border-line bg-surface hover:border-brand/40 hover:bg-alt/40 hover:shadow-xs',
                      )}
                    >
                      {/* Icono a la izquierda */}
                      <span
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors',
                          active ? 'bg-brand text-white shadow-xs' : 'bg-brand-soft text-brand group-hover:bg-brand/15',
                        )}
                      >
                        <Icon name={iconForService(service.nombre)} size={20} strokeWidth={1.75} />
                      </span>

                      {/* Contenido al costado del icono */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                        <div>
                          {/* Fila superior: Nombre e indicador de selección */}
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={cn(
                                'text-sm font-bold leading-snug transition-colors line-clamp-1',
                                active ? 'text-brand' : 'text-ink group-hover:text-brand',
                              )}
                              title={service.nombre}
                            >
                              {service.nombre}
                            </h3>

                            <div
                              className={cn(
                                'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all',
                                active
                                  ? 'border-brand bg-brand text-white'
                                  : 'border-line bg-surface text-transparent group-hover:border-brand/40',
                              )}
                              aria-hidden="true"
                            >
                              <Icon name="check" size={11} strokeWidth={2.5} />
                            </div>
                          </div>

                          {/* Descripción a 2 o 3 líneas */}
                          {service.descripcion && (
                            <p
                              className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted sm:line-clamp-3"
                              title={service.descripcion}
                            >
                              {service.descripcion}
                            </p>
                          )}
                        </div>

                        {/* Footer: Tiempo con icono de reloj + Precio referencial */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line/50 pt-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <Icon name="clock" size={13} className="shrink-0 text-muted" />
                            <span className="font-medium">
                              {service.duracionMinutos !== null ? `${service.duracionMinutos} min` : 'Variable'}
                            </span>
                          </div>

                          <span className={cn('text-xs font-bold tabular-nums', active ? 'text-brand' : 'text-ink')}>
                            {service.precioReferencial === null
                              ? 'Por definir'
                              : `S/ ${service.precioReferencial.toFixed(2)}`}
                          </span>
                        </div>
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

                <div
                  role="group"
                  aria-label="Seleccionar sede"
                  className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {sedesCompatibles.map(branch => {
                    const active = branch.id === sedeId

                    return (
                      <motion.button
                        key={branch.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSedeId(branch.id)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ duration: 0.16 }}
                        className={cn(
                          'group relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
                          active
                            ? 'border-brand bg-brand-soft/60 shadow-xs ring-1 ring-brand'
                            : 'border-line bg-surface hover:border-brand/40 hover:bg-alt/40 hover:shadow-xs',
                        )}
                      >
                        {/* Icono a la izquierda */}
                        <span
                          className={cn(
                            'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors',
                            active ? 'bg-brand text-white shadow-xs' : 'bg-brand-soft text-brand group-hover:bg-brand/15',
                          )}
                        >
                          <Icon name="mapPin" size={20} strokeWidth={1.75} />
                        </span>

                        {/* Contenido al costado del icono */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                          <div>
                            {/* Fila superior: Nombre e indicador de selección */}
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className={cn(
                                  'text-sm font-bold leading-snug transition-colors line-clamp-1',
                                  active ? 'text-brand' : 'text-ink group-hover:text-brand',
                                )}
                                title={branch.nombre}
                              >
                                {branch.nombre}
                              </h3>

                              <div
                                className={cn(
                                  'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all',
                                  active
                                    ? 'border-brand bg-brand text-white'
                                    : 'border-line bg-surface text-transparent group-hover:border-brand/40',
                                )}
                                aria-hidden="true"
                              >
                                <Icon name="check" size={11} strokeWidth={2.5} />
                              </div>
                            </div>

                            {/* Dirección a 2 o 3 líneas */}
                            {branch.direccion && (
                              <p
                                className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted sm:line-clamp-3"
                                title={branch.direccion}
                              >
                                {branch.direccion}
                              </p>
                            )}
                          </div>
                        </div>
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