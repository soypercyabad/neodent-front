import { useEffect, useState } from 'react'
import {
  ActionsCell,
  Avatar,
  Badge,
  RowActions,
  Table,
  TableState,
  UsersTableSkeleton,
  type Column,
} from '@/shared/components/ui'
import { documentTypesApi } from '@/shared/api/documentTypesApi'
import type { UsuarioInternoResponse } from '../api/usersApi'

const COLUMNS: Column[] = [
  { label: 'Nombre y apellido' },
  { label: 'Roles' },
  { label: 'Correo' },
  { label: 'Estado', align: 'center' },
  { label: 'Acciones', align: 'center' },
]

const NOMBRES_ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  ODONTOLOGO: 'Odontólogo',
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
  usuarioActualId?: number | null
  onDetail: (usuario: UsuarioInternoResponse) => void
  onEdit: (usuario: UsuarioInternoResponse) => void
  onToggle: (usuario: UsuarioInternoResponse) => void
}

export function UsersTable({
  users,
  loading = false,
  usuarioActualId,
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
    <Table columns={COLUMNS}>
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
                {/* NOMBRE */}
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar
                      nombre={usuario.nombres}
                      apellido={usuario.apellidoPaterno}
                      seed={usuario.usuarioId}
                      size={44}
                      animate="hover"
                      trackCursor={false}
                    />

                    <div className="min-w-0">
                      <p className="font-bold text-ink">{nombreCompleto}</p>
                      <p className="mt-1 text-xs text-muted">
                        <span className="font-medium text-ink-soft">
                          {tipoDocTexto}
                        </span>{' '}
                        · <span className="tabular-nums">{usuario.numeroDocumento}</span>
                      </p>
                    </div>
                  </div>
                </td>

                {/* ROLES */}
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {usuario.roles.map(rol => (
                      <Badge
                        key={rol}
                        tone={
                          rol === 'ODONTOLOGO'
                            ? 'green'
                            : rol === 'ADMIN'
                              ? 'blue'
                              : 'gray'
                        }
                      >
                        {NOMBRES_ROL[rol] ?? rol}
                      </Badge>
                    ))}
                  </div>
                </td>

                {/* CORREO */}
                <td className="text-ink-soft">{usuario.correo}</td>

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