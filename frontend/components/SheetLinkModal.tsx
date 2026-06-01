'use client'

import { useState, useEffect, FormEvent } from 'react'
import { X, CheckCircle2, ExternalLink, Loader2, Link2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

interface Props {
  onClose: () => void
}

export default function SheetLinkModal({ onClose }: Props) {
  const { user, updateSheet, refreshUser } = useAuth()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const googleConnected = user?.google_connected ?? false

  // Listen for OAuth popup success
  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'google_connected') {
        await refreshUser()
        setConnectingGoogle(false)
      } else if (e.data?.type === 'google_error') {
        setError('Google connection failed. Please try again.')
        setConnectingGoogle(false)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [refreshUser])

  async function handleConnectGoogle() {
    setError(null)
    setConnectingGoogle(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/auth/google/url`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get OAuth URL')

      const popup = window.open(data.url, 'google_oauth', 'width=520,height=620,scrollbars=yes')
      if (!popup) {
        setError('Popup blocked. Please allow popups for this site.')
        setConnectingGoogle(false)
      }
    } catch (err: any) {
      setError(err.message)
      setConnectingGoogle(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await updateSheet(url)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {user?.spreadsheet_id ? 'Change Google Sheet' : 'Link your Google Sheet'}
            </h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              {googleConnected
                ? 'Your Google account is connected. Just paste the sheet URL.'
                : 'Connect your Google account for instant access — no sharing required.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Connect Google */}
        <div className={`rounded-xl border p-4 space-y-3 transition-all ${
          googleConnected
            ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10'
            : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                googleConnected
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 text-white'
              }`}>
                {googleConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {googleConnected ? 'Google account connected' : 'Connect your Google account'}
              </span>
            </div>
          </div>

          {!googleConnected && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 ml-8 leading-relaxed">
                We'll request access to Google Sheets only. You keep full control of your data.
              </p>
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={connectingGoogle}
                className="ml-8 flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.1] disabled:opacity-60 transition-all shadow-sm"
              >
                {connectingGoogle
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                }
                {connectingGoogle ? 'Connecting…' : 'Connect with Google'}
              </button>
            </>
          )}
        </div>

        {/* Step 2: Paste sheet URL */}
        <div className={`rounded-xl border p-4 space-y-3 transition-all ${
          googleConnected
            ? 'border-slate-200 dark:border-white/[0.08]'
            : 'border-slate-100 dark:border-white/[0.04] opacity-50 pointer-events-none'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              googleConnected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-white/[0.1] text-slate-500'
            }`}>
              2
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Paste your sheet URL</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 ml-8">
            <input
              type="url"
              required
              disabled={!googleConnected}
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all disabled:opacity-50"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              The sheet must belong to the Google account you connected above.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={loading || !url || !googleConnected}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Verifying…' : 'Link sheet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
