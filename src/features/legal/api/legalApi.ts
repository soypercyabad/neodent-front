const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export interface TerminosCondicionesItem {
  id: number
  titulo: string
  version: string
  nombreArchivo: string
  claveS3: string
  tamanoBytes: number
  activo: boolean
  urlVisualizar: string
  urlS3?: string
  fechaCreacion: string
  fechaActualizacion: string
}

export interface TerminosInfoResponse {
  id?: number | null
  titulo: string
  version: string
  nombreArchivo: string
  claveS3: string
  tamanoBytes: number
  activo: boolean
  urlVisualizar: string
  urlS3?: string
  fechaCreacion?: string
  fechaActualizacion?: string
}

export interface AceptacionTerminosItem {
  id: number
  usuarioId: number
  correo: string
  nombreCompleto: string
  numeroDocumento: string
  versionTerminos: string
  tituloTerminos: string
  aceptadoEn: string
  ip?: string
  agenteUsuario?: string
}

export const legalApi = {
  getUrlDescarga(id?: number): string {
    if (id) return `${API_BASE_URL}/api/terminos-condiciones/admin/${id}/ver`
    return `${API_BASE_URL}/api/terminos-condiciones`
  },

  async abrirDocumento(id?: number, accessToken?: string): Promise<void> {
    if (!id) {
      window.open(`${API_BASE_URL}/api/terminos-condiciones`, '_blank')
      return
    }

    try {
      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }
      const res = await fetch(`${API_BASE_URL}/api/terminos-condiciones/admin/${id}/ver`, {
        headers,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      window.open(blobUrl, '_blank')
    } catch {
      // Fallback
      window.open(`${API_BASE_URL}/api/terminos-condiciones/admin/${id}/ver`, '_blank')
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
    accessToken: string
  ): Promise<TerminosCondicionesItem> {
    const formData = new FormData()
    formData.append('archivo', archivo)
    if (titulo) formData.append('titulo', titulo)
    if (version) formData.append('version', version)
    formData.append('activar', String(activar))

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
}
