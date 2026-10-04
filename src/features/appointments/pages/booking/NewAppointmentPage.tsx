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
  const [filtroTab, setFiltroTab] = useState<'destacados' | number>('destacados')
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

        setServicios(services)
        setSedes(branches)
        setEspecialidades(specs)

        const defaultSede = draftState?.sedeId && branches.some(s => s.id === draftState.sedeId)
          ? draftState.sedeId
          : (branches[0]?.id ?? null)

        setSedeId(actual => {
          if (actual && branches.some(s => s.id === actual)) return actual
          return defaultSede
        })

        const activeSedeId = defaultSede
        const servicesForSede = activeSedeId ? services.filter(s => s.sedeIds.includes(activeSedeId)) : services

        setServicioId(actual => {
          if (actual && servicesForSede.some(s => s.id === actual)) return actual
          if (draftState?.servicioId && servicesForSede.some(s => s.id === draftState.servicioId)) return draftState.servicioId
          return servicesForSede[0]?.id ?? null
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

  const sedeSeleccionada = sedes.find(s => s.id === sedeId)

  // SERVICIOS DISPONIBLES EN LA SEDE SELECCIONADA
  const serviciosEnSede = useMemo(() => {
    if (!sedeId) return []
    return servicios.filter(s => s.sedeIds.includes(sedeId))
  }, [servicios, sedeId])

  // Deseleccionar o ajustar servicio si cambia la sede y ya no está disponible
  useEffect(() => {
    if (servicioId && !serviciosEnSede.some(s => s.id === servicioId)) {
      setServicioId(serviciosEnSede[0]?.id ?? null)
    }
  }, [serviciosEnSede, servicioId])

  const servicioSeleccionado = serviciosEnSede.find(s => s.id === servicioId)

  // SERVICIOS DESTACADOS DE LA SEDE
  const serviciosDestacados = useMemo(
    () => serviciosEnSede.filter(s => Boolean(s.destacado)),
    [serviciosEnSede],
  )

  // CATEGORÍAS/ESPECIALIDADES QUE TIENEN SERVICIOS REGISTRADOS EN ESTA SEDE
  const categorias = useMemo(() => {
    const counts: Record<number, number> = {}
    serviciosEnSede.forEach(s => {
      counts[s.especialidadId] = (counts[s.especialidadId] || 0) + 1
    })

    return especialidades
      .filter(e => Boolean(counts[e.id]))
      .map(e => ({
        id: e.id,
        nombre: e.nombre,
        conteo: counts[e.id] || 0,
      }))
  }, [serviciosEnSede, especialidades])

  // SERVICIOS FILTRADOS POR CATEGORÍA Y BÚSQUEDA
  const serviciosVisibles = useMemo(() => {
    const q = normalizar(busqueda.trim())

    return serviciosEnSede.filter(s => {
      if (q) {
        return normalizar(`${s.nombre} ${s.descripcion ?? ''}`).includes(q)
      }
      if (filtroTab === 'destacados') {
        return Boolean(s.destacado)
      }
      return s.especialidadId === filtroTab
    })
  }, [serviciosEnSede, busqueda, filtroTab])

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
            {/* 1. SELECCIÓN DE SEDE */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-[1.05rem] font-bold text-ink">1. ¿Dónde deseas atenderte?</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    Selecciona el establecimiento para ver los tratamientos y horarios disponibles.
                  </p>
                </div>

                {sedes.length > 0 && (
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                    {sedes.length} {sedes.length === 1 ? 'sede disponible' : 'sedes disponibles'}
                  </span>
                )}
              </div>

              {sedes.length === 0 ? (
                <div className="mt-4 rounded-xl bg-alt p-5 text-sm text-muted">
                  No hay sedes habilitadas en este momento.
                </div>
              ) : (
                <div
                  role="group"
                  aria-label="Seleccionar sede"
                  className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {sedes.map(branch => {
                    const active = branch.id === sedeId

                    return (
                      <motion.button
                        key={branch.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setSedeId(branch.id)
                          setBusqueda('')
                        }}
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
                        <span
                          className={cn(
                            'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors',
                            active ? 'bg-brand text-white shadow-xs' : 'bg-brand-soft text-brand group-hover:bg-brand/15',
                          )}
                        >
                          <Icon name="mapPin" size={20} strokeWidth={1.75} />
                        </span>

                        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                          <div>
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

                            <p
                              className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted sm:line-clamp-3"
                              title={branch.direccion}
                            >
                              {branch.direccion}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 2. SELECCIÓN DE SERVICIO */}
            <div className="mt-8 border-t border-line pt-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-[1.05rem] font-bold text-ink">2. Selecciona un servicio</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {sedeSeleccionada
                      ? `Tratamientos con doctores y horarios disponibles en ${sedeSeleccionada.nombre}`
                      : 'Elige una sede arriba para ver los tratamientos disponibles.'}
                  </p>
                </div>

                {serviciosEnSede.length > 4 && (
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

              {/* FILTROS RÁPIDOS POR CATEGORÍA (DESTACADOS + ESPECIALIDADES DE ESTA SEDE) */}
              {sedeId && (categorias.length > 0 || serviciosDestacados.length > 0) && (
                <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setFiltroTab('destacados')}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                      filtroTab === 'destacados'
                        ? 'bg-brand text-white shadow-xs'
                        : 'bg-alt text-ink-soft hover:bg-hover hover:text-ink',
                    )}
                  >
                    <Icon
                      name={filtroTab === 'destacados' ? 'starFilled' : 'star'}
                      size={12}
                      className={filtroTab === 'destacados' ? 'text-amber-300' : 'text-amber-500'}
                    />
                    <span>Destacados</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                        filtroTab === 'destacados' ? 'bg-white/20 text-white' : 'bg-surface text-muted',
                      )}
                    >
                      {serviciosDestacados.length}
                    </span>
                  </button>

                  {categorias.map(cat => {
                    const activo = filtroTab === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFiltroTab(cat.id)}
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
              {serviciosEnSede.length > 0 && (
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>
                    Mostrando <strong className="text-ink">{serviciosVisibles.length}</strong> de{' '}
                    {serviciosEnSede.length} tratamientos en esta sede
                  </span>

                  {(busqueda.trim() || filtroTab !== 'destacados') && (
                    <button
                      type="button"
                      onClick={() => {
                        setBusqueda('')
                        setFiltroTab('destacados')
                      }}
                      className="font-medium text-brand hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}

              {/* SIN SERVICIOS EN ESTA SEDE */}
              {sedeId && serviciosEnSede.length === 0 && (
                <div className="mt-5 rounded-xl border border-line bg-alt/40 p-8 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-muted shadow-xs">
                    <Icon name="tooth" size={20} />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-ink">Sin servicios disponibles en esta sede</h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
                    Actualmente no hay tratamientos con doctores y horarios configurados en {sedeSeleccionada?.nombre ?? 'esta sede'}. Prueba seleccionando otra sede arriba.
                  </p>
                </div>
              )}

              {/* SIN RESULTADOS DE BÚSQUEDA O TAB */}
              {serviciosEnSede.length > 0 && serviciosVisibles.length === 0 && (
                <div className="mt-4 rounded-xl border border-line bg-alt/40 p-8 text-center">
                  {filtroTab === 'destacados' && !busqueda.trim() ? (
                    <>
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-500 shadow-xs">
                        <Icon name="star" size={20} />
                      </div>
                      <h3 className="mt-3 text-sm font-bold text-ink">Sin servicios destacados en esta sede</h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
                        No hay tratamientos marcados como destacados en esta sede. Selecciona una de las especialidades arriba para ver todos los disponibles.
                      </p>
                    </>
                  ) : (
                    <>
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
                          setFiltroTab('destacados')
                        }}
                      >
                        Restablecer filtros
                      </Button>
                    </>
                  )}
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
                              <div className="min-w-0 flex-1">
                                <h3
                                  className={cn(
                                    'flex items-center gap-1.5 text-sm font-bold leading-snug transition-colors',
                                    active ? 'text-brand' : 'text-ink group-hover:text-brand',
                                  )}
                                  title={service.nombre}
                                >
                                  <span className="truncate">{service.nombre}</span>
                                  {service.destacado && (
                                    <span title="Servicio destacado" className="inline-flex shrink-0 text-amber-500">
                                      <Icon name="starFilled" size={13} />
                                    </span>
                                  )}
                                </h3>
                              </div>

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

                            {/* Descripción */}
                            {service.descripcion && (
                              <p
                                className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted sm:line-clamp-3"
                                title={service.descripcion}
                              >
                                {service.descripcion}
                              </p>
                            )}
                          </div>

                          {/* Footer: Tiempo + Precio */}
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
            </div>
          </>
        )}

      </motion.section>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </BookingLayout>
  )
}