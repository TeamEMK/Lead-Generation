'use client'

import { useEffect, useState } from 'react'
import { fetchTransactions, type AdminTransaction } from '../../../lib/api'
import { Search } from 'lucide-react'

const TYPE_STYLES: Record<string, string> = {
  purchase: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  bonus: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  debit: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<AdminTransaction[]>([])
  const [filtered, setFiltered] = useState<AdminTransaction[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
      .then(t => { setTxns(t); setFiltered(t) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const types = ['all', ...Array.from(new Set(txns.map(t => t.type)))]

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(txns.filter(t =>
      (typeFilter === 'all' || t.type === typeFilter) &&
      (t.user_name.toLowerCase().includes(q) || t.user_email.toLowerCase().includes(q) ||
       t.description.toLowerCase().includes(q))
    ))
  }, [search, typeFilter, txns])

  const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">{txns.length} records (latest 1000)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
            {types.map(v => (
              <button key={v} onClick={() => setTypeFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-all ${typeFilter === v ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}>
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
                  {['#', 'User', 'Type', 'Tokens', 'Description', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{t.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-white">{t.user_name}</p>
                      <p className="text-xs text-slate-500">{t.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border font-medium capitalize ${TYPE_STYLES[t.type] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-white">{t.amount > 0 ? `+${t.amount}` : t.amount}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs">
                      <p className="truncate">{t.description}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{fmt(t.created_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-600">No transactions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
