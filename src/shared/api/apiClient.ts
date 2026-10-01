import { API_URL } from './config'

interface ApiErrorBody {
  status?: number
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string>,
  ) {
    super(message)

    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface ApiRequestOptions extends RequestInit {
  accessToken?: string | null
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    accessToken,
    headers: customHeaders,
    ...requestOptions
  } = options

  const esFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData
  const headers = new Headers(customHeaders)

  if (requestOptions.body && !esFormData) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
  }

  if (esFormData) headers.delete('Content-Type')

  if (accessToken) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    )
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...requestOptions,
      credentials: 'include',
      headers,
    },
  )

  if (!response.ok) {
    let body: ApiErrorBody | null = null

    try {
      body = await response.json()
    } catch {
      // La respuesta puede no contener JSON.
    }

    throw new ApiError(
      body?.message ??
        'Ocurrió un error al procesar la solicitud.',
      response.status,
      body?.fieldErrors,
    )
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export async function apiBlob(path: string, accessToken: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    let body: ApiErrorBody | null = null
    try { body = await response.json() } catch {}
    throw new ApiError(
      body?.message ?? 'No se pudo obtener el archivo.',
      response.status,
      body?.fieldErrors,
    )
  }

  return response.blob()
}