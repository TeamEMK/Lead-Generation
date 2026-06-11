'use client'

import { useEffect, useState } from 'react'
import { fetchSubscriptions, type AdminSubscription } from '../../../lib/api'
import { Search } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubscription[]>([])
  const [filtered, setFiltered] = useState<AdminSubscription[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptions()
      .then(s => { setSubs(s); setFiltered(s) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(subs.filter(s =>
      (statusFilter === 'all' || s.status === statusFilter) &&
      (s.user_name.toLowerCase().includes(q) || s.user_email.toLowerCase().includes(q) ||
       s.plan_name.toLowerCase().includes(q) || (s.invoice_number || '').includes(q))
    ))
  }, [search, statusFilter, subs])

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const fmtAmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-slate-400 text-sm mt-1">{subs.length} total · {subs.filter(s => s.status === 'active').length} active</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
            {(['all', 'active', 'expired'] as const).map(v => (
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
              placeholder="Search…"
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
                  {['Invoice #', 'User', 'Plan', 'Tokens', 'Amount (incl. GST)', 'Razorpay Payment', 'Status', 'Created', 'Expires'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-nowrap">{s.invoice_number || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-white">{s.user_name}</p>
                      <p className="text-xs text-slate-500">{s.user_email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs border border-brand-500/20">{s.plan_name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{s.tokens_purchased.toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{fmtAmt(s.amount_paid_inr)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{s.razorpay_payment_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border font-medium capitalize ${STATUS_STYLES[s.status] || STATUS_STYLES.expired}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(s.created_at)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.expires_at ? fmt(s.expires_at) : '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-600">No subscriptions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
