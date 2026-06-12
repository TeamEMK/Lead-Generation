'use client'

import { useEffect, useState } from 'react'
import { fetchLeads, type AdminLead } from '../../../lib/api'
import { Search, ExternalLink } from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [filtered, setFiltered] = useState<AdminLead[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeads()
      .then(r => { setLeads(r.leads); setFiltered(r.leads); setTotal(r.total) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(leads.filter(l =>
      l.business_name.toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.address || '').toLowerCase().includes(q) ||
      (l.keyword || '').toLowerCase().includes(q) ||
      (l.user_email || '').toLowerCase().includes(q)
    ))
  }, [search, leads])

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Leads</h1>
          <p className="text-slate-400 text-sm mt-1">
            {total.toLocaleString('en-IN')} leads in the database{total > leads.length ? ` · showing latest ${leads.length.toLocaleString('en-IN')}` : ''}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search business / phone / keyword…"
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
                  {['Business', 'Phone', 'Website', 'Email', 'Address', 'Keyword', 'User', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-[var(--hover)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text)] whitespace-nowrap max-w-[220px] truncate">{l.business_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{l.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">
                      {l.website ? (
                        <a href={l.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-400 hover:underline">
                          {l.website.replace(/^https?:\/\//, '').slice(0, 24)} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{l.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[260px] truncate">{l.address || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg bg-brand-500/10 text-brand-300 text-xs border border-brand-500/20">{l.keyword || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-[var(--text)] text-xs font-medium flex items-center gap-1.5">
                        {l.user_name || 'Unknown'}
                        {l.owner_deleted && <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/20">deleted</span>}
                      </p>
                      <p className="text-xs text-slate-500">{l.user_email || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{fmt(l.assigned_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-600">No leads found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
