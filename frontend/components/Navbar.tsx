'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ThemeToggle from './ThemeToggle'
import SheetLinkModal from './SheetLinkModal'
import { LayoutDashboard, Zap, Database, LogOut, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generate', label: 'Generate', icon: Zap },
  { href: '/leads', label: 'Leads', icon: Database },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [showModal, setShowModal] = useState(false)

  // Auto-show sheet modal 3s after login if no sheet linked
  useEffect(() => {
    if (!user || user.spreadsheet_id) return
    const t = setTimeout(() => setShowModal(true), 3000)
    return () => clearTimeout(t)
  }, [user?.id, user?.spreadsheet_id])

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const sheetLinked = Boolean(user?.spreadsheet_id)

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/95 dark:bg-[#0e1117]/95 backdrop-blur-md">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        <div className="w-full px-6 lg:px-10 flex items-center justify-between h-16 relative">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-[17px] tracking-tight">
              Lead<span className="text-gradient">Gen</span>
            </span>
          </Link>

          {/* Nav — truly centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.06] p-1 rounded-xl">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden sm:block text-xs text-slate-400 dark:text-slate-500 max-w-[140px] truncate">
                {user.email}
              </span>
            )}

            {/* Sheet button */}
            {user && (
              <button
                onClick={() => setShowModal(true)}
                title={sheetLinked ? 'Change linked Google Sheet' : 'Link Google Sheet'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  sheetLinked
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:block">
                  {sheetLinked ? 'Sheet' : 'Link Sheet'}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${sheetLinked ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              </button>
            )}

            <ThemeToggle />

            {user && (
              <button
                onClick={handleLogout}
                title="Log out"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Logout</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {showModal && <SheetLinkModal onClose={() => setShowModal(false)} />}
    </>
  )
}
