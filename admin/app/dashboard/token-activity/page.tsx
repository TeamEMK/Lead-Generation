'use client'

import { useEffect, useState } from 'react'
import { fetchTokenActivity, type TokenActivity } from '../../../lib/api'
import { Search } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export default function TokenActivityPage() {
  const [rows, setRows] = useState<TokenActivity[]>([])
  const [filtered, setFiltered] = useState<TokenActivity[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTokenActivity()
      .then(a => { setRows(a); setFiltered(a) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const statuses = ['all', ...Array.from(new Set(rows.map(r => r.status)))]

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(rows.filter(r =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (r.keyword.toLowerCase().includes(q) || r.user_name.toLowerCase().includes(q) ||
       r.user_email.toLowerCase().includes(q))
    ))
  }, [search, statusFilter, rows])

  const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const totalTokens = rows.reduce((a, r) => a + (r.tokens_used || 0), 0)
  const totalLeads = rows.reduce((a, r) => a + (r.leads || 0), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Token Activity</h1>
          <p className="text-slate-400 text-sm mt-1">
            {rows.length} searches · {totalLeads.toLocaleString('en-IN')} leads · {totalTokens.toLocaleString('en-IN')} tokens used
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
            {statuses.map(v => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${statusFilter === v ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search keyword / user…"
              className="pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-56"
            />
          </div>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}

      <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['#', 'Keyword', 'User', 'Leads', 'Tokens Used', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-300 text-xs border border-brand-500/20 font-medium">{r.keyword || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-white">{r.user_name}</p>
                      <p className="text-xs text-slate-500">{r.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{r.leads.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-white">{r.tokens_used.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border font-medium capitalize ${STATUS_STYLES[r.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{fmt(r.created_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-600">No token activity found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
