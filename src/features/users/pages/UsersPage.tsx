import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AnimatedSelect,
  Button,
  Card,
  ConfirmDialog,
  PageHead,
  Pagination,
  SearchInput,
  TableFoot,
  Toast,
  Toolbar,
} from '@/shared/components/ui'
import { usersApi, type PaginaResponse, type UsuarioInternoResponse } from '../api/usersApi'
import { rolesApi, type RolResponse } from '@/features/roles/api/rolesApi'
import { ApiError } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth'
import { UsersTable } from '../components/UsersTable'

const PAGE_SIZE = 10

type Aviso = {
  tipo: 'success' | 'error' | 'warning'
  texto: string
}

export function UsersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, user } = useAuth()

  const [query, setQuery] = useState('')
  const [rol, setRol] = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)

  const [rolesDisponibles, setRolesDisponibles] = useState<RolResponse[]>([])
  const [resultado, setResultado] = useState<PaginaResponse<UsuarioInternoResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<UsuarioInternoResponse | null>(null)
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
    if (!accessToken) return

    rolesApi
      .listar(accessToken, true)
      .then(data => setRolesDisponibles(data.filter(r => r.nombre !== 'PACIENTE')))
      .catch(() => setRolesDisponibles([]))
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setResultado(null)
      setError('No se encontró una sesión activa.')
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    usersApi
      .listar(accessToken, {
        buscar: query,
        rol: rol || undefined,
        estado: estado || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      })
      .then(data => {
        if (active) setResultado(data)
      })
      .catch(err => {
        if (!active) return
        setResultado(null)
        setError(
          err instanceof ApiError ? err.message : 'No se pudo cargar el listado de usuarios.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [accessToken, query, rol, estado, page, actualizacion])

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(
      () => setAviso(null),
      aviso.tipo === 'error' ? 7000 : 4500,
    )
    return () => window.clearTimeout(timer)
  }, [aviso])

  const rows = resultado?.contenido ?? []
  const totalPages = Math.max(1, resultado?.totalPaginas ?? 1)

  const applyFilter = (fn: () => void) => {
    fn()
    setPage(1)
  }

  const cambiarEstado = async () => {
    if (!accessToken || !confirmar || procesandoRef.current) return

    procesandoRef.current = true
    setProcesando(true)
    setAviso(null)

    const activar = confirmar.estado === 'INACTIVO'

    try {
      if (activar) {
        await usersApi.activar(accessToken, confirmar.usuarioId)
      } else {
        await usersApi.desactivar(accessToken, confirmar.usuarioId)
      }

      setConfirmar(null)
      setAviso({
        tipo: 'success',
        texto: activar
          ? 'Usuario activado correctamente.'
          : 'Usuario desactivado correctamente.',
      })
      setActualizacion(n => n + 1)
    } catch (err) {
      setConfirmar(null)
      setAviso({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo cambiar el estado del usuario.',
      })
    } finally {
      procesandoRef.current = false
      setProcesando(false)
    }
  }

  const usuarioActualId = user ? Number(user.id) : null
  const esActivacion = confirmar?.estado === 'INACTIVO'
  const nombreSeleccionado = confirmar
    ? [confirmar.nombres, confirmar.apellidoPaterno].filter(Boolean).join(' ')
    : ''

  return (
    <>
      <PageHead
        title="Personal"
        description="Gestiona las cuentas, roles y accesos del equipo de NeoDents."
        actions={
          <Button icon="plus" onClick={() => navigate('/usuarios/nuevo')}>
            Registrar trabajador
          </Button>
        }
      />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      <Card>
        <Toolbar>
          <SearchInput
            placeholder="Buscar por nombre, documento o correo…"
            value={query}
            onChange={e => applyFilter(() => setQuery(e.target.value))}
            loading={loading && !!query}
            className="w-full sm:min-w-48 sm:flex-1"
          />

          <AnimatedSelect
            label="Filtrar por rol"
            placeholder="Todos los roles"
            options={[
              { value: '', label: 'Todos los roles' },
              ...rolesDisponibles.map(r => ({ value: r.nombre, label: r.nombre })),
            ]}
            value={rol}
            onChange={value => applyFilter(() => setRol(value))}
            className="w-full sm:w-56"
          />

          <AnimatedSelect
            label="Filtrar por estado"
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'ACTIVO', label: 'Activos' },
              { value: 'PENDIENTE', label: 'Pendientes' },
              { value: 'INACTIVO', label: 'Inactivos' },
              { value: 'BLOQUEADO', label: 'Bloqueados' },
            ]}
            value={estado}
            onChange={value => applyFilter(() => setEstado(value))}
            className="w-full sm:w-48"
          />
        </Toolbar>

        {error ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="ghost" className="mt-4" onClick={() => setActualizacion(n => n + 1)}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            <UsersTable
              users={rows}
              loading={loading}
              accessToken={accessToken}
              usuarioActualId={usuarioActualId}
              onDetail={u => navigate(`/usuarios/${u.usuarioId}`)}
              onEdit={u => navigate(`/usuarios/${u.usuarioId}/editar`)}
              onToggle={u => {
                if (!procesando) setConfirmar(u)
              }}
            />

            <TableFoot
              summary={
                loading
                  ? 'Cargando usuarios…'
                  : `${rows.length} de ${resultado?.totalElementos ?? 0} usuarios`
              }
            >
              {!loading && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                />
              )}
            </TableFoot>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirmar !== null}
        title={esActivacion ? '¿Activar usuario?' : '¿Desactivar usuario?'}
        description={
          confirmar
            ? esActivacion
              ? `¿Deseas reactivar la cuenta de ${nombreSeleccionado}? Podrá volver a iniciar sesión.`
              : `¿Deseas desactivar la cuenta de ${nombreSeleccionado}? Perderá el acceso al sistema y se revocarán sus sesiones activas.`
            : ''
        }
        confirmLabel={procesando ? 'Procesando…' : esActivacion ? 'Activar' : 'Desactivar'}
        cancelLabel="Cancelar"
        onConfirm={() => void cambiarEstado()}
        onCancel={() => {
          if (!procesandoRef.current) setConfirmar(null)
        }}
      />
    </>
  )
}