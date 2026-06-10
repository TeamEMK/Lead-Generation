'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { fetchLeads, fetchRunLeads } from '../lib/api'
import type { Lead } from '../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export type ProgressState = {
  index: number
  total: number
  keyword: string
  phase: string
  totalSoFar: number
  etaMs: number
}

export type PausedState = {
  remainingKeywords: string[]
  savedSoFar: number
  tokenBalance: number
  scrapeEmails: boolean
  reason: 'tokens' | 'network'
  runId: number | null
}

export type ActiveRunState = {
  runId: number
  keywords: string[]
  totalFound: number
  tokenBalance: number
  startedAt: string
}

interface GenerationContextValue {
  loading: boolean
  elapsed: number
  progress: ProgressState | null
  result: { saved: number; skipped: number; tokenBalance: number } | null
  paused: PausedState | null
  leads: Lead[]
  error: string | null
  liveTokenBalance: number | null
  activeRun: ActiveRunState | null
  generate: (keywords: string[], scrapeEmails: boolean) => void
  resume: () => void
  clear: () => void
  stop: () => void
  dismissActiveRun: () => void
}

const GenerationContext = createContext<GenerationContextValue | null>(null)

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [result, setResult] = useState<{ saved: number; skipped: number; tokenBalance: number } | null>(null)
  const [paused, setPaused] = useState<PausedState | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [error, setError] = useState<string | null>(null)
  const [liveTokenBalance, setLiveTokenBalance] = useState<number | null>(null)
  const [activeRun, setActiveRun] = useState<ActiveRunState | null>(null)

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const startRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCompletedIdxRef = useRef(-1)
  const totalSavedRef = useRef(0)
  const runIdRef = useRef<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Show only THIS run's leads in the generator panel (not the whole account).
  // Falls back to all leads if the run id is unknown.
  const loadRunLeads = useCallback((runId?: number | null) => {
    const rid = runId ?? runIdRef.current
    if (rid) {
      fetchRunLeads(rid).then(d => setLeads(d.leads)).catch(() => {})
    } else {
      fetchLeads().then(setLeads).catch(() => {})
    }
  }, [])

  // Elapsed timer for active SSE generation
  useEffect(() => {
    if (loading) {
      startRef.current = Date.now()
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  // Cancel SSE reader on unmount
  useEffect(() => {
    return () => { readerRef.current?.cancel().catch(() => {}) }
  }, [])

  // On mount: check if a run is active in the background (e.g. after browser refresh)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API_URL}/api/leads/active`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.active) {
          setActiveRun({
            runId: data.runId,
            keywords: data.keywords,
            totalFound: data.totalFound,
            tokenBalance: data.tokenBalance,
            startedAt: data.startedAt,
          })
        }
      })
      .catch(() => {})
  }, [])

  // Poll for active run progress every 3s
  useEffect(() => {
    if (!activeRun) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    const runId = activeRun.runId
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/api/leads/active`, { headers: authHeaders() })
        if (!r.ok) return
        const data = await r.json()
        if (data.active && data.runId === runId) {
          setActiveRun(prev => prev ? { ...prev, totalFound: data.totalFound, tokenBalance: data.tokenBalance } : null)
        } else {
          // Run finished — fetch leads and show result
          clearInterval(pollRef.current!); pollRef.current = null
          setActiveRun(null)
          loadRunLeads(runId)
        }
      } catch {}
    }, 3000)
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [activeRun?.runId])

  const stop = useCallback(async () => {
    const runId = runIdRef.current
    if (!runId) {
      readerRef.current?.cancel().catch(() => {})
      setLoading(false); setProgress(null)
      return
    }
    try {
      await fetch(`${API_URL}/api/leads/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ runId }),
      })
    } catch {}
    // SSE cancelled event will fire and clean up state
  }, [])

  const dismissActiveRun = useCallback(() => {
    // Cancel the backend run if it's still running
    if (activeRun) {
      fetch(`${API_URL}/api/leads/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ runId: activeRun.runId }),
      }).catch(() => {})
    }
    setActiveRun(null)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [activeRun])

  const _run = useCallback(async (keywords: string[], scrapeEmails: boolean, retryCount = 0, keepRunId = false) => {
    if (retryCount === 0) {
      setActiveRun(null)
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      setLoading(true)
      setError(null)
      setPaused(null)
      setProgress(null)
      setLiveTokenBalance(null)
      lastCompletedIdxRef.current = -1
      totalSavedRef.current = 0
      if (!keepRunId) runIdRef.current = null
    }

    let shouldRetry = false
    let retryDelaySec = 0
    let retryKeywords = keywords

    try {
      const res = await fetch(`${API_URL}/api/leads/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ keywords, scrapeEmails, ...(runIdRef.current ? { runId: runIdRef.current } : {}) }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        if (res.status === 402) throw new Error('INSUFFICIENT_TOKENS:' + (data.error || ''))
        throw new Error(data.error || 'Failed to generate leads')
      }

      const reader = res.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let evt: any
          try { evt = JSON.parse(line.slice(6)) } catch { continue }

          if (evt.type === 'started') {
            runIdRef.current = evt.runId
          } else if (evt.type === 'token_update') {
            setLiveTokenBalance(evt.tokenBalance)
          } else if (evt.type === 'cell_progress') {
            setProgress(p => p ? { ...p, totalSoFar: evt.partialCount } : p)
          } else if (evt.type === 'searching') {
            setProgress({ index: evt.index, total: evt.total, keyword: evt.keyword, phase: 'searching', totalSoFar: 0, etaMs: 0 })
          } else if (evt.type === 'scraping') {
            setProgress(p => p ? { ...p, phase: 'scraping' } : p)
          } else if (evt.type === 'keyword_done') {
            lastCompletedIdxRef.current = evt.index
            totalSavedRef.current = evt.totalSoFar
            setProgress({ index: evt.index, total: evt.total, keyword: evt.keyword, phase: 'done', totalSoFar: evt.totalSoFar, etaMs: evt.etaMs })
            if (evt.tokenBalance !== undefined) setLiveTokenBalance(evt.tokenBalance)
          } else if (evt.type === 'keyword_error') {
            setProgress(p => p ? { ...p, phase: 'error' } : p)
          } else if (evt.type === 'token_exhausted') {
            loadRunLeads()
            setPaused({
              remainingKeywords: evt.remainingKeywords ?? [],
              savedSoFar: evt.savedSoFar ?? 0,
              tokenBalance: evt.tokenBalance ?? 0,
              scrapeEmails,
              reason: 'tokens',
              runId: runIdRef.current,
            })
            setProgress(null)
          } else if (evt.type === 'done') {
            setResult({ saved: evt.saved, skipped: evt.skipped, tokenBalance: evt.tokenBalance ?? 0 })
            setLiveTokenBalance(evt.tokenBalance ?? 0)
            loadRunLeads()
            setProgress(null)
            setPaused(null)
          } else if (evt.type === 'cancelled') {
            setResult({ saved: evt.savedSoFar, skipped: 0, tokenBalance: evt.tokenBalance ?? 0 })
            setLiveTokenBalance(evt.tokenBalance ?? 0)
            loadRunLeads()
            setProgress(null)
            setPaused(null)
          } else if (evt.type === 'error') {
            setError(evt.message)
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // intentional cancel
      } else if (!err.message?.startsWith('INSUFFICIENT_TOKENS') && retryCount < 3) {
        const delaySec = Math.pow(2, retryCount)
        setError(`Network issue — retrying in ${delaySec}s… (attempt ${retryCount + 1}/3)`)
        shouldRetry = true
        retryDelaySec = delaySec
        const nextIdx = lastCompletedIdxRef.current + 1
        if (nextIdx > 0 && nextIdx < keywords.length) {
          retryKeywords = keywords.slice(nextIdx)
          lastCompletedIdxRef.current = -1
        }
      } else if (!err.message?.startsWith('INSUFFICIENT_TOKENS')) {
        const nextIdx = lastCompletedIdxRef.current + 1
        const remaining = nextIdx > 0 && nextIdx < keywords.length ? keywords.slice(nextIdx) : keywords
        loadRunLeads()
        setPaused({
          remainingKeywords: remaining,
          savedSoFar: totalSavedRef.current,
          tokenBalance: 0,
          scrapeEmails,
          reason: 'network',
          runId: runIdRef.current,
        })
        setError(null)
      } else {
        setError(err.message)
      }
    } finally {
      if (!shouldRetry) {
        setLoading(false)
        readerRef.current = null
      }
    }

    if (shouldRetry) {
      await new Promise(r => setTimeout(r, retryDelaySec * 1000))
      setError(null)
      return _run(retryKeywords, scrapeEmails, retryCount + 1)
    }
  }, [])

  const generate = useCallback((keywords: string[], scrapeEmails: boolean) => {
    setResult(null)
    setLeads([])
    _run(keywords, scrapeEmails)
  }, [_run])

  const resume = useCallback(() => {
    if (!paused) return
    let { remainingKeywords } = paused
    const { scrapeEmails, runId: pausedRunId } = paused
    if (remainingKeywords.length === 0) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('savedKeywords') ?? '' : ''
      remainingKeywords = saved.split(/[\n,]/).map(k => k.trim()).filter(Boolean)
    }
    if (remainingKeywords.length === 0) return
    // Restore the original runId so the backend reuses the same history entry
    runIdRef.current = pausedRunId
    setPaused(null)
    _run(remainingKeywords, scrapeEmails, 0, true)
  }, [paused, _run])

  const clear = useCallback(() => {
    readerRef.current?.cancel()
    setLoading(false)
    setProgress(null)
    setResult(null)
    setPaused(null)
    setLeads([])
    setError(null)
    setElapsed(0)
  }, [])

  return (
    <GenerationContext.Provider value={{ loading, elapsed, progress, result, paused, leads, error, liveTokenBalance, activeRun, generate, resume, clear, stop, dismissActiveRun }}>
      {children}
    </GenerationContext.Provider>
  )
}

export function useGeneration() {
  const ctx = useContext(GenerationContext)
  if (!ctx) throw new Error('useGeneration must be used within GenerationProvider')
  return ctx
}
