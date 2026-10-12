import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ActionsCell, AnimatedSelect, Badge, Button, Card, Checkbox, ConfirmDialog,
  Field, Icon, Input, PageHead, Pagination, RolesTableSkeleton, RowActions, SearchInput,
  Table, TableFoot, TableState, Toast, Toolbar, Tooltip,
  type Column, type IconName, type ToastAviso,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { scrollToTopOrElement } from '@/shared/lib/scroll'
import { ApiError } from '@/shared/api/apiClient'
import { cn } from '@/shared/lib/cn'
import {
  rolesApi, modulosApi,
  type RolResponse, type ModuloResponse, type RolResumenEstados,
} from '../api/rolesApi'

const COLUMNS: Column[] = [
  { key: 'nombre', label: 'Rol', sortable: true },
  { key: 'descripcion', label: 'Descripción', sortable: true },
  { label: 'Módulos', align: 'center' },
  { key: 'sistema', label: 'Tipo', align: 'center' },
  { key: 'activo', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

const POR_PAGINA = 10

const MODULOS_CLINICOS_CODIGOS = new Set([
  'CITAS',
  'PACIENTES',
  'HORARIOS',
  'MIS_CITAS',
  'ESPECIALIDADES',
  'SERVICIOS',
])

function iconSafe(name: string | null | undefined): IconName {
  const ICON_KEYS: Set<string> = new Set([
    'usuarios', 'citas', 'pacientes', 'logout', 'calendar', 'calendarEdit',
    'bell', 'plus', 'printer', 'chevronDown', 'chevronUp', 'chevronLeft',
    'chevronRight', 'arrowLeft', 'edit', 'trash', 'search', 'kebab', 'eye',
    'file', 'xCircle', 'x', 'checkCircle', 'alertCircle', 'info', 'warning',
    'spinner', 'refreshCw', 'check', 'user', 'lock', 'eyeOff', 'mail',
    'phone', 'messageSquare', 'whatsapp', 'clock', 'question', 'tooth',
    'toothCracked', 'braces', 'forceps', 'menu', 'layers', 'shield',
    'location', 'building', 'sliders',
  ])
  if (name && ICON_KEYS.has(name)) {
    return name as IconName
  }
  return 'layers'
}

export function RolesPage() {
  const { accessToken, recargarPerfil } = useAuth()
  const [roles, setRoles] = useState<RolResponse[]>([])
  const [modulos, setModulos] = useState<ModuloResponse[]>([])
  const [selectedModulos, setSelectedModulos] = useState<number[]>([])

  const [query, setQuery] = useState('')
  const [queryDebounced, setQueryDebounced] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [tipo, setTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS')

  const [pagina, setPagina] = useState(1)
  const [totalElementos, setTotalElementos] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [esBackendPaginado, setEsBackendPaginado] = useState(true)

  const [sortColumn, setSortColumn] = useState<string>('nombre')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [conteos, setConteos] = useState<RolResumenEstados>({
    todos: 0,
    activos: 0,
    inactivos: 0,
    sistema: 0,
    personalizados: 0,
  })

  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)
  const [editando, setEditando] = useState<RolResponse | null>(null)
  const [confirmar, setConfirmar] = useState<RolResponse | null>(null)
  const [procesandoEstado, setProcesandoEstado] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [actualizacion, setActualizacion] = useState(0)

  // DEBOUNCE BÚSQUEDA
  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryDebounced(query.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // CARGAR CATÁLOGO DE MÓDULOS
  useEffect(() => {
    if (!accessToken) return
    modulosApi
      .listar(accessToken)
      .then(setModulos)
      .catch(() => {})
  }, [accessToken])

  // CARGAR CONTEOS AGRUPADOS DESDE EL BACKEND
  useEffect(() => {
    if (!accessToken) return

    let activo = true
    rolesApi
      .resumenEstados(accessToken, queryDebounced || undefined)
      .then(res => {
        if (activo) setConteos(res)
      })
      .catch(() => {
        // Fallback resiliente
      })

    return () => {
      activo = false
    }
  }, [accessToken, queryDebounced, actualizacion])

  // CARGAR LISTA PAGINADA DE ROLES
  useEffect(() => {
    if (!accessToken) {
      setLoading(false)
      setError('No se encontró una sesión activa.')
      return
    }

    let activo = true
    setBuscando(true)
    setError('')

    const activoParam =
      filtroEstado === 'ACTIVO' ? true : filtroEstado === 'INACTIVO' ? false : undefined

    rolesApi
      .listarPaginado(accessToken, {
        page: pagina - 1,
        size: POR_PAGINA,
        buscar: queryDebounced || undefined,
        tipo: tipo || undefined,
        activo: activoParam,
        sortBy: sortColumn,
        direction: sortDirection,
      })
      .then(data => {
        if (!activo) return
        if ('contenido' in data) {
          setRoles(data.contenido)
          setTotalElementos(data.totalElementos)
          setTotalPaginas(Math.max(1, data.totalPaginas))
          setEsBackendPaginado(true)
        } else {
          setRoles(data)
          setTotalElementos(data.length)
          setTotalPaginas(Math.max(1, Math.ceil(data.length / POR_PAGINA)))
          setEsBackendPaginado(false)
        }
      })
      .catch(e => {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los roles.')
        }
      })
      .finally(() => {
        if (activo) {
          setBuscando(false)
          setLoading(false)
        }
      })

    return () => {
      activo = false
    }
  }, [
    accessToken,
    pagina,
    queryDebounced,
    tipo,
    filtroEstado,
    sortColumn,
    sortDirection,
    actualizacion,
  ])

  // ORDENAMIENTO DE COLUMNAS
  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(colKey)
      setSortDirection('asc')
    }
    setPagina(1)
  }

  // ACCIONES MODAL CREAR / EDITAR
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
    setSelectedModulos((rol.modulos ?? []).map(m => m.id))
    setError('')
    setMostrarForm(true)
    scrollToTopOrElement()
  }

  const toggleModulo = (id: number) => {
    setSelectedModulos(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  const seleccionarTodos = () => {
    setSelectedModulos(modulos.map(m => m.id ?? m.idModulo!))
  }

  const seleccionarClinicos = () => {
    const ids = modulos
      .filter(m => MODULOS_CLINICOS_CODIGOS.has(m.codigo.toUpperCase()))
      .map(m => m.id ?? m.idModulo!)
    setSelectedModulos(ids)
  }

  const limpiarModulos = () => {
    setSelectedModulos([])
  }

  // GUARDAR ROL
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
        texto: editando ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.',
      })
      setActualizacion(n => n + 1)
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo guardar el rol.',
      )
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  // ACTIVAR / DESACTIVAR ROL
  const cambiarEstado = async () => {
    if (!accessToken || !confirmar || procesandoEstado) return

    setProcesandoEstado(true)
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
        texto: activar ? 'Rol activado correctamente.' : 'Rol desactivado correctamente.',
      })

      setConfirmar(null)
      setActualizacion(n => n + 1)
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto: e instanceof Error ? e.message : 'No se pudo cambiar el estado del rol.',
      })
      setConfirmar(null)
    } finally {
      setProcesandoEstado(false)
    }
  }

  const totalElementosFinal = esBackendPaginado ? totalElementos : roles.length
  const totalPaginasFinal = esBackendPaginado ? totalPaginas : Math.max(1, Math.ceil(roles.length / POR_PAGINA))
  const inicioRango = (pagina - 1) * POR_PAGINA + 1
  const finRango = Math.min(pagina * POR_PAGINA, totalElementosFinal)

  return (
    <>
      <PageHead
        title="Roles y permisos"
        description="Administra el catálogo de roles del sistema y configura los módulos accesibles para cada perfil."
        actions={
          <Button icon="plus" onClick={abrirNuevo}>
            Nuevo rol
          </Button>
        }
      />

      <Toast aviso={aviso} onClose={() => setAviso(null)} />

      {/* MODAL CREAR / EDITAR ROL */}
      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon name={editando ? 'edit' : 'lock'} size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      {editando ? `Editar rol: ${editando.nombre}` : 'Nuevo rol de usuario'}
                    </h3>
                    <p className="text-xs text-muted">
                      Define los datos y selecciona los módulos que tendrá permitidos este perfil.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarForm(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-alt hover:text-ink"
                  aria-label="Cerrar formulario"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              <form onSubmit={guardar} className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                  <Field
                    label="Nombre del rol *"
                    hint={editando?.sistema ? 'El nombre de un rol reservado del sistema no puede modificarse.' : undefined}
                  >
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
                      placeholder="Ej. AUDITOR_CLINICO"
                    />
                  </Field>

                  <Field label="Descripción del rol">
                    <Input
                      icon="file"
                      value={descripcion}
                      onChange={e => setDescripcion(e.target.value)}
                      disabled={guardando}
                      placeholder="Describe la responsabilidad y alcance de este rol…"
                    />
                  </Field>
                </div>

                {/* SELECCIÓN DE MÓDULOS */}
                <div className="rounded-2xl border border-line bg-surface-muted/30 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                        Módulos con acceso ({selectedModulos.length} de {modulos.length} asignados)
                      </h4>
                      <p className="text-xs text-muted">
                        Los usuarios con este rol solo podrán ver e interactuar con los módulos seleccionados.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={seleccionarTodos}
                        disabled={guardando}
                        className="font-semibold text-brand hover:underline disabled:opacity-50"
                      >
                        Seleccionar todos
                      </button>
                      <span className="text-muted">·</span>
                      <button
                        type="button"
                        onClick={seleccionarClinicos}
                        disabled={guardando}
                        className="font-semibold text-brand hover:underline disabled:opacity-50"
                      >
                        Solo clínicos
                      </button>
                      <span className="text-muted">·</span>
                      <button
                        type="button"
                        onClick={limpiarModulos}
                        disabled={guardando}
                        className="font-semibold text-muted hover:underline disabled:opacity-50"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {modulos.map(m => {
                      const moduloId = m.id ?? m.idModulo!
                      const checked = selectedModulos.includes(moduloId)
                      const iconName = iconSafe(m.icono)

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
                            'group flex items-start gap-2.5 rounded-xl border p-2.5 text-xs transition cursor-pointer select-none',
                            checked
                              ? 'border-brand/40 bg-brand-soft/70 text-ink shadow-2xs ring-1 ring-brand/30'
                              : 'border-line/70 bg-surface text-ink-soft hover:bg-hover hover:text-ink',
                            guardando && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          <span className="pt-0.5 pointer-events-none">
                            <Checkbox
                              checked={checked}
                              disabled={guardando}
                              readOnly
                              tabIndex={-1}
                            />
                          </span>

                          <span className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-lg transition',
                            checked
                              ? 'bg-brand text-white shadow-xs'
                              : 'bg-alt text-muted group-hover:text-ink',
                          )}>
                            <Icon name={iconName} size={15} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-ink truncate leading-tight">
                              {m.nombre}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted truncate">
                              {m.codigo}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-sm font-medium text-danger">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
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
                        ? 'Guardar cambios'
                        : 'Registrar rol'}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TARJETA PRINCIPAL DE ROLES */}
      <Card>
        {/* FILTRO DE ESTADOS (PILLS SUPERIORES) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5">
          <span className="mr-1 text-xs font-semibold text-muted">Estado:</span>
          {(
            [
              ['TODOS', `Todos (${conteos.todos})`],
              ['ACTIVO', `Activos (${conteos.activos})`],
              ['INACTIVO', `Inactivos (${conteos.inactivos})`],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setFiltroEstado(val)
                setPagina(1)
              }}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer',
                filtroEstado === val
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-alt text-muted hover:bg-alt/80 hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* TOOLBAR CON BÚSQUEDA Y TIPO */}
        <Toolbar>
          <SearchInput
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            placeholder="Buscar por nombre de rol o descripción…"
            loading={buscando}
            className="w-full sm:min-w-64 sm:flex-1"
          />

          <AnimatedSelect
            label="Tipo de rol"
            value={tipo}
            onChange={val => {
              setTipo(val)
              setPagina(1)
            }}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'SISTEMA', label: `Sistema (${conteos.sistema})` },
              { value: 'PERSONALIZADO', label: `Personalizado (${conteos.personalizados})` },
            ]}
            className="w-full sm:w-52"
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
                empty={!error && roles.length === 0}
                emptyLabel="No se encontraron roles registrados."
              />

              {roles.map(rol => (
                <tr key={rol.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Icon name={rol.sistema ? 'shield' : 'lock'} size={14} />
                      </span>
                      <span className="font-bold text-ink">
                        {rol.nombre}
                      </span>
                    </div>
                  </td>

                  <td className="max-w-md whitespace-normal text-ink-soft">
                    {rol.descripcion || <span className="text-muted italic">Sin descripción</span>}
                  </td>

                  <td className="text-center">
                    <div className="flex justify-center">
                      {(() => {
                        const count = rol.modulos?.length ?? 0
                        if (count === 0) {
                          return <span className="text-xs text-muted">0 módulos</span>
                        }
                        const esTodos = modulos.length > 0 && count >= modulos.length

                        let tooltipTexto = ''
                        if (esTodos) {
                          tooltipTexto = 'Acceso total: todos los módulos del sistema habilitados'
                        } else if (count <= 3) {
                          tooltipTexto = `Módulos: ${rol.modulos!.map(m => m.nombre).join(', ')}`
                        } else {
                          const primeros = rol.modulos!.slice(0, 3).map(m => m.nombre).join(', ')
                          tooltipTexto = `Módulos: ${primeros} (+${count - 3} más)`
                        }

                        return (
                          <Tooltip content={tooltipTexto}>
                            <span
                              className="inline-flex cursor-help items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand transition hover:bg-brand-soft/80"
                            >
                              <span className="size-1.5 rounded-full bg-brand" />
                              {esTodos ? `Todos (${count})` : `${count} ${count === 1 ? 'módulo' : 'módulos'}`}
                            </span>
                          </Tooltip>
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

        {totalElementosFinal > 0 && (
          <TableFoot
            summary={`Mostrando ${inicioRango}–${finRango} de ${totalElementosFinal} roles`}
          >
            {totalPaginasFinal > 1 && (
              <Pagination
                page={pagina}
                totalPages={totalPaginasFinal}
                onChange={setPagina}
              />
            )}
          </TableFoot>
        )}
      </Card>

      {/* DIÁLOGO CONFIRMAR CAMBIO DE ESTADO */}
      <ConfirmDialog
        open={confirmar !== null}
        title={confirmar?.activo ? '¿Desactivar rol?' : '¿Activar rol?'}
        description={
          confirmar
            ? `Se cambiará el estado del rol "${confirmar.nombre}". ${
                confirmar.activo
                  ? 'Los usuarios asignados a este rol podrían perder acceso a sus módulos.'
                  : 'El rol volverá a estar disponible para asignarse a usuarios.'
              }`
            : undefined
        }
        confirmLabel={
          procesandoEstado
            ? 'Procesando…'
            : confirmar?.activo
              ? 'Desactivar rol'
              : 'Activar rol'
        }
        cancelLabel="Cancelar"
        onConfirm={() => void cambiarEstado()}
        onCancel={() => {
          if (!procesandoEstado) setConfirmar(null)
        }}
      />
    </>
  )
}