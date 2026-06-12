'use client'

import { useEffect, useState } from 'react'
import { fetchUsers, type AdminUser } from '../../../lib/api'
import { Search } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filtered, setFiltered] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
      .then(u => { setUsers(u); setFiltered(u) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.business_name || '').toLowerCase().includes(q)
    ))
  }, [search, users])

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Users</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} total accounts</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, business…"
            className="pl-9 pr-4 py-2 rounded-xl bg-[var(--hover)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-72"
          />
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['#', 'Name', 'Email', 'Phone', 'Business', 'City', 'GST', 'Balance', 'Plan', 'Subs', 'Joined'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-[var(--hover)] transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.id}</td>
                    <td className="px-4 py-3 font-medium text-[var(--text)] whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{u.business_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{u.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{u.gst || '—'}</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold whitespace-nowrap">{u.tokens_balance}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {u.active_plan
                        ? <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs font-medium border border-brand-500/20">{u.active_plan}</span>
                        : <span className="text-slate-600 text-xs">No plan</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{u.sub_count}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(u.created_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-12 text-slate-600">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
