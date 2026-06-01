'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Sparkles, Database, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react'
import LeadsTable from '../../components/LeadsTable'
import { fetchLeads, clearAllLeads, type Lead } from '../../lib/api'

function ConfirmModal({
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full sm:max-w-md bg-white dark:bg-[#161b27] rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6">
        <div className="sm:hidden w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-5" />

        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Clear all leads?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              This will permanently delete all <span className="font-semibold text-slate-700 dark:text-slate-300">{count.toLocaleString()} lead{count !== 1 ? 's' : ''}</span> from your database. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-md shadow-rose-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting…' : 'Yes, clear all'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setLeads(await fetchLeads()) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleClearAll() {
    setClearing(true)
    try {
      await clearAllLeads()
      setLeads([])
      setShowConfirm(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Database</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Leads</h1>
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {loading ? 'Loading…' : `${leads.length.toLocaleString()} leads · select rows to download`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {leads.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear all</span>
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

      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm">
        {loading && leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading leads…</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Fetching from database</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <LeadsTable leads={leads} />
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          count={leads.length}
          onConfirm={handleClearAll}
          onCancel={() => setShowConfirm(false)}
          loading={clearing}
        />
      )}
    </div>
  )
}
