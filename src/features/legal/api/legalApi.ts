import { API_URL } from '@/shared/api/config'

const API_BASE_URL = API_URL || import.meta.env.VITE_API_URL || ''

export interface TerminosCondicionesItem {
  id: number
  codigoDocumento?: string
  titulo: string
  version: string
  nombreArchivo: string
  claveS3: string
  texto?: string
  linkTexto?: string
  textoAgrupado?: string
  tamanoBytes: number
  activo: boolean
  urlVisualizar: string
  urlS3?: string
  fechaCreacion: string
  fechaActualizacion: string
}

export interface DocumentoLegalTipo {
  id: number
  codigo: string
  descripcion: string
  grupo?: number
  activo: boolean
}

export interface TerminosInfoResponse {
  id?: number | null
  codigoDocumento?: string
  titulo: string
  version: string
  nombreArchivo: string
  claveS3: string
  texto?: string
  linkTexto?: string
  textoAgrupado?: string
  tamanoBytes: number
  activo: boolean
  urlVisualizar: string
  urlS3?: string
  fechaCreacion?: string
  fechaActualizacion?: string
}

export interface AceptacionTerminosItem {
  id: number
  tipoDocumento: string
  numeroDocumento: string
  terminoFirmado: string
  version: string
  ip?: string
  agenteUsuario?: string
  fechaAceptacion: string
}

export interface PaginaResponse<T> {
  contenido: T[]
  pagina: number
  tamanoPagina: number
  totalElementos: number
  totalPaginas: number
  esPrimera: boolean
  esUltima: boolean
}

export interface TerminoPendienteItem {
  id: number
  codigo?: string
  titulo: string
  version?: string
  nombreArchivo?: string
  texto?: string
  linkTexto?: string
  textoAgrupado?: string
  urlVisualizar?: string
}

export interface TerminosPendientesResponse {
  tienePendiente: boolean
  terminos: TerminoPendienteItem[]
}

export interface TerminosListarParams {
  buscar?: string
  activo?: boolean
  page?: number
  size?: number
}

export interface AceptacionesListarParams {
  buscar?: string
  page?: number
  size?: number
}

export function sanitizarNombreSlug(titulo?: string): string {
  if (!titulo) return 'terminos_y_condiciones_2026.pdf'
  const limpio = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return (limpio || 'terminos_y_condiciones') + '.pdf'
}

export const legalApi = {
  getUrlDescarga(id?: number): string {
    if (id) return `${API_BASE_URL}/api/terminos-condiciones/${id}/ver`
    return `${API_BASE_URL}/api/terminos-condiciones`
  },

  abrirDocumento(_id?: number, _urlVisualizar?: string, nombreArchivo?: string): void {
    const filename = nombreArchivo || 'terminos_y_condiciones.pdf'
    window.open(`/terminos/${encodeURIComponent(filename)}`, '_blank')
  },

  async listarTipos(): Promise<DocumentoLegalTipo[]> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/tipos`)
    if (!res.ok) return []
    return res.json()
  },

  async listarTodosLosTipos(accessToken: string): Promise<DocumentoLegalTipo[]> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/tipos`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return this.listarTipos()
    return res.json()
  },

  async crearTipo(
    accessToken: string,
    data: { codigo: string; descripcion: string; grupo?: number; activo?: boolean }
  ): Promise<DocumentoLegalTipo> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/tipos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.message || 'No se pudo crear el tipo de documento legal')
    }
    return res.json()
  },

  async editarTipo(
    accessToken: string,
    id: number,
    data: { descripcion?: string; grupo?: number; activo?: boolean }
  ): Promise<DocumentoLegalTipo> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/tipos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.message || 'No se pudo actualizar el tipo de documento')
    }
    return res.json()
  },

  async cambiarEstadoTipo(accessToken: string, id: number, activo: boolean): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/tipos/${id}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ activo }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.message || 'No se pudo cambiar el estado del tipo de documento')
    }
  },

  async obtenerInfoActivo(): Promise<TerminosInfoResponse> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/info`)
    if (!res.ok) throw new Error('No se pudo obtener información del documento activo')
    return res.json()
  },

  async listarVersiones(accessToken: string): Promise<TerminosCondicionesItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) throw new Error('No se pudo cargar la lista de versiones')
    return res.json()
  },

  async subirVersion(
    archivo: File,
    titulo: string,
    version: string,
    activar: boolean,
    accessToken: string,
    idTipoDocumento?: number,
    texto?: string,
    linkTexto?: string,
    textoAgrupado?: string
  ): Promise<TerminosCondicionesItem> {
    const formData = new FormData()
    formData.append('archivo', archivo)
    if (titulo) formData.append('titulo', titulo)
    if (version) formData.append('version', version)
    formData.append('activar', String(activar))
    if (idTipoDocumento) formData.append('idTipoDocumento', String(idTipoDocumento))
    if (texto) formData.append('texto', texto)
    if (linkTexto) formData.append('linkTexto', linkTexto)
    if (textoAgrupado) formData.append('textoAgrupado', textoAgrupado)

    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    if (!res.ok) {
      let mensaje = 'Error al subir la versión a S3'
      try {
        const err = await res.json()
        mensaje = err?.message || err?.error || err?.detail || mensaje
      } catch {
        const txt = await res.text().catch(() => '')
        if (txt) mensaje = txt
      }
      throw new Error(mensaje)
    }

    return res.json()
  },

  async editarVersion(
    id: number,
    titulo: string,
    version: string,
    archivo: File | null,
    activar: boolean,
    accessToken: string
  ): Promise<TerminosCondicionesItem> {
    const formData = new FormData()
    if (titulo) formData.append('titulo', titulo)
    if (version) formData.append('version', version)
    if (archivo) formData.append('archivo', archivo)
    formData.append('activar', String(activar))

    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    if (!res.ok) {
      let mensaje = 'Error al editar la versión'
      try {
        const err = await res.json()
        mensaje = err?.message || err?.error || err?.detail || mensaje
      } catch {
        const txt = await res.text().catch(() => '')
        if (txt) mensaje = txt
      }
      throw new Error(mensaje)
    }

    return res.json()
  },

  async cambiarEstado(id: number, activo: boolean, accessToken: string): Promise<TerminosCondicionesItem> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/${id}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ activo }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.message || 'No se pudo cambiar el estado de la versión')
    }

    return res.json()
  },

  async eliminarVersion(id: number, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.message || 'No se pudo eliminar la versión')
    }
  },

  async listarAceptaciones(accessToken: string): Promise<AceptacionTerminosItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/aceptaciones`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) throw new Error('No se pudo cargar el registro de aceptaciones')
    return res.json()
  },

  async listarVersionesPaginado(
    accessToken: string,
    params: TerminosListarParams = {}
  ): Promise<PaginaResponse<TerminosCondicionesItem>> {
    const q = new URLSearchParams()
    if (params.buscar) q.append('buscar', params.buscar)
    if (params.activo !== undefined) q.append('activo', String(params.activo))
    q.append('page', String(params.page ?? 0))
    q.append('size', String(params.size ?? 10))

    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin?${q.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) throw new Error('No se pudo cargar la lista de versiones')
    return res.json()
  },

  async listarAceptacionesPaginado(
    accessToken: string,
    params: AceptacionesListarParams = {}
  ): Promise<PaginaResponse<AceptacionTerminosItem>> {
    const q = new URLSearchParams()
    if (params.buscar) q.append('buscar', params.buscar)
    q.append('page', String(params.page ?? 0))
    q.append('size', String(params.size ?? 10))

    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/aceptaciones?${q.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) throw new Error('No se pudo cargar el registro de aceptaciones')
    return res.json()
  },

  async verificarPendiente(accessToken: string): Promise<TerminosPendientesResponse> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/pendiente`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) {
      return { tienePendiente: false, terminos: [] }
    }
    const data = await res.json()
    const terminosList: TerminoPendienteItem[] = Array.isArray(data.terminos)
      ? data.terminos
      : data.terminos
      ? [data.terminos]
      : []
    return {
      tienePendiente: Boolean(data.tienePendiente && terminosList.length > 0),
      terminos: terminosList,
    }
  },

  async aceptarTerminos(accessToken: string, terminosId?: number): Promise<{ exito: boolean; mensaje: string }> {
    const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/aceptar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(terminosId ? { terminosId } : {}),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.message || 'No se pudo registrar la aceptación de los términos')
    }
    return res.json()
  },
}
