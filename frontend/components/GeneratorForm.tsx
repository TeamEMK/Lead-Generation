'use client'

import { useState } from 'react'
import { Zap, AlertCircle, CheckCircle2, Loader2, Hash, Mail, Clock } from 'lucide-react'
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
  const { loading, elapsed, progress, result, error, generate } = useGeneration()
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
    <form id="generate-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Keywords */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Keywords</label>
          {keywordCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
              <Hash className="w-3 h-3" />
              {keywordCount} keyword{keywordCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">one per line or comma-separated</span>
          )}
        </div>
        <textarea
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder={"hotel\nhospital\nhome furnishing store\nresort"}
          rows={10}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono resize-none transition-colors leading-relaxed"
        />
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          Fetches all available results · duplicates are auto-skipped
        </p>
      </div>

      {/* Email scraping toggle */}
      <div
        onClick={() => setScrapeEmails(v => !v)}
        className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none ${
          scrapeEmails
            ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30'
            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.12]'
        }`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          scrapeEmails
            ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500'
        }`}>
          <Mail className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${scrapeEmails ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
              Scrape emails from websites
            </p>
            <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${scrapeEmails ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-white/[0.12]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${scrapeEmails ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Visits each business website to find email addresses. Adds time per lead.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {result.saved} new lead{result.saved !== 1 ? 's' : ''} saved to Google Sheets
          </div>
          {result.skipped > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 ml-6">
              {result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped
            </p>
          )}
        </div>
      )}

      {/* Live progress */}
      {loading && (
        <div className="space-y-3">
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out"
              style={{ width: `${barPct}%` }}
            />
          </div>
          <div className="flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 flex-shrink-0" />
              <span className="truncate">
                {progress?.phase === 'saving'
                  ? 'Saving to Google Sheets…'
                  : progress
                    ? `${progress.phase === 'scraping' ? 'Scraping emails' : 'Searching'} ${progress.index + 1}/${progress.total}: ${progress.keyword}`
                    : 'Starting…'}
              </span>
            </div>
            <div className="flex items-center gap-1 tabular font-medium flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>{elapsed}s elapsed</span>
            </div>
          </div>
          {progress && progress.phase !== 'saving' && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{progress.totalSoFar}</span> leads found so far
              </span>
              {progress.etaMs > 0 && (
                <span className="text-slate-400 dark:text-slate-500">~{fmtTime(progress.etaMs)} remaining</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:from-indigo-700 active:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20 text-sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Generate Leads
          </>
        )}
      </button>

    </form>
  )
}
