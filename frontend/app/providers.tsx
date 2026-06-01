'use client'

import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '../context/AuthContext'
import { GenerationProvider } from '../context/GenerationContext'
import ConditionalLayout from '../components/ConditionalLayout'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <GenerationProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </GenerationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
