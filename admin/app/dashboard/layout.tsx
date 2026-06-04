'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { router.replace('/login'); return }
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c18]">
        <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#080c18]">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
