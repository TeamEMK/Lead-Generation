'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  History, RefreshCw, Tag, Hash, Calendar, ChevronDown, ChevronRight,
  Download, Phone, Globe, Mail, MapPin, Loader2, Filter,
} from 'lucide-react'
import { fetchHistory, fetchRunLeads, type GenerationRun, type Lead } from '../../lib/api'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function downloadCSV(leads: Lead[], runId: number) {
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
  a.href = url; a.download = `run-${runId}-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function RunLeadsTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400 dark:text-slate-500">
      <Filter className="w-6 h-6 opacity-40" />
      <p className="text-sm">No leads in this run</p>
    </div>
  )
  return (
    <div className="overflow-auto max-h-[50vh]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 dark:bg-[#1a1f2e]">
            {['Business Name', 'Keyword', 'Phone', 'Website', 'Email', 'Address'].map(h => (
              <th key={h} className="sticky top-0 z-10 bg-slate-100 dark:bg-[#1a1f2e] text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
          {leads.map(lead => (
            <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white max-w-[180px]">
                <span className="truncate block">{lead.businessName || '—'}</span>
              </td>
              <td className="px-4 py-2.5">
                {lead.keyword
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 whitespace-nowrap">
                      <Tag className="w-2.5 h-2.5" />{lead.keyword}
                    </span>
                  : <span className="text-slate-400 dark:text-slate-500">—</span>}
              </td>
              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {lead.phone
                  ? <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400">
                      <Phone className="w-3 h-3 flex-shrink-0" />{lead.phone}
                    </a> : '—'}
              </td>
              <td className="px-4 py-2.5 max-w-[160px]">
                {lead.website
                  ? <a href={lead.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline">
                      <Globe className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    </a> : '—'}
              </td>
              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                {lead.email
                  ? <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400">
                      <Mail className="w-3 h-3 flex-shrink-0" />{lead.email}
                    </a>
                  : <span className="text-slate-400 dark:text-slate-500">—</span>}
              </td>
              <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 max-w-[200px]">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{lead.address || '—'}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RunRow({ run, index, total }: { run: GenerationRun; index: number; total: number }) {
  const [expanded, setExpanded] = useState(false)
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (leads !== null) return
    setLoading(true)
    try {
      const data = await fetchRunLeads(run.id)
      setLeads(data.leads)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <tr
        onClick={toggle}
        className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 tabular font-mono text-xs">
          {total - index}
        </td>
        <td className="px-5 py-3.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="font-medium">
              {new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
              {new Date(run.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 ml-5">{timeAgo(run.created_at)}</p>
        </td>
        <td className="px-5 py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {run.keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20">
                <Tag className="w-2.5 h-2.5" />{kw}
              </span>
            ))}
          </div>
        </td>
        <td className="px-5 py-3.5 text-right">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
            <Hash className="w-3.5 h-3.5 text-indigo-500" />
            {run.total_found.toLocaleString()}
          </span>
        </td>
        <td className="px-5 py-3.5 text-right">
          <div className="flex items-center justify-end gap-2">
            {leads && leads.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); downloadCSV(leads, run.id) }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors border border-indigo-100 dark:border-indigo-500/20"
              >
                <Download className="w-3 h-3" /> CSV
              </button>
            )}
            {expanded
              ? <ChevronDown className="w-4 h-4 text-slate-400" />
              : <ChevronRight className="w-4 h-4 text-slate-400" />
            }
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={5} className="px-0 py-0">
            <div className="border-t border-b border-indigo-100 dark:border-indigo-500/20 bg-slate-50/80 dark:bg-white/[0.02]">
              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-400 dark:text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span className="text-sm">Loading leads…</span>
                </div>
              ) : error ? (
                <p className="p-6 text-sm text-rose-600 dark:text-rose-400">{error}</p>
              ) : (
                <RunLeadsTable leads={leads ?? []} />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<GenerationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setRuns(await fetchHistory()) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalLeads = runs.reduce((acc, r) => acc + r.total_found, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">History</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Generation History</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {loading ? 'Loading…' : `${runs.length} run${runs.length !== 1 ? 's' : ''} · ${totalLeads.toLocaleString()} total leads saved`}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Loading history…</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400 dark:text-slate-500">
            <History className="w-8 h-8 opacity-40" />
            <p className="font-medium text-sm">No generation runs yet</p>
            <p className="text-xs">Go to Generate to create your first batch of leads</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keywords</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Leads</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {runs.map((run, idx) => (
                <RunRow key={run.id} run={run} index={idx} total={runs.length} />
              ))}
            </tbody>
            {runs.length > 1 && (
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
                  <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">{totalLeads.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  )
}
