'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppLayout from './AppLayout'
import { useAuth } from '../context/AuthContext'

const AUTH_PATHS = ['/login', '/signup']
const PUBLIC_PATHS = ['/', '/select-plan']

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()

  const isAuthPage = AUTH_PATHS.includes(pathname)
  const isPublicPage = PUBLIC_PATHS.includes(pathname)
  const isProtected = !isAuthPage && !isPublicPage

  useEffect(() => {
    if (loading) return
    if (!user && isProtected) router.replace('/login')
    // Only auto-redirect from /login — signup handles its own redirect to /select-plan
    if (user && pathname === '/login') router.replace('/dashboard')
  }, [user, loading, isAuthPage, isProtected, router])

  if (loading && isProtected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0e1117]">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (isAuthPage || isPublicPage) return <>{children}</>
  if (!user) return null

  return <AppLayout>{children}</AppLayout>
}
