import {
  authApi,
  type AuthenticatedUserResponse,
} from '../api/authApi'

interface RestoredSession {
  accessToken: string
  profile: AuthenticatedUserResponse
}

let pendingRestoration: Promise<RestoredSession> | null = null

export function restoreSession(): Promise<RestoredSession> {
  if (pendingRestoration) {
    return pendingRestoration
  }

  const restoration = (async (): Promise<RestoredSession> => {
    const response = await authApi.refresh()

    const profile = await authApi.me(response.accessToken)

    return {
      accessToken: response.accessToken,
      profile,
    }
  })()

  pendingRestoration = restoration

  void restoration.finally(() => {
    if (pendingRestoration === restoration) {
      pendingRestoration = null
    }
  }).catch(() => {
    // El error ya se entrega a quienes esperan restoreSession().
  })

  return restoration
}