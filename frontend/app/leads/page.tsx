'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Sparkles, Database, Download, X, AlertTriangle } from 'lucide-react'
import LeadsTable from '../../components/LeadsTable'
import { fetchLeads, type Lead } from '../../lib/api'

function downloadCSV(leads: Lead[]) {
  const esc = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`
  const headers = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address']
  const rows = leads.map(l => [
    esc(l.timestamp), esc(l.keyword), esc(l.businessName),
    esc(l.phone), esc(l.website), esc(l.email), esc(l.address),
  ].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCount, setSelectedCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setLeads(await fetchLeads()) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Database</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Leads</h1>
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {loading ? 'Loading…' : `${leads.length.toLocaleString()} leads · select rows to download`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {leads.length > 0 && selectedCount === 0 && (
            <button
              onClick={() => downloadCSV(leads)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download all</span>
            </button>
          )}
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm">
        {loading && leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-brand-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading leads…</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Fetching from database</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <LeadsTable leads={leads} onSelectionChange={setSelectedCount} />
          </div>
        )}
      </div>
    </div>
  )
}
