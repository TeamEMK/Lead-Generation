'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Zap, AlertCircle, CheckCircle2, Loader2, Hash, Mail,
  Clock, Coins, PauseCircle, Tag, ArrowRight,
} from 'lucide-react'
import { useGeneration } from '../context/GenerationContext'

function fmtTime(ms: number) {
  const s = Math.ceil(ms / 1000)
  if (s <= 0) return '0s'
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

export default function GeneratorForm() {
  const router = useRouter()
  const { loading, elapsed, progress, result, paused, error, generate } = useGeneration()
  const [keywords, setKeywords] = useState('')
  const [scrapeEmails, setScrapeEmails] = useState(false)

  const keywordList = keywords.split(/[\n,]/).map(k => k.trim()).filter(Boolean)
  const keywordCount = keywordList.length

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (keywordList.length === 0) return
    generate(keywordList, scrapeEmails)
  }

  const barPct = progress
    ? Math.min(((progress.index + (progress.phase === 'done' ? 1 : 0.5)) / progress.total) * 100, 98)
    : 0

  return (
    <form id="generate-form" onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5">

      {/* Keywords */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Keywords</label>
          {keywordCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-500/20">
              <Hash className="w-3 h-3" />{keywordCount} keyword{keywordCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">one per line or comma</span>
          )}
        </div>
        <textarea
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder={[
            '# Single city — any country',
            'hotels in Mumbai',
            'restaurants in Dubai',
            'clinics in New York',
            'salons in London',
            '',
            '# Multiple cities (comma-separated)',
            'hotels in Mumbai, Delhi, Bangalore',
            'restaurants in Paris, Berlin, Rome',
            '',
            '# State / province / country',
            'hotels in Maharashtra',
            'car dealers in California',
            'IT companies in India',
          ].join('\n')}
          disabled={loading || !!paused}
          className="flex-1 w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm font-mono resize-none transition-colors leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="mt-2 space-y-1">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            One per line · works for <span className="font-semibold text-slate-500 dark:text-slate-400">any city, state, or country worldwide</span> · comma-separate for multiple cities
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            1 token per lead saved · duplicates auto-skipped
          </p>
        </div>
      </div>



      {/* Email scraping toggle */}
      <div
        onClick={() => !loading && !paused && setScrapeEmails(v => !v)}
        className={`flex items-start gap-3 p-4 rounded-xl border transition-all select-none ${
          loading || paused ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          scrapeEmails
            ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30'
            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.12]'
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          scrapeEmails ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400'
            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500'
        }`}>
          <Mail className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${scrapeEmails ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>
              Scrape emails from websites
            </p>
            <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${scrapeEmails ? 'bg-brand-500' : 'bg-slate-200 dark:bg-white/[0.12]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${scrapeEmails ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Visits each business website to find email addresses. Adds time per lead.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && !paused && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {error.startsWith('INSUFFICIENT_TOKENS:')
              ? error.replace('INSUFFICIENT_TOKENS:', '')
              : error}
          </span>
        </div>
      )}

      {/* ── PAUSED STATE ── */}
      {paused && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-3 p-4 border-b border-amber-200 dark:border-amber-500/20">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <PauseCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Generation paused — tokens exhausted</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {paused.savedSoFar} leads saved · {paused.remainingKeywords.length} keyword{paused.remainingKeywords.length !== 1 ? 's' : ''} remaining
              </p>
            </div>
          </div>

          {/* Remaining keywords */}
          <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-500/20">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">Pending keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {paused.remainingKeywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                  <Tag className="w-2.5 h-2.5" />{kw}
                </span>
              ))}
            </div>
          </div>

          {/* Redirect to billing */}
          <div className="p-4">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-3">Renew your plan to continue</p>
            <button
              type="button"
              onClick={() => router.push('/select-plan')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-sm font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              Renew Plan to Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {result && !paused && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {result.saved} new lead{result.saved !== 1 ? 's' : ''} saved
          </div>
          {result.skipped > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-500 ml-6">
              {result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped
            </p>
          )}
          <div className="flex items-center gap-1.5 ml-6 text-xs text-slate-400 dark:text-slate-500">
            <Coins className="w-3 h-3" />
            {result.tokenBalance.toLocaleString()} tokens remaining
          </div>
        </div>
      )}

      {/* Live progress */}
      {loading && (
        <div className="space-y-2.5">
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-700 ease-out"
              style={{ width: `${barPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500 flex-shrink-0" />
              <span className="truncate">
                {progress
                  ? `${progress.phase === 'scraping' ? 'Scraping emails for' : 'Searching'} ${progress.index + 1}/${progress.total}: ${progress.keyword}`
                  : 'Starting search…'}
              </span>
            </div>
            <div className="flex items-center gap-1 tabular font-medium flex-shrink-0">
              <Clock className="w-3 h-3" />{elapsed}s
            </div>
          </div>
          {progress && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{progress.totalSoFar}</span> leads found
              </span>
              {progress.etaMs > 0 && (
                <span className="text-slate-400 dark:text-slate-500">~{fmtTime(progress.etaMs)} left</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generate / disabled when paused */}
      {!paused && (
        <button
          type="submit"
          disabled={loading}
          className="mt-auto w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 active:from-brand-700 active:to-navy-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-md shadow-brand-500/20 text-sm"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
            : <><Zap className="w-4 h-4" />Generate Leads</>}
        </button>
      )}
    </form>
  )
}
