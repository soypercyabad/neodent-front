import { useCallback, useEffect, useMemo, useState, type ReactNode, } from 'react'
import { authApi, type AuthenticatedUserResponse, } from '../api/authApi'
import type { User, Role } from '@/domain/identity'
import { AuthContext, type AuthStore, type PendingTwoFactor, } from './AuthContext'
import type { Credentials, RegisterInput } from './auth.types'
import { restoreSession } from './sessionService'

function mapBackendRole(roles: string[]): Role {
  if (roles.includes('ADMIN')) return 'Administrador'
  if (roles.includes('RECEPCIONISTA')) return 'Recepcionista'
  if (roles.includes('ODONTOLOGO')) return 'Odontólogo'
  if (roles.includes('PACIENTE')) return 'Paciente'

  throw new Error('El usuario no tiene un rol válido.')
}

function mapProfileToUser(profile: AuthenticatedUserResponse): User {
  const rol = mapBackendRole(profile.roles)

  return {
    id: profile.idUsuario,
    nombre: profile.nombres,
    apellido: [
      profile.apellidoPaterno,
      profile.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' '),

    correo: profile.correo,
    rol,
    esp: '',
    activo: profile.estado === 'ACTIVO',
    tieneHorario: false,

    ...(profile.idPaciente !== null
      ? { pacId: profile.idPaciente }
      : {}),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const [accessToken, setAccessToken] = useState<string | null>(
    null,
  )

  const [pendingTwoFactor, setPendingTwoFactor] =
    useState<PendingTwoFactor | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  const limpiarSesion = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setPendingTwoFactor(null)
  }, [])

  /**
   * Obtiene el perfil real antes de establecer la sesión.
   * No guarda el JWT en localStorage ni sessionStorage.
   */
  const aplicarSesion = useCallback(async (token: string) => {
    const profile = await authApi.me(token)

    const authenticatedUser = mapProfileToUser(profile)

    setAccessToken(token)
    setUser(authenticatedUser)
  }, [])

  /**
   * Restaura la sesión al recargar la página.
   * El refresh token permanece en la cookie HttpOnly.
   */
  useEffect(() => {
    let mounted = true

    const restaurarSesion = async () => {
      try {
        const { accessToken: token, profile } = await restoreSession()

        if (!mounted) return

        setAccessToken(token)
        setUser(mapProfileToUser(profile))
      } catch {
        if (!mounted) return

        setAccessToken(null)
        setUser(null)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void restaurarSesion()

    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback(
    async ({ correo, password }: Credentials) => {
      const normalizedEmail = correo.trim().toLowerCase()

      const response = await authApi.login(
        normalizedEmail,
        password,
      )

      if (!response.requiresTwoFactor || !response.challengeId) {
        throw new Error(
          'El servidor no devolvió un desafío de segundo factor válido.',
        )
      }

      setPendingTwoFactor({
        challengeId: response.challengeId,
        correo: normalizedEmail,
      })
    },
    [],
  )

  const verifyTwoFactor = useCallback(
    async (codigo: string) => {
      if (!pendingTwoFactor) {
        throw new Error('No hay una verificación pendiente.')
      }

      const response = await authApi.verifyTwoFactor(
        pendingTwoFactor.challengeId,
        codigo,
      )

      await aplicarSesion(response.accessToken)

      setPendingTwoFactor(null)
    },
    [pendingTwoFactor, aplicarSesion],
  )

  const resendTwoFactor = useCallback(async () => {
    if (!pendingTwoFactor) {
      throw new Error('No hay una verificación pendiente.')
    }

    const response = await authApi.resendCode(
      pendingTwoFactor.challengeId,
    )

    setPendingTwoFactor((current) =>
      current
        ? {
            ...current,
            challengeId: response.challengeId,
          }
        : null,
    )
  }, [pendingTwoFactor])

  const register = useCallback(async (_input: RegisterInput) => {
    throw new Error(
      'El registro será conectado al backend en el siguiente módulo.',
    )
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      limpiarSesion()
    }
  }, [limpiarSesion])

  const value = useMemo<AuthStore>(
    () => ({
      user,
      accessToken,
      pendingTwoFactor,
      isLoading,

      login,
      verifyTwoFactor,
      resendTwoFactor,
      register,
      logout,
    }),
    [
      user,
      accessToken,
      pendingTwoFactor,
      isLoading,
      login,
      verifyTwoFactor,
      resendTwoFactor,
      register,
      logout,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}