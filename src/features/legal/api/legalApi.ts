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
  fechaCreacion?: string
  fechaActualizacion?: string
}

export const legalApi = {
  getUrlDescarga(id?: number): string {
    if (id) return `${API_BASE_URL}/api/terminos-condiciones/admin/${id}/descargar`
    const s3Url = import.meta.env.VITE_TERMINOS_URL
    if (s3Url && s3Url.startsWith('http')) return s3Url
    return `${API_BASE_URL}/api/terminos-condiciones`
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

    if (!res.ok) throw new Error('Error al eliminar la versión de S3')
  },
}
