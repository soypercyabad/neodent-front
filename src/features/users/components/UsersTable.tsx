import {
  ActionsCell,
  Avatar,
  Badge,
  Icon,
  ProtectedImage,
  RowActions,
  Table,
  TableState,
  Tooltip,
  UsersTableSkeleton,
  type Column,
  type SortDirection,
} from '@/shared/components/ui'
import { formatPhone } from '@/shared/lib/format'
import type { UsuarioInternoResponse } from '../api/usersApi'
import {
  esOdontologo,
  estadoUsuario,
  nombreCompleto,
  prefijoProfesional,
  rolBadgeInfo,
} from '../model/users.helpers'

const COLUMNS: Column[] = [
  { key: 'nombres', label: 'Colaborador', sortable: true },
  { key: 'email', label: 'Contacto', sortable: true },
  { key: 'roles', label: 'Rol', sortable: true },
  { key: 'especialidades', label: 'Especialidades' },
  { key: 'estado', label: 'Estado', align: 'center', sortable: true },
  { label: 'Acciones', align: 'center' },
]

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
            emptyLabel="No hay trabajadores que coincidan con los filtros."
          />

          {users.map(usuario => {
            const nombre = nombreCompleto(usuario)
            const odontologo = esOdontologo(usuario)
            const prefijo = prefijoProfesional(usuario)
            const estado = estadoUsuario(usuario)
            const activo = usuario.estado === 'ACTIVO' && usuario.personalActivo
            const esCuentaPropia = usuario.usuarioId === usuarioActualId
            const puedeCambiarEstado =
              usuario.estado === 'INACTIVO' || usuario.estado === 'ACTIVO'
            const tipoDocTexto = usuario.tipoDocumentoCodigo || 'DOC'

            return (
              <tr key={usuario.usuarioId}>
                {/* COLABORADOR (FOTO/AVATAR + NOMBRE + DOCUMENTO + COP) */}
                <td>
                  <div className="flex items-center gap-3">
                    {usuario.odontologoId && usuario.fotoNombreArchivo ? (
                      <div className="size-10 shrink-0 overflow-hidden rounded-full border border-line bg-alt shadow-2xs">
                        <ProtectedImage
                          path={`/api/odontologos/${usuario.odontologoId}/foto`}
                          accessToken={accessToken}
                          alt={`${prefijo}${nombre}`}
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
                        size={38}
                        animate="hover"
                        trackCursor={false}
                      />
                    )}

                    <div className="min-w-0">
                      <p className="font-bold text-ink">
                        {prefijo}{nombre}
                      </p>

                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <span className="font-semibold text-ink-soft">{tipoDocTexto}</span>
                        <span className="text-muted">·</span>
                        <span className="tabular-nums font-medium text-ink">
                          {usuario.numeroDocumento}
                        </span>

                        {usuario.numeroColegiatura && (
                          <>
                            <span className="text-muted">·</span>
                            <span className="inline-flex items-center rounded bg-brand-soft/50 px-1.5 py-0.2 text-[0.68rem] font-semibold text-brand">
                              {usuario.numeroColegiatura.toUpperCase().startsWith('COP')
                                ? usuario.numeroColegiatura
                                : `COP ${usuario.numeroColegiatura}`}
                            </span>
                          </>
                        )}
                      </div>
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
                      <span className="tabular-nums font-medium text-ink-soft">
                        {usuario.telefono ? (
                          formatPhone(usuario.telefono)
                        ) : (
                          <span className="italic text-muted">Sin teléfono</span>
                        )}
                      </span>
                    </div>
                  </div>
                </td>

                {/* ROL */}
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {usuario.roles.map(rol => {
                      const info = rolBadgeInfo(rol)
                      return (
                        <Badge key={rol} tone={info.tone}>
                          {info.label}
                        </Badge>
                      )
                    })}
                  </div>
                </td>

                {/* ESPECIALIDADES */}
                <td>
                  {odontologo && usuario.especialidades.length > 0 ? (
                    usuario.especialidades.length === 1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand-soft/70 px-2 py-0.5 text-[0.7rem] font-medium text-brand">
                        <Icon name="tooth" size={10} className="shrink-0 text-brand" />
                        {usuario.especialidades[0]}
                      </span>
                    ) : (
                      <Tooltip
                        content={`Especialidades: ${usuario.especialidades.join(', ')}`}
                      >
                        <span className="inline-flex cursor-help items-center gap-1 rounded-full border border-brand/20 bg-brand-soft/70 px-2 py-0.5 text-[0.7rem] font-medium text-brand transition-colors hover:bg-brand-soft">
                          <Icon name="tooth" size={10} className="shrink-0 text-brand" />
                          {usuario.especialidades.length} especialidades
                        </span>
                      </Tooltip>
                    )
                  ) : (
                    <span className="text-xs text-muted/60">-</span>
                  )}
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