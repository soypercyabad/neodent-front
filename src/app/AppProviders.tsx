import type { ReactNode } from 'react'
import { AuthProvider } from '@/features/auth'
import { DataProvider } from '@/legacy/demo-store'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
      </DataProvider>
    </AuthProvider>
  )
}
