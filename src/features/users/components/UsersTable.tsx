import { useEffect, useState } from 'react'
import {
  ActionsCell,
  Avatar,
  Badge,
  Icon,
  ProtectedImage,
  RowActions,
  Table,
  TableState,
  UsersTableSkeleton,
  type BadgeTone,
  type Column,
  type SortDirection,
} from '@/shared/components/ui'
import { documentTypesApi } from '@/shared/api/documentTypesApi'
import type { UsuarioInternoResponse } from '../api/usersApi'

const COLUMNS: Column[] = [
  { key: 'nombres', label: 'Colaborador', sortable: true },
  { key: 'email', label: 'Contacto', sortable: true },
  { key: 'roles', label: 'Roles', sortable: true },
  { key: 'estado', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

const ROL_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  ADMIN: { label: 'Administrador', tone: 'purple' },
  ODONTOLOGO: { label: 'Odontólogo', tone: 'blue' },
  RECEPCIONISTA: { label: 'Recepcionista', tone: 'teal' },
}

function estadoUsuario(usuario: UsuarioInternoResponse) {
  if (usuario.estado === 'PENDIENTE') {
    return { texto: 'Pendiente', tono: 'amber' as const }
  }
  if (usuario.estado === 'BLOQUEADO') {
    return { texto: 'Bloqueado', tono: 'red' as const }
  }
  if (usuario.estado === 'ACTIVO' && usuario.personalActivo) {
    return { texto: 'Activo', tono: 'green' as const }
  }
  return { texto: 'Inactivo', tono: 'gray' as const }
}

interface UsersTableProps {
  users: UsuarioInternoResponse[]
  loading?: boolean
  accessToken?: string | null
  usuarioActualId?: number | null
  sortColumn?: string | null
  sortDirection?: SortDirection
  onSort?: (columnKey: string) => void
  onDetail: (usuario: UsuarioInternoResponse) => void
  onEdit: (usuario: UsuarioInternoResponse) => void
  onToggle: (usuario: UsuarioInternoResponse) => void
}

export function UsersTable({
  users,
  loading = false,
  accessToken,
  usuarioActualId,
  sortColumn,
  sortDirection,
  onSort,
  onDetail,
  onEdit,
  onToggle,
}: UsersTableProps) {
  const [tiposDoc, setTiposDoc] = useState<Record<number, string>>({})

  useEffect(() => {
    documentTypesApi
      .listar()
      .then(lista => {
        const mapa: Record<number, string> = {}
        for (const t of lista) {
          mapa[t.id] = t.codigo
        }
        setTiposDoc(mapa)
      })
      .catch(() => {})
  }, [])

  return (
    <Table
      columns={COLUMNS}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={onSort}
    >
      {loading ? (
        <UsersTableSkeleton rows={5} />
      ) : (
        <>
          <TableState
            colSpan={COLUMNS.length}
            empty={users.length === 0}
            emptyLabel="No hay usuarios que coincidan con los filtros."
          />

          {users.map(usuario => {
            const nombreCompleto = [
              usuario.nombres,
              usuario.apellidoPaterno,
              usuario.apellidoMaterno,
            ]
              .filter(Boolean)
              .join(' ')

            const esOdontologo =
              usuario.roles.includes('ODONTOLOGO') || Boolean(usuario.odontologoId)
            const prefijo = esOdontologo ? 'Dr(a). ' : ''

            const estado = estadoUsuario(usuario)
            const activo = usuario.estado === 'ACTIVO' && usuario.personalActivo
            const esCuentaPropia = usuario.usuarioId === usuarioActualId
            const puedeCambiarEstado =
              usuario.estado === 'INACTIVO' || usuario.estado === 'ACTIVO'
            const tipoDocTexto =
              usuario.tipoDocumentoCodigo ||
              tiposDoc[usuario.tipoDocumentoId] ||
              'DOC'

            return (
              <tr key={usuario.usuarioId}>
                {/* COLABORADOR (FOTO/AVATAR + NOMBRE + COP) */}
                <td>
                  <div className="flex items-center gap-3">
                    {usuario.odontologoId && usuario.fotoNombreArchivo ? (
                      <div className="size-10 shrink-0 overflow-hidden rounded-full border border-line bg-alt shadow-2xs">
                        <ProtectedImage
                          path={`/api/odontologos/${usuario.odontologoId}/foto`}
                          accessToken={accessToken}
                          alt={`${prefijo}${nombreCompleto}`}
                          className="size-full object-cover"
                          fallback={
                            <Avatar
                              nombre={usuario.nombres}
                              apellido={usuario.apellidoPaterno}
                              seed={usuario.usuarioId}
                              size={40}
                              animate="hover"
                              trackCursor={false}
                            />
                          }
                        />
                      </div>
                    ) : (
                      <Avatar
                        nombre={usuario.nombres}
                        apellido={usuario.apellidoPaterno}
                        seed={usuario.usuarioId}
                        size={36}
                        animate="hover"
                        trackCursor={false}
                      />
                    )}

                    <div className="min-w-0">
                      <p className="font-bold text-ink">
                        {prefijo}{nombreCompleto}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-semibold text-ink-soft">{tipoDocTexto}</span>{' '}
                        <span className="text-muted">·</span>{' '}
                        <span className="tabular-nums font-medium text-ink">
                          {usuario.numeroDocumento}
                        </span>
                      </p>
                    </div>
                  </div>
                </td>

                {/* CONTACTO (CORREO Y TELÉFONO) */}
                <td>
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1.5 text-ink-soft">
                      <Icon name="mail" size={13} className="shrink-0 text-muted" />
                      <span className="max-w-56 truncate" title={usuario.correo}>
                        {usuario.correo}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted">
                      <Icon name="phone" size={13} className="shrink-0 text-muted" />
                      <span className="tabular-nums">
                        {usuario.telefono || <span className="italic text-muted">Sin teléfono</span>}
                      </span>
                    </div>
                  </div>
                </td>

                {/* ROLES */}
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {usuario.roles.map(rol => {
                      const config = ROL_CONFIG[rol] ?? {
                        label: rol,
                        tone: 'gray' as const,
                      }
                      return (
                        <Badge key={rol} tone={config.tone}>
                          {config.label}
                        </Badge>
                      )
                    })}
                  </div>
                </td>

                {/* ESTADO */}
                <td className="text-center">
                  <div className="flex justify-center">
                    <Badge tone={estado.tono}>{estado.texto}</Badge>
                  </div>
                </td>

                {/* ACCIONES */}
                <ActionsCell align="center">
                  <RowActions
                    actions={[
                      {
                        label: 'Ver detalle',
                        icon: 'eye',
                        onClick: () => onDetail(usuario),
                      },
                      {
                        label: 'Editar',
                        icon: 'edit',
                        onClick: () => onEdit(usuario),
                      },
                      {
                        label: activo ? 'Desactivar usuario' : 'Activar usuario',
                        icon: activo ? 'xCircle' : 'checkCircle',
                        onClick: () => onToggle(usuario),
                        variant: activo ? 'danger' : 'success',
                        show: puedeCambiarEstado && !(activo && esCuentaPropia),
                      },
                    ]}
                  />
                </ActionsCell>
              </tr>
            )
          })}
        </>
      )}
    </Table>
  )
}