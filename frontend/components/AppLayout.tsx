'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Zap, Database, LogOut,
  FileSpreadsheet, Pin, PinOff, Loader2, Sun, Moon,
} from 'lucide-react'
import SheetLinkModal from './SheetLinkModal'
import { useAuth } from '../context/AuthContext'
import { useGeneration } from '../context/GenerationContext'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generate', label: 'Generate', icon: Zap },
  { href: '/leads', label: 'Leads', icon: Database },
]

// Sidebar width + left offset + gap = content left margin
const SIDEBAR_MIN_ML = 'ml-[4.5rem]'   // 48px sidebar + 8px left + 16px gap
const SIDEBAR_MAX_ML = 'ml-[15.5rem]'  // 224px sidebar + 8px left + 16px gap

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { loading: generating } = useGeneration()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const expanded = pinned || hovered
  const sheetLinked = Boolean(user?.spreadsheet_id)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-pinned')
    if (saved === 'true') setPinned(true)
  }, [])

  useEffect(() => {
    if (!user || user.spreadsheet_id) return
    const t = setTimeout(() => setShowModal(true), 3000)
    return () => clearTimeout(t)
  }, [user?.id, user?.spreadsheet_id])

  function togglePin() {
    const next = !pinned
    setPinned(next)
    localStorage.setItem('sidebar-pinned', String(next))
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const isDark = mounted && theme === 'dark'

  return (
    <>
      <div className="flex min-h-screen bg-slate-100 dark:bg-[#080c12]">

        {/* ── Sidebar — floating with gap from edges ── */}
        <aside
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`fixed left-2 top-2 h-[calc(100vh-1rem)] z-40 flex flex-col
            bg-white dark:bg-[#0e1117]
            border border-slate-200 dark:border-white/[0.06]
            rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/30
            transition-all duration-200 ease-in-out overflow-hidden
            ${expanded ? 'w-52' : 'w-12'}`}
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

          {/* Logo */}
          <div className="flex items-center h-14 px-3 flex-shrink-0 border-b border-slate-100 dark:border-white/[0.04]">
            <Link href="/" className="flex items-center gap-2.5 group min-w-0">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 flex-shrink-0">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className={`font-bold text-slate-900 dark:text-white text-sm tracking-tight whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                Lead<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">Gen</span>
              </span>
            </Link>

            {expanded && (
              <button
                onClick={togglePin}
                title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all flex-shrink-0"
              >
                {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              const isGenerate = href === '/generate'
              return (
                <div key={href} className="relative group/item">
                  <Link
                    href={href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="relative flex-shrink-0 w-4 h-4 flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                      {isGenerate && generating && (
                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                      {label}
                    </span>
                    {isGenerate && generating && expanded && (
                      <Loader2 className="w-3 h-3 ml-auto animate-spin text-indigo-500 flex-shrink-0" />
                    )}
                  </Link>

                  {/* Tooltip when minimized */}
                  {!expanded && (
                    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/[0.08]">
                      {label}{isGenerate && generating && ' · running…'}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-2 space-y-0.5 border-t border-slate-100 dark:border-white/[0.04] flex-shrink-0">

            {/* Google Sheet button */}
            <div className="relative group/sheet">
              <button
                onClick={() => setShowModal(true)}
                title={sheetLinked ? 'Change linked Google Sheet' : 'Link Google Sheet'}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  sheetLinked
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                }`}
              >
                <div className="relative flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${sheetLinked ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                </div>
                <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                  {sheetLinked ? 'Google Sheet' : 'Link Google Sheet'}
                </span>
              </button>
              {!expanded && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover/sheet:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/[0.08]">
                  {sheetLinked ? 'Google Sheet' : 'Link Google Sheet'}
                </div>
              )}
            </div>

            {/* Theme toggle — full button */}
            <div className="relative group/theme">
              <button
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-800 dark:hover:text-slate-200 transition-all"
              >
                <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                  {mounted && isDark
                    ? <Sun className="w-4 h-4" />
                    : <Moon className="w-4 h-4" />}
                </div>
                <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                  {mounted && isDark ? 'Light mode' : 'Dark mode'}
                </span>
              </button>
              {!expanded && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover/theme:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/[0.08]">
                  {mounted && isDark ? 'Light mode' : 'Dark mode'}
                </div>
              )}
            </div>

            {/* User + logout */}
            {user && (
              <div className="relative group/logout">
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <div className={`min-w-0 text-left transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                    <p className="text-xs font-semibold truncate leading-none">{user.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{user.email}</p>
                  </div>
                </button>
                {!expanded && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover/logout:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/[0.08]">
                    {user.name} · Logout
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content — shifts on hover AND pin ── */}
        <div className={`flex-1 min-w-0 transition-all duration-200 ${expanded ? SIDEBAR_MAX_ML : SIDEBAR_MIN_ML}`}>
          <main className="p-4 lg:p-6 min-h-screen">
            <div className="bg-white dark:bg-[#0e1117] rounded-2xl border border-slate-200 dark:border-white/[0.06] shadow-sm min-h-[calc(100vh-2rem)] p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>

      </div>

      {showModal && <SheetLinkModal onClose={() => setShowModal(false)} />}
    </>
  )
}
