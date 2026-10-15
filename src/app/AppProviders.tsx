import type { ReactNode } from 'react'
import { AuthProvider } from '@/features/auth'
import { DataProvider } from '@/legacy/demo-store'
import { ToastContainer } from '@/shared/components/ui'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        {children}
        <ToastContainer />
      </DataProvider>
    </AuthProvider>
  )
}
