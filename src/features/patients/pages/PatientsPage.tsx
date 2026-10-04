import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ActionsCell, AnimatedSelect, Avatar, Badge, Button, Card, ConfirmDialog,
  Icon, PageHead, Pagination, PatientsTableSkeleton, RowActions, SearchInput, Table, TableFoot,
  TableState, Toast, Toolbar, type Column,
} from '@/shared/components/ui'
import { ApiError } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth'
import { patientsApi, type PacienteResponse, type PaginaResponse } from '../api/patientsApi'

const PAGE_SIZE = 10

const COLUMNS: Column[] = [
  { label: 'Paciente' },
  { label: 'Documento' },
  { label: 'Contacto' },
  { label: 'Cuenta', align: 'center' },
  { label: 'Estado', align: 'center' },
  { label: 'Acciones', align: 'center' },
]

type Aviso = {
  tipo: 'success' | 'error' | 'warning'
  texto: string
}

type Accion = {
  tipo: 'activar' | 'desactivar' | 'invitar'
  paciente: PacienteResponse
}

const nombreCompleto = (p: PacienteResponse) =>
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
  const [page, setPage] = useState(1)
  const [resultado, setResultado] = useState<PaginaResponse<PacienteResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accion, setAccion] = useState<Accion | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [actualizacion, setActualizacion] = useState(0)
  const procesandoRef = useRef(false)

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
  }, [accessToken, query, estado, cuenta, page, actualizacion])

  const applyFilter = (fn: () => void) => {
    fn()
    setPage(1)
  }

  const rows = resultado?.contenido ?? []
  const totalPages = Math.max(1, resultado?.totalPaginas ?? 1)

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
          puedeGestionar ? (
            <Button icon="plus" onClick={() => navigate('/pacientes/nuevo')}>
              Registrar paciente
            </Button>
          ) : undefined
        }
      />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      <Card>
        <Toolbar>
          <SearchInput
            placeholder="Buscar por nombre, documento, correo o teléfono…"
            value={query}
            onChange={e => applyFilter(() => setQuery(e.target.value))}
            loading={loading && !!query}
            className="w-full sm:min-w-56 sm:flex-1"
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
            className="w-full sm:w-44"
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
            className="w-full sm:w-44"
          />
        </Toolbar>

        <Table columns={COLUMNS}>
          {loading ? (
            <PatientsTableSkeleton rows={PAGE_SIZE} />
          ) : (
            <>
              <TableState
                colSpan={COLUMNS.length}
                error={error || null}
                empty={rows.length === 0}
                emptyLabel="No hay pacientes que coincidan con los filtros."
              />

              {!error && rows.map(p => (
            <tr key={p.id}>
              <td>
                <div className="flex items-center gap-3">
                  <Avatar
                    nombre={p.nombres}
                    apellido={p.apellidoPaterno}
                    seed={p.id}
                    size={44}
                    animate="hover"
                    trackCursor={false}
                  />

                  <div className="min-w-0">
                    <p className="font-bold text-ink">{nombreCompleto(p)}</p>
                    <p className="mt-1 text-xs text-muted">Paciente #{p.id}</p>
                  </div>
                </div>
              </td>

              <td>
                <p className="text-sm">
                  <span className="font-semibold text-ink">{p.tipoDocumento}</span>{' '}
                  <span className="text-muted">·</span>{' '}
                  <span className="tabular-nums text-ink-soft">{p.numeroDocumento}</span>
                </p>
              </td>

              <td>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1.5 text-ink-soft">
                    <Icon name="mail" size={13} className="shrink-0 text-muted" />
                    <span className="max-w-52 truncate" title={p.email || undefined}>
                      {p.email || <span className="italic text-muted">Sin correo</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-muted">
                    <Icon name="phone" size={13} className="shrink-0 text-muted" />
                    <span className="tabular-nums">
                      {p.telefono || <span className="italic text-muted">Sin teléfono</span>}
                    </span>
                  </div>
                </div>
              </td>

              <td className="text-center">
                <div className="flex justify-center">
                  {!p.tieneCuenta ? (
                    <Badge tone="gray">Sin cuenta</Badge>
                  ) : p.estadoCuenta === 'ACTIVO' || p.correoVerificado === true ? (
                    <Badge tone="blue">Activa</Badge>
                  ) : p.estadoCuenta === 'PENDIENTE' || p.correoVerificado === false ? (
                    <Badge tone="amber">Pendiente</Badge>
                  ) : p.estadoCuenta === 'BLOQUEADO' ? (
                    <Badge tone="red">Bloqueada</Badge>
                  ) : (
                    <Badge tone="gray">Inactiva</Badge>
                  )}
                </div>
              </td>

              <td className="text-center">
                <div className="flex justify-center">
                  <Badge tone={p.activo ? 'green' : 'gray'}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </td>

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
              : `${rows.length} de ${resultado?.totalElementos ?? 0} pacientes`
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