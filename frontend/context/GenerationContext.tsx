'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { Lead } from '../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

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
}

interface GenerationContextValue {
  loading: boolean
  elapsed: number
  progress: ProgressState | null
  result: { saved: number; skipped: number; tokenBalance: number } | null
  paused: PausedState | null
  leads: Lead[]
  error: string | null
  generate: (keywords: string[], scrapeEmails: boolean) => void
  resume: () => void
  clear: () => void
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

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const startRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const _run = useCallback(async (keywords: string[], scrapeEmails: boolean) => {
    setLoading(true)
    setError(null)
    setPaused(null)
    setProgress(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const res = await fetch(`${API_URL}/api/leads/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ keywords, scrapeEmails }),
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

          if (evt.type === 'cell_progress') {
            setProgress(p => p ? { ...p, totalSoFar: evt.partialCount } : p)
          } else if (evt.type === 'searching') {
            setProgress({ index: evt.index, total: evt.total, keyword: evt.keyword, phase: 'searching', totalSoFar: 0, etaMs: 0 })
          } else if (evt.type === 'scraping') {
            setProgress(p => p ? { ...p, phase: 'scraping' } : p)
          } else if (evt.type === 'keyword_done') {
            setProgress({ index: evt.index, total: evt.total, keyword: evt.keyword, phase: 'done', totalSoFar: evt.totalSoFar, etaMs: evt.etaMs })
            if (evt.tokenBalance !== undefined) {
              // live balance update mid-stream
            }
          } else if (evt.type === 'keyword_error') {
            setProgress(p => p ? { ...p, phase: 'error' } : p)
          } else if (evt.type === 'token_exhausted') {
            // Pause state — store remaining keywords for resume
            setLeads(prev => {
              const newLeads = (evt.leads ?? []).map((l: any, i: number) => ({ ...l, id: i + 1 }))
              return newLeads.length > 0 ? newLeads : prev
            })
            setPaused({
              remainingKeywords: evt.remainingKeywords ?? [],
              savedSoFar: evt.savedSoFar ?? 0,
              tokenBalance: evt.tokenBalance ?? 0,
              scrapeEmails,
            })
            setProgress(null)
          } else if (evt.type === 'done') {
            setResult({ saved: evt.saved, skipped: evt.skipped, tokenBalance: evt.tokenBalance ?? 0 })
            setLeads((evt.leads ?? []).map((l: any, i: number) => ({ ...l, id: i + 1 })))
            setProgress(null)
            setPaused(null)
          } else if (evt.type === 'error') {
            setError(evt.message)
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setLoading(false)
      readerRef.current = null
    }
  }, [])

  const generate = useCallback((keywords: string[], scrapeEmails: boolean) => {
    setResult(null)
    setLeads([])
    _run(keywords, scrapeEmails)
  }, [_run])

  const resume = useCallback(() => {
    if (!paused || paused.remainingKeywords.length === 0) return
    const { remainingKeywords, scrapeEmails } = paused
    setPaused(null)
    _run(remainingKeywords, scrapeEmails)
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
    <GenerationContext.Provider value={{ loading, elapsed, progress, result, paused, leads, error, generate, resume, clear }}>
      {children}
    </GenerationContext.Provider>
  )
}

export function useGeneration() {
  const ctx = useContext(GenerationContext)
  if (!ctx) throw new Error('useGeneration must be used within GenerationProvider')
  return ctx
}
