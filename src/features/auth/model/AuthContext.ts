import { createContext } from 'react'
import type { User } from '@/domain/identity'
import type { Credentials, RegisterInput } from './auth.types'

export interface PendingTwoFactor {
  challengeId: number
  correo: string
}

export interface AuthStore {
  user: User | null
  accessToken: string | null
  pendingTwoFactor: PendingTwoFactor | null
  isLoading: boolean

  login: (credentials: Credentials) => Promise<void>
  verifyTwoFactor: (codigo: string) => Promise<void>
  resendTwoFactor: () => Promise<void>

  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthStore | null>(null)