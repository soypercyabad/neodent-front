import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ActionsCell, AnimatedSelect, Badge, Button, Card, Checkbox, ConfirmDialog,
  Field, Input, PageHead, Pagination, RolesTableSkeleton, RowActions, SearchInput,
  Table, TableFoot, TableState, Toast, Toolbar, useTableSort, type Column,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { scrollToTopOrElement } from '@/shared/lib/scroll'
import { ApiError } from '@/shared/api/apiClient'
import { cn } from '@/shared/lib/cn'
import { rolesApi, modulosApi, type RolResponse, type ModuloResponse } from '../api/rolesApi'

const COLUMNS: Column[] = [
  { key: 'nombre', label: 'Rol', sortable: true },
  { key: 'descripcion', label: 'Descripción', sortable: true },
  { label: 'Módulos', align: 'center' },
  { key: 'sistema', label: 'Tipo', align: 'center', sortable: true },
  { key: 'activo', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

const POR_PAGINA = 10

type Aviso = { tipo: 'success' | 'error'; texto: string }

export function RolesPage() {
  const { accessToken, recargarPerfil } = useAuth()
  const [roles, setRoles] = useState<RolResponse[]>([])
  const [modulos, setModulos] = useState<ModuloResponse[]>([])
  const [selectedModulos, setSelectedModulos] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState('')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [editando, setEditando] = useState<RolResponse | null>(null)
  const [confirmar, setConfirmar] = useState<RolResponse | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [actualizacion, setActualizacion] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    modulosApi.listar(accessToken).then(setModulos).catch(() => {})
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return

    let activo = true
    setLoading(true)
    setError('')

    rolesApi.listar(accessToken)
      .then(data => {
        if (activo) setRoles(data)
      })
      .catch(e => {
        if (activo) setError(
          e instanceof Error ? e.message : 'No se pudieron cargar los roles.',
        )
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, actualizacion])

  useEffect(() => {
    if (!aviso) return

    const timer = window.setTimeout(
      () => setAviso(null),
      aviso.tipo === 'error' ? 7000 : 4000,
    )

    return () => window.clearTimeout(timer)
  }, [aviso])

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()

    return roles.filter(r => {
      if (q && !`${r.nombre} ${r.descripcion ?? ''}`.toLowerCase().includes(q)) {
        return false
      }
      if (tipo === 'SISTEMA' && !r.sistema) return false
      if (tipo === 'PERSONALIZADO' && r.sistema) return false
      if (estado === 'ACTIVO' && !r.activo) return false
      if (estado === 'INACTIVO' && r.activo) return false
      return true
    })
  }, [roles, query, tipo, estado])

  const { sortColumn, sortDirection, handleSort, sortedItems } = useTableSort(filtrados, {
    initialColumn: 'nombre',
    initialDirection: 'asc',
  })

  const totalPaginas = Math.max(1, Math.ceil(sortedItems.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * POR_PAGINA
  const visibles = useMemo(() => sortedItems.slice(inicio, inicio + POR_PAGINA), [sortedItems, inicio])

  const abrirNuevo = () => {
    setEditando(null)
    setNombre('')
    setDescripcion('')
    setSelectedModulos([])
    setError('')
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const abrirEditar = (rol: RolResponse) => {
    setEditando(rol)
    setNombre(rol.nombre)
    setDescripcion(rol.descripcion ?? '')
    setSelectedModulos((rol.modulos ?? []).map(m => m.id ?? m.idModulo!))
    setError('')
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const toggleModulo = (id: number) => {
    setSelectedModulos(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()

    if (!accessToken || guardandoRef.current) return
    if (!nombre.trim()) {
      setError('Ingresa el nombre del rol.')
      return
    }

    guardandoRef.current = true
    setGuardando(true)
    setError('')

    try {
      const data = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        modulosIds: selectedModulos,
      }

      if (editando) {
        await rolesApi.actualizar(accessToken, editando.id, data)
      } else {
        await rolesApi.crear(accessToken, data)
      }

      await recargarPerfil()

      setMostrarForm(false)
      setAviso({
        tipo: 'success',
        texto: editando
          ? 'Rol actualizado correctamente.'
          : 'Rol creado correctamente.',
      })
      setActualizacion(n => n + 1)
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'No se pudo guardar el rol.',
      )
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  const cambiarEstado = async () => {
    if (!accessToken || !confirmar) return

    const activar = !confirmar.activo

    try {
      if (activar) {
        await rolesApi.activar(accessToken, confirmar.id)
      } else {
        await rolesApi.desactivar(accessToken, confirmar.id)
      }

      await recargarPerfil()

      setAviso({
        tipo: 'success',
        texto: activar
          ? 'Rol activado correctamente.'
          : 'Rol desactivado correctamente.',
      })

      setConfirmar(null)
      setActualizacion(n => n + 1)
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error
          ? e.message
          : 'No se pudo cambiar el estado del rol.',
      })

      setConfirmar(null)
    }
  }

  return (
    <>
      <PageHead
        title="Roles"
        description="Administra el catálogo de roles del sistema."
        actions={
          <Button icon="plus" onClick={abrirNuevo}>
            Nuevo rol
          </Button>
        }
      />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <Card className="p-5">
              <form
                onSubmit={guardar}
                className="flex flex-col gap-4"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                  <Field label="Nombre del rol *">
                    <Input
                      icon="lock"
                      value={nombre}
                      onChange={e =>
                        setNombre(
                          e.target.value
                            .toUpperCase()
                            .replace(/\s+/g, '_'),
                        )
                      }
                      disabled={guardando || Boolean(editando?.sistema)}
                      placeholder="Ej. CONTADOR"
                    />
                  </Field>

                  <Field label="Descripción">
                    <Input
                      icon="file"
                      value={descripcion}
                      onChange={e => setDescripcion(e.target.value)}
                      disabled={guardando}
                      placeholder="Describe el alcance del rol"
                    />
                  </Field>
                </div>

                <div className="rounded-xl border border-line bg-surface-muted/30 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                        Módulos con acceso ({selectedModulos.length} de {modulos.length} seleccionados)
                      </h4>
                      <p className="text-xs text-muted">
                        Marca los módulos a los que tendrán acceso los usuarios con este rol.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedModulos(modulos.map(m => m.id ?? m.idModulo!))}
                        disabled={guardando}
                        className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                      >
                        Seleccionar todos
                      </button>
                      <span className="text-xs text-muted">·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedModulos([])}
                        disabled={guardando}
                        className="text-xs font-semibold text-muted hover:underline disabled:opacity-50"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {modulos.map(m => {
                      const moduloId = m.id ?? m.idModulo!
                      const checked = selectedModulos.includes(moduloId)
                      return (
                        <div
                          key={moduloId}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (!guardando) toggleModulo(moduloId)
                          }}
                          onKeyDown={e => {
                            if ((e.key === ' ' || e.key === 'Enter') && !guardando) {
                              e.preventDefault()
                              toggleModulo(moduloId)
                            }
                          }}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg border p-2 text-xs font-medium transition cursor-pointer select-none',
                            checked
                              ? 'border-brand/40 bg-brand-soft text-brand font-semibold shadow-xs'
                              : 'border-line/70 bg-surface text-ink-soft hover:bg-hover hover:text-ink',
                            guardando && 'cursor-not-allowed opacity-60'
                          )}
                        >
                          <span className="pointer-events-none flex items-center">
                            <Checkbox
                              checked={checked}
                              disabled={guardando}
                              readOnly
                              tabIndex={-1}
                            />
                          </span>
                          <span className="truncate">{m.nombre}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    onClick={() => setMostrarForm(false)}
                    disabled={guardando}
                  >
                    Cancelar
                  </Button>

                  <Button type="submit" disabled={guardando}>
                    {guardando
                      ? 'Guardando…'
                      : editando
                        ? 'Actualizar'
                        : 'Crear'}
                  </Button>
                </div>
              </form>

              {editando?.sistema && (
                <p className="mt-2 text-xs text-muted">
                  El nombre de un rol del sistema no puede cambiarse.
                </p>
              )}

              {error && (
                <p className="mt-3 text-sm text-danger">
                  {error}
                </p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <Toolbar>
          <SearchInput
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setPagina(1)
            }}
            onClear={() => {
              setQuery('')
              setPagina(1)
            }}
            placeholder="Buscar por rol o descripción…"
            className="w-full sm:min-w-56 sm:flex-1"
          />

          <AnimatedSelect
            label="Tipo"
            value={tipo}
            onChange={val => {
              setTipo(val)
              setPagina(1)
            }}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'SISTEMA', label: 'Sistema' },
              { value: 'PERSONALIZADO', label: 'Personalizado' },
            ]}
            className="w-full sm:w-44"
          />

          <AnimatedSelect
            label="Estado"
            value={estado}
            onChange={val => {
              setEstado(val)
              setPagina(1)
            }}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'ACTIVO', label: 'Activos' },
              { value: 'INACTIVO', label: 'Inactivos' },
            ]}
            className="w-full sm:w-44"
          />
        </Toolbar>

        <Table
          columns={COLUMNS}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        >
          {loading ? (
            <RolesTableSkeleton rows={POR_PAGINA} />
          ) : (
            <>
              <TableState
                colSpan={COLUMNS.length}
                error={error && !mostrarForm ? error : null}
                empty={!error && filtrados.length === 0}
                emptyLabel="No hay roles registrados."
              />

              {visibles.map(rol => (
            <tr key={rol.id}>
              <td>
                <span className="font-bold text-ink">
                  {rol.nombre}
                </span>
              </td>

              <td className="max-w-md whitespace-normal text-ink-soft">
                {rol.descripcion || 'Sin descripción'}
              </td>

              <td className="text-center">
                <div className="flex justify-center">
                  {(() => {
                    const count = rol.modulos?.length ?? 0
                    if (count === 0) {
                      return <span className="text-xs text-muted">0 módulos</span>
                    }
                    const nombres = rol.modulos!.map(m => m.nombre).join(', ')
                    const esTodos = modulos.length > 0 && count >= modulos.length

                    return (
                      <span
                        title={`Módulos asignados:\n${nombres}`}
                        className="inline-flex cursor-help items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand transition hover:bg-brand-soft/80"
                      >
                        <span className="size-1.5 rounded-full bg-brand" />
                        {esTodos ? `Todos (${count})` : `${count} ${count === 1 ? 'módulo' : 'módulos'}`}
                      </span>
                    )
                  })()}
                </div>
              </td>

              <td className="text-center">
                <div className="flex justify-center">
                  <Badge tone={rol.sistema ? 'blue' : 'gray'}>
                    {rol.sistema ? 'Sistema' : 'Personalizado'}
                  </Badge>
                </div>
              </td>

              <td className="text-center">
                <div className="flex justify-center">
                  <Badge tone={rol.activo ? 'green' : 'gray'}>
                    {rol.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </td>

              <ActionsCell align="center">
                <RowActions
                  actions={[
                    {
                      label: 'Editar rol',
                      icon: 'edit',
                      onClick: () => abrirEditar(rol),
                    },
                    {
                      label: rol.activo ? 'Desactivar rol' : 'Activar rol',
                      icon: rol.activo ? 'xCircle' : 'checkCircle',
                      onClick: () => setConfirmar(rol),
                      show: !rol.sistema,
                      variant: rol.activo ? 'danger' : 'success',
                    },
                  ]}
                />
              </ActionsCell>
            </tr>
          ))}
            </>
          )}
        </Table>

        {filtrados.length > 0 && (
          <TableFoot summary={`Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAGINA, filtrados.length)} de ${filtrados.length} roles`}>
            <Pagination page={paginaActual} totalPages={totalPaginas} onChange={setPagina} />
          </TableFoot>
        )}
      </Card>

      <ConfirmDialog
        open={confirmar !== null}
        title={confirmar?.activo ? '¿Desactivar rol?' : '¿Activar rol?'}
        description={
          confirmar
            ? `Se cambiará el estado del rol ${confirmar.nombre}.`
            : ''
        }
        confirmLabel={confirmar?.activo ? 'Desactivar' : 'Activar'}
        onConfirm={() => void cambiarEstado()}
        onCancel={() => setConfirmar(null)}
      />
    </>
  )
}