import type { ReactNode } from 'react'
import { AuthProvider } from '@/features/auth'
import { ToastContainer } from '@/shared/components/ui'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ToastContainer />
    </AuthProvider>
  )
}
