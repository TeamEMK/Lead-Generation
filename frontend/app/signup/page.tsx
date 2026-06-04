'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 dark:focus:border-brand-500 transition-all"

export default function SignupPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [gst, setGst] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\d{10}$/.test(phone)) { setError('Mobile number must be exactly 10 digits'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    // Store form data — account is NOT created yet, only after plan selection/payment
    sessionStorage.setItem('pending_signup', JSON.stringify({
      name, email, password, phone, city, businessName, gst: gst || undefined,
    }))
    setLoading(true)
    router.push('/select-plan')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#080c12]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/8 dark:bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-navy-500/8 dark:bg-navy-500/5 blur-3xl" />
      </div>

      {/* Logo */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center group">
          <img src="/logo.png" alt="e-Marketing" className="h-9 w-auto group-hover:opacity-90 transition-opacity" />
        </Link>
        <a
          href="https://www.e-marketing.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors font-medium"
        >
          e-marketing.io ↗
        </a>
      </header>

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div className="w-full max-w-[480px]">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create your account</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Powered by{' '}
              <a href="https://www.e-marketing.io" target="_blank" rel="noopener noreferrer" className="text-brand-500 font-semibold hover:underline">
                e-marketing.io
              </a>
              {' '}· Start generating leads today
            </p>
          </div>

          <div className="bg-white dark:bg-[#141c32] rounded-2xl border border-slate-200 dark:border-white/[0.07] shadow-xl shadow-black/5 dark:shadow-black/30 p-6 sm:p-7">
            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Full name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="John Doe" className={inputCls} />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputCls} />
              </div>

              {/* Mobile */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Mobile number</label>
                  <span className={`text-xs font-medium tabular ${phone.length === 10 ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {phone.length}/10
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center px-3.5 py-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.06] text-sm font-semibold text-slate-600 dark:text-slate-300 select-none flex-shrink-0">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel" required value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    className={`${inputCls} ${phone.length > 0 && phone.length < 10 ? 'border-amber-300 dark:border-amber-500/40 focus:ring-amber-400/40' : phone.length === 10 ? 'border-emerald-300 dark:border-emerald-500/40 focus:ring-emerald-400/40' : ''}`}
                  />
                </div>
              </div>

              {/* City + Business Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">City</label>
                  <input type="text" required value={city} onChange={e => setCity(e.target.value)}
                    placeholder="Jaipur" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Business name</label>
                  <input type="text" required value={businessName} onChange={e => setBusinessName(e.target.value)}
                    placeholder="My Agency" className={inputCls} />
                </div>
              </div>

              {/* GST (optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">GST number</label>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Optional</span>
                </div>
                <input type="text" value={gst} onChange={e => setGst(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5" maxLength={15}
                  className={inputCls} />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required minLength={8} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={`${inputCls} pr-11`}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 mt-1">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <><span>Create account</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
            A product of{' '}
            <a href="https://www.e-marketing.io" target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 transition-colors">
              e-marketing.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
