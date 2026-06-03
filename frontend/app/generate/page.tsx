'use client'

import { useEffect, useState } from 'react'
import {
  Zap, Sparkles, Search, Database,
  CheckCircle2, Lightbulb, ArrowRight, Download, Coins,
} from 'lucide-react'
import Link from 'next/link'
import GeneratorForm from '../../components/GeneratorForm'
import LeadsTable from '../../components/LeadsTable'
import { useGeneration } from '../../context/GenerationContext'
import { fetchTokenBalance } from '../../lib/api'
import type { Lead } from '../../lib/api'

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
  a.href = url
  a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const HOW_IT_WORKS = [
  { step: '01', icon: Search,   title: 'Enter keywords', desc: 'Type business categories you want to target — one per line or comma-separated.', color: 'indigo' },
  { step: '02', icon: Search,   title: 'We search Maps',  desc: 'Our engine fetches every result from Google Maps for each keyword.', color: 'violet' },
  { step: '03', icon: Database, title: 'Auto-saved',      desc: 'Leads save instantly to your database. Duplicates are skipped automatically.', color: 'emerald' },
]

const TIPS = [
  'Use simple category names like "hotel" or "hospital" — not full sentences',
  'Add a city to your keyword (e.g. "dentist Mumbai") for local results',
  'Run the same keywords across different cities to scale up quickly',
  'Leads with a website are easiest to find contact info for',
  'Comma-separate cities to search multiple locations in one go',
  'Enable email scraping only when you need contacts — it adds time per lead',
  'Export to CSV after each run so you always have a fresh backup',
]

export default function GeneratePage() {
  const { leads, result, liveTokenBalance } = useGeneration()
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)

  useEffect(() => {
    fetchTokenBalance().then(setTokenBalance).catch(() => {})
  }, [])

  useEffect(() => {
    if (liveTokenBalance !== null) setTokenBalance(liveTokenBalance)
  }, [liveTokenBalance])

  return (
    <div className="flex flex-col flex-1 gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Generator</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Generate Leads</h1>
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:block">
            Search Google Maps by keyword — leads save automatically to your database
          </p>
        </div>

        <Link href="/subscription" className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
          tokenBalance !== null && tokenBalance < 100
            ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
            : 'border-brand-100 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400'
        } hover:opacity-80`}>
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{tokenBalance === null ? '…' : tokenBalance.toLocaleString()}</span>
          <span className="hidden sm:inline text-current opacity-60">tokens</span>
        </Link>
      </div>

      {/* Two-column on desktop, stacked on mobile */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 lg:gap-6 lg:items-stretch">

        {/* Form card */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/[0.04] flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-sm shadow-brand-500/20 flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Lead Generator</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Powered by Google Maps</p>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <GeneratorForm />
          </div>
        </div>

        {/* Right panel */}
        <div className="min-w-0 overflow-hidden flex flex-col">
          {leads.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {leads.length} leads found
                </span>
                <button
                  onClick={() => downloadCSV(leads)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm shadow-brand-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm p-4">
                <LeadsTable leads={leads} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 gap-4">
              {/* How it works */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">How it works</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Three steps to your first batch of leads</p>
                </div>
                <div className="flex flex-col flex-1 divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, color }) => (
                    <div key={step} className="flex-1 flex items-center gap-4 px-5 py-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        color === 'indigo' ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-500'
                        : color === 'violet' ? 'bg-navy-50 dark:bg-navy-500/10 text-navy-500'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold tracking-widest text-slate-300 dark:text-slate-600">{step}</span>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700 flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro tips */}
              <div className="flex-1 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Pro tips</h2>
                </div>
                <ul className="flex flex-col flex-1 divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {TIPS.map((tip, i) => (
                    <li key={i} className="flex-1 flex items-center gap-3 px-5 py-3.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
