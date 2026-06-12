'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { verifyAdminToken } from '../../lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const ok = await verifyAdminToken(token.trim())
      if (!ok) { setError('Invalid admin token'); setLoading(false); return }
      localStorage.setItem('admin_token', token.trim())
      router.push('/dashboard')
    } catch {
      setError('Could not reach server')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-4">
            <Lock className="w-6 h-6 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Admin Access</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your admin token to continue</p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Admin Token</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Enter your admin token"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all"
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || !token.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-[var(--text)] font-semibold text-sm transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
