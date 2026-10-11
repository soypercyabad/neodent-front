import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ActionsCell, AnimatedSelect, Avatar, Badge, Button, Card, ConfirmDialog,
  Icon, PageHead, Pagination, PatientsTableSkeleton, RowActions, SearchInput, Table, TableFoot,
  TableState, Toast, Tooltip, type Column,
} from '@/shared/components/ui'
import { ApiError } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth'
import { sedesApi, type SedeCatalogo } from '@/features/sedes/api/sedesApi'
import { formatPhone } from '@/shared/lib/format'
import { patientsApi, type PacienteResumenResponse, type PaginaResponse } from '../api/patientsApi'

const PAGE_SIZE = 10

const COLUMNS: Column[] = [
  { key: 'nombres', label: 'Paciente', sortable: true },
  { key: 'email', label: 'Contacto', sortable: true },
  { key: 'origenRegistro', label: 'Origen', align: 'center', sortable: true },
  { label: 'Sede' },
  { key: 'tieneCuenta', label: 'Cuenta', align: 'center', sortable: true },
  { key: 'activo', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

type Aviso = {
  tipo: 'success' | 'error' | 'warning'
  texto: string
}

type Accion = {
  tipo: 'activar' | 'desactivar' | 'invitar'
  paciente: PacienteResumenResponse
}

const nombreCompleto = (p: PacienteResumenResponse) =>
  [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ')

export function PatientsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, user } = useAuth()

  const puedeGestionar =
    user?.rol === 'Administrador' ||
    user?.rol === 'Recepcionista'

  const [query, setQuery] = useState('')
  const [estado, setEstado] = useState('')
  const [cuenta, setCuenta] = useState('')
  const [origen, setOrigen] = useState('')
  const [filtroSede, setFiltroSede] = useState('')
  const [sedes, setSedes] = useState<SedeCatalogo[]>([])
  const [page, setPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [resultado, setResultado] = useState<PaginaResponse<PacienteResumenResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accion, setAccion] = useState<Accion | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)
  const procesandoRef = useRef(false)

  // Cargar sedes para el filtro
  useEffect(() => {
    if (!accessToken) return
    sedesApi.catalogo(accessToken).then(setSedes).catch(() => setSedes([]))
  }, [accessToken])

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
    setPage(1)
  }

  useEffect(() => {
    const state = location.state as { aviso?: Aviso } | null
    if (!state?.aviso) return

    setAviso(state.aviso)
    window.history.replaceState({}, document.title)
  }, [location.state])

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(
      () => setAviso(null),
      aviso.tipo === 'error' ? 7000 : 4500,
    )
    return () => window.clearTimeout(timer)
  }, [aviso])

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setResultado(null)
      setError('No se encontró una sesión activa.')
      return
    }

    let activo = true
    setLoading(true)
    setError('')

    patientsApi.listar(accessToken, {
      buscar: query,
      activo:
        estado === 'ACTIVO'
          ? true
          : estado === 'INACTIVO'
            ? false
            : undefined,
      conCuenta:
        cuenta === 'CON_CUENTA'
          ? true
          : cuenta === 'SIN_CUENTA'
            ? false
            : undefined,
      origen: origen || undefined,
      sedeId: filtroSede || undefined,
      sortBy: sortColumn,
      direction: sortDirection,
      page: page - 1,
      size: PAGE_SIZE,
    })
      .then(data => {
        if (activo) setResultado(data)
      })
      .catch(e => {
        if (!activo) return
        setResultado(null)
        setError(
          e instanceof ApiError
            ? e.message
            : 'No se pudo cargar el listado de pacientes.',
        )
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, query, estado, cuenta, origen, filtroSede, page, sortColumn, sortDirection, actualizacion])

  const applyFilter = (fn: () => void) => {
    fn()
    setPage(1)
  }

  const rows = resultado?.contenido ?? []
  const totalPages = Math.max(1, resultado?.totalPaginas ?? 1)
  const totalElementos = resultado?.totalElementos ?? 0
  const inicio = (page - 1) * PAGE_SIZE

  const ejecutarAccion = async () => {
    if (!accessToken || !accion || procesandoRef.current) return

    procesandoRef.current = true
    setProcesando(true)
    setAviso(null)

    try {
      if (accion.tipo === 'activar')
        await patientsApi.activar(accessToken, accion.paciente.id)

      if (accion.tipo === 'desactivar')
        await patientsApi.desactivar(accessToken, accion.paciente.id)

      if (accion.tipo === 'invitar')
        await patientsApi.reenviarInvitacion(accessToken, accion.paciente.id)

      setAviso({
        tipo: 'success',
        texto:
          accion.tipo === 'activar'
            ? 'Paciente activado correctamente.'
            : accion.tipo === 'desactivar'
              ? 'Paciente desactivado correctamente.'
              : 'Invitación reenviada correctamente.',
      })

      setAccion(null)
      setActualizacion(n => n + 1)
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo completar la acción.',
      })
      setAccion(null)
    } finally {
      procesandoRef.current = false
      setProcesando(false)
    }
  }

  const tituloAccion =
    accion?.tipo === 'activar'
      ? '¿Activar paciente?'
      : accion?.tipo === 'desactivar'
        ? '¿Desactivar paciente?'
        : '¿Reenviar invitación?'

  const descripcionAccion = accion
    ? accion.tipo === 'activar'
      ? `${nombreCompleto(accion.paciente)} volverá a estar activo.`
      : accion.tipo === 'desactivar'
        ? `${nombreCompleto(accion.paciente)} quedará inactivo. Sus citas e historia clínica no serán eliminadas.`
        : `Se enviará una nueva invitación al correo de ${nombreCompleto(accion.paciente)}.`
    : ''

  return (
    <>
      <PageHead
        title="Pacientes"
        description="Consulta y administra los pacientes registrados en NeoDents."
        actions={
          <div className="flex items-center gap-2">
            {puedeGestionar && (
              <Button icon="plus" onClick={() => navigate('/pacientes/nuevo')}>
                Registrar paciente
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setActualizacion(n => n + 1)}
              disabled={loading}
              aria-label="Actualizar listado de pacientes"
              tooltip="Actualizar listado de pacientes"
              className="px-3"
            >
              <Icon name="refreshCw" size={17} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        }
      />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      <Card className="w-full min-w-0 max-w-full overflow-visible">
        {/* FILTROS RESPONSIVOS */}
        <div className="flex flex-col gap-3 border-b border-line p-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="w-full min-w-0 2xl:max-w-md 2xl:flex-1">
            <SearchInput
              placeholder="Buscar por nombre, documento, correo o teléfono…"
              aria-label="Buscar pacientes"
              value={query}
              onChange={e => applyFilter(() => setQuery(e.target.value))}
              onClear={() => applyFilter(() => setQuery(''))}
              loading={loading && !!query}
              className="w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <AnimatedSelect
              label="Origen"
              value={origen}
              onChange={value => applyFilter(() => setOrigen(value))}
              options={[
                { value: '', label: 'Todos los orígenes' },
                { value: 'AUTORREGISTRO', label: 'Autoregistro (Web)' },
                { value: 'RECEPCION', label: 'Recepción' },
              ]}
              className="w-full sm:w-auto sm:min-w-[10.5rem] flex-1 sm:flex-initial"
            />

            <AnimatedSelect
              label="Sede"
              value={filtroSede}
              onChange={value => applyFilter(() => setFiltroSede(value))}
              options={[
                { value: '', label: 'Todas las sedes' },
                ...sedes.map(s => ({
                  value: String(s.id),
                  label: s.distrito ? `${s.nombre} (${s.distrito})` : s.nombre,
                })),
              ]}
              className="w-full sm:w-auto sm:min-w-[10.5rem] flex-1 sm:flex-initial"
            />

            <AnimatedSelect
              label="Estado"
              value={estado}
              onChange={value => applyFilter(() => setEstado(value))}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'ACTIVO', label: 'Activos' },
                { value: 'INACTIVO', label: 'Inactivos' },
              ]}
              className="w-full sm:w-auto sm:min-w-[10rem] flex-1 sm:flex-initial"
            />

            <AnimatedSelect
              label="Cuenta"
              value={cuenta}
              onChange={value => applyFilter(() => setCuenta(value))}
              options={[
                { value: '', label: 'Todas las cuentas' },
                { value: 'CON_CUENTA', label: 'Con cuenta' },
                { value: 'SIN_CUENTA', label: 'Sin cuenta' },
              ]}
              className="w-full sm:w-auto sm:min-w-[10rem] flex-1 sm:flex-initial"
            />
          </div>
        </div>

        <Table
          columns={COLUMNS}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        >
          {loading ? (
            <PatientsTableSkeleton rows={PAGE_SIZE} />
          ) : (
            <>
              <TableState
                colSpan={COLUMNS.length}
                error={error || null}
                empty={rows.length === 0}
                emptyLabel="No hay pacientes que coincidan con los filtros seleccionados."
              />

              {!error && rows.map((p: PacienteResumenResponse) => (
                <tr key={p.id} className="transition-colors hover:bg-alt/60">
                  {/* PACIENTE */}
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar
                        nombre={p.nombres}
                        apellido={p.apellidoPaterno}
                        seed={p.id}
                        size={36}
                        animate="hover"
                        trackCursor={false}
                      />

                      <div className="min-w-0">
                        <p className="font-bold text-ink">{nombreCompleto(p)}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          <span className="font-semibold text-ink-soft">{p.tipoDocumento}</span>{' '}
                          <span className="text-muted">·</span>{' '}
                          <span className="tabular-nums font-medium text-ink">{p.numeroDocumento}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* CONTACTO */}
                  <td>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5 text-ink-soft">
                        <Icon name="mail" size={13} className="shrink-0 text-muted" />
                        <span className="max-w-52 truncate" title={p.email || undefined}>
                          {p.email || <span className="italic text-muted">Sin correo</span>}
                        </span>
                      </div>

                      {p.telefono ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Tooltip content={`Llamar al ${formatPhone(p.telefono)}`} offset={8}>
                            <a
                              href={`tel:${p.telefono}`}
                              className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted transition-colors hover:bg-alt hover:text-ink"
                              onClick={e => e.stopPropagation()}
                            >
                              <Icon name="phone" size={12} className="shrink-0 text-muted" />
                              <span className="tabular-nums font-medium text-ink">{formatPhone(p.telefono)}</span>
                            </a>
                          </Tooltip>

                          <Tooltip content="Enviar WhatsApp" offset={8}>
                            <a
                              href={`https://wa.me/${p.telefono.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-500/15 hover:text-emerald-700 dark:text-emerald-400"
                              onClick={e => e.stopPropagation()}
                              aria-label="Enviar WhatsApp"
                            >
                              <Icon name="whatsapp" size={16} />
                            </a>
                          </Tooltip>
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-muted">Sin teléfono</span>
                      )}
                    </div>
                  </td>

                  {/* ORIGEN DE REGISTRO */}
                  <td className="text-center">
                    <div className="flex justify-center">
                      {p.origenRegistro === 'AUTORREGISTRO' ? (
                        <Badge tone="blue" className="inline-flex items-center gap-1">
                          <Icon name="globe" size={12} />
                          <span>Autoregistro</span>
                        </Badge>
                      ) : (
                        <Badge tone="gray" className="inline-flex items-center gap-1">
                          <Icon name="building" size={12} />
                          <span>Recepción</span>
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* SEDE DE REGISTRO */}
                  <td>
                    {p.sedeRegistroNombre ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
                        <Icon name="mapPin" size={13} className="shrink-0 text-muted" />
                        <span>{p.sedeRegistroNombre}</span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-muted/60">No asignada</span>
                    )}
                  </td>

                  {/* CUENTA */}
                  <td className="text-center">
                    <div className="flex justify-center">
                      {!p.tieneCuenta ? (
                        <Badge tone="gray">Sin cuenta</Badge>
                      ) : p.estadoCuenta === 'ACTIVO' ? (
                        <Badge tone="blue">Activa</Badge>
                      ) : p.estadoCuenta === 'PENDIENTE' ? (
                        <Badge tone="amber">Pendiente</Badge>
                      ) : p.estadoCuenta === 'BLOQUEADO' ? (
                        <Badge tone="red">Bloqueada</Badge>
                      ) : (
                        <Badge tone="gray">Inactiva</Badge>
                      )}
                    </div>
                  </td>

                  {/* ESTADO */}
                  <td className="text-center">
                    <div className="flex justify-center">
                      <Badge tone={p.activo ? 'green' : 'gray'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </td>

                  {/* ACCIONES */}
                  <ActionsCell align="center">
                    <RowActions
                      actions={[
                        {
                          label: 'Ver detalle',
                          icon: 'eye',
                          onClick: () => navigate(`/pacientes/${p.id}`),
                        },
                        {
                          label: 'Editar',
                          icon: 'edit',
                          onClick: () => navigate(`/pacientes/${p.id}/editar`),
                          show: puedeGestionar && p.activo,
                        },
                        {
                          label: 'Reenviar invitación',
                          icon: 'mail',
                          onClick: () => setAccion({ tipo: 'invitar', paciente: p }),
                          show: puedeGestionar && p.activo && !p.tieneCuenta && !!p.email,
                          dividerBefore: true,
                        },
                        {
                          label: p.activo ? 'Desactivar paciente' : 'Activar paciente',
                          icon: p.activo ? 'xCircle' : 'checkCircle',
                          onClick: () =>
                            setAccion({
                              tipo: p.activo ? 'desactivar' : 'activar',
                              paciente: p,
                            }),
                          show: puedeGestionar,
                          variant: p.activo ? 'danger' : 'success',
                          dividerBefore: true,
                        },
                      ]}
                    />
                  </ActionsCell>
                </tr>
              ))}
            </>
          )}
        </Table>

        <TableFoot
          summary={
            loading
              ? 'Cargando pacientes…'
              : totalElementos > 0
                ? `Mostrando ${inicio + 1}–${Math.min(inicio + PAGE_SIZE, totalElementos)} de ${totalElementos} pacientes`
                : '0 pacientes'
          }
        >
          {!loading && !error && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          )}
        </TableFoot>
      </Card>

      <ConfirmDialog
        open={accion !== null}
        title={tituloAccion}
        description={descripcionAccion}
        confirmLabel={
          procesando
            ? 'Procesando…'
            : accion?.tipo === 'activar'
              ? 'Activar'
              : accion?.tipo === 'desactivar'
                ? 'Desactivar'
                : 'Reenviar'
        }
        cancelLabel="Cancelar"
        onConfirm={() => void ejecutarAccion()}
        onCancel={() => {
          if (!procesandoRef.current) setAccion(null)
        }}
      />
    </>
  )
}