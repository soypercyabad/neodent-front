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
  _retry?: boolean
}

type TokenRefresher = () => Promise<string | null>
type SessionExpiredHandler = () => void

let tokenRefresher: TokenRefresher | null = null
let sessionExpiredHandler: SessionExpiredHandler | null = null
let refreshPromise: Promise<string | null> | null = null

export function setTokenRefresher(refresher: TokenRefresher | null) {
  tokenRefresher = refresher
}

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler
}

async function renovarAccessToken(): Promise<string | null> {
  if (!tokenRefresher) return null

  if (!refreshPromise) {
    refreshPromise = tokenRefresher()
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function esRutaDeAutenticacion(path: string): boolean {
  return (
    path.includes('/auth/login') ||
    path.includes('/auth/refresh') ||
    path.includes('/auth/verify') ||
    path.includes('/auth/2fa')
  )
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    accessToken,
    headers: customHeaders,
    _retry = false,
    ...requestOptions
  } = options

  const esFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData
  const headers = new Headers(customHeaders)

  if (requestOptions.body && !esFormData) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  }

  if (esFormData) headers.delete('Content-Type')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers,
  })

  if (response.status === 401 && !_retry && !esRutaDeAutenticacion(path) && tokenRefresher) {
    const nuevoAccessToken = await renovarAccessToken()

    if (nuevoAccessToken) {
      return apiRequest<T>(path, {
        ...options,
        accessToken: nuevoAccessToken,
        _retry: true,
      })
    }

    sessionExpiredHandler?.()
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null

    try {
      body = await response.json()
    } catch {
      // La respuesta puede no contener JSON.
    }

    throw new ApiError(
      body?.message ??
        (response.status === 401
          ? 'Tu sesión ha expirado.'
          : 'Ocurrió un error al procesar la solicitud.'),
      response.status,
      body?.fieldErrors,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function apiBlob(
  path: string,
  accessToken: string,
  retry = false,
): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.status === 401 && !retry && !esRutaDeAutenticacion(path) && tokenRefresher) {
    const nuevoAccessToken = await renovarAccessToken()

    if (nuevoAccessToken) {
      return apiBlob(path, nuevoAccessToken, true)
    }

    sessionExpiredHandler?.()
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null

    try {
      body = await response.json()
    } catch {
      // Puede no venir JSON.
    }

    throw new ApiError(
      body?.message ??
        (response.status === 401
          ? 'Tu sesión ha expirado.'
          : 'No se pudo obtener el archivo.'),
      response.status,
      body?.fieldErrors,
    )
  }

  return response.blob()
}