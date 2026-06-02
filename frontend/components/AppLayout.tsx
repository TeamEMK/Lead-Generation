'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Zap, Database, LogOut,
  Pin, PinOff, Loader2, Sun, Moon, History,
  Coins, CreditCard, Menu, X, Settings,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useGeneration } from '../context/GenerationContext'
import { fetchTokenBalance } from '../lib/api'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/generate', label: 'Generate', icon: Zap },
  { href: '/leads', label: 'Leads', icon: Database },
  { href: '/history', label: 'History', icon: History },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function SidebarContent({
  expanded, pathname, generating, tokenBalance, isDark, mounted,
  pinned, togglePin, handleLogout, toggleTheme, user, onNavClick,
}: any) {
  return (
    <div className="flex flex-col h-full">
      {/* Gradient accent top line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-brand-500 via-brand-500 to-brand-500" />

      {/* Logo */}
      <div className="flex items-center h-14 px-3 flex-shrink-0 border-b border-slate-100 dark:border-white/[0.05]">
        <Link href="/" onClick={onNavClick} className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/30 flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className={`font-bold text-slate-900 dark:text-white text-sm tracking-tight whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            GMB <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-500">Leads</span>
          </span>
        </Link>
        {expanded && (
          <button
            onClick={togglePin}
            className="ml-auto p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all flex-shrink-0"
          >
            {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          const isGenerate = href === '/generate'
          return (
            <div key={href} className="relative group/item">
              <Link
                href={href}
                onClick={onNavClick}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center">
                  <Icon className={`w-[18px] h-[18px] ${active ? 'text-brand-600 dark:text-brand-400' : ''}`} />
                  {isGenerate && generating && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0d1228]" />
                  )}
                </div>
                <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                  {label}
                </span>
                {isGenerate && generating && expanded && (
                  <Loader2 className="w-3.5 h-3.5 ml-auto animate-spin text-emerald-500 flex-shrink-0" />
                )}
              </Link>
              {!expanded && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-[#1c2540] text-white text-xs rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                  {label}{isGenerate && generating && ' · running…'}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-slate-100 dark:border-white/[0.05] space-y-0.5 flex-shrink-0">
        {/* Theme */}
        <div className="relative group/theme">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-800 dark:hover:text-slate-200 transition-all"
          >
            <div className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center">
              {mounted && isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </div>
            <span className={`whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              {mounted && isDark ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
          {!expanded && (
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-[#1c2540] text-white text-xs rounded-lg opacity-0 group-hover/theme:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
              {mounted && isDark ? 'Light mode' : 'Dark mode'}
            </div>
          )}
        </div>

        {/* User / Logout */}
        {user && (
          <div className="relative group/logout">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
            >
              <div className="w-[18px] h-[18px] flex-shrink-0 flex items-center justify-center">
                <LogOut className="w-[18px] h-[18px]" />
              </div>
              <div className={`min-w-0 text-left transition-all duration-200 ${expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                <p className="text-xs font-semibold truncate leading-none text-slate-700 dark:text-slate-300">{user.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>
            </button>
            {!expanded && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-[#1c2540] text-white text-xs rounded-lg opacity-0 group-hover/logout:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                {user.name} · Logout
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { loading: generating } = useGeneration()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  const expanded = pinned || hovered

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-pinned')
    if (saved === 'true') setPinned(true)
  }, [])
  useEffect(() => {
    fetchTokenBalance().then(setTokenBalance).catch(() => {})
  }, [pathname])
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close drawer on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (mobileOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [mobileOpen])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function togglePin() {
    const next = !pinned
    setPinned(next)
    localStorage.setItem('sidebar-pinned', String(next))
  }
  function handleLogout() { logout(); router.push('/login') }
  function toggleTheme() { setTheme(theme === 'dark' ? 'light' : 'dark') }
  const isDark = mounted && theme === 'dark'

  const sharedProps = {
    pathname, generating, tokenBalance, isDark, mounted,
    pinned, togglePin, handleLogout, toggleTheme, user,
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#080c12]">

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4
        bg-white/95 dark:bg-[#0d1228]/95 backdrop-blur-md
        border-b border-slate-200 dark:border-white/[0.06]">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/30">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
            GMB <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-500">Leads</span>
          </span>
        </Link>

        <Link href="/subscription" className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          tokenBalance !== null && tokenBalance < 100
            ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
            : 'border-brand-100 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400'
        }`}>
          <Coins className="w-3.5 h-3.5" />
          {tokenBalance === null ? '…' : tokenBalance.toLocaleString()}
        </Link>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div
            ref={drawerRef}
            className="relative w-64 h-full bg-white dark:bg-[#0d1228] border-r border-slate-200 dark:border-white/[0.06] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-500 via-brand-500 to-brand-500" />
            <div className="flex items-center justify-between h-14 px-4 border-b border-slate-100 dark:border-white/[0.05] flex-shrink-0">
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/30">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
                  GMB <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-500">Leads</span>
                </span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <SidebarContent {...sharedProps} expanded onNavClick={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`hidden lg:flex fixed left-2 top-2 h-[calc(100vh-1rem)] z-40 flex-col
          bg-white dark:bg-[#0d1228]
          border border-slate-200 dark:border-white/[0.06]
          rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20
          transition-all duration-200 ease-in-out overflow-hidden
          ${expanded ? 'w-56' : 'w-[52px]'}`}
      >
        <SidebarContent {...sharedProps} expanded={expanded} onNavClick={() => {}} />
      </aside>

      {/* ── Main content ── */}
      <div className={`transition-all duration-200 ${expanded ? 'lg:ml-[232px]' : 'lg:ml-[68px]'}`}>
        <main className="pt-14 lg:pt-0 min-h-screen p-3 sm:p-4 lg:p-5 flex flex-col">
          <div className="bg-white dark:bg-[#0d1228] rounded-2xl border border-slate-200 dark:border-white/[0.06] shadow-sm flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
