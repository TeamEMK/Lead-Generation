'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, TrendingUp, Calendar, Phone, Globe, RefreshCw, CalendarDays,
  Sparkles, Coins, Zap, CheckCircle2, X, Loader2, ArrowUpRight,
} from 'lucide-react'
import StatsCard from '../../components/StatsCard'
import AnalyticsChart from '../../components/AnalyticsChart'
import { fetchAnalytics, fetchTokenBalance, fetchPlans, purchasePlan, type Analytics, type Plan } from '../../lib/api'

function PricingModal({ onClose, onPurchase }: { onClose: () => void; onPurchase: (balance: number) => void }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans().then(setPlans).catch(() => setError('Failed to load plans')).finally(() => setLoading(false))
  }, [])

  async function handleBuy(plan: Plan) {
    setPurchasing(plan.id)
    setError(null)
    try {
      const res = await purchasePlan(plan.id)
      onPurchase(res.balance)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-[#161b27] rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-white/[0.08] shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="sm:hidden w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-5" />

        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Recharge</p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Choose a plan</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">1 token = 1 lead. Tokens never expire.</p>
          </div>
          <button onClick={onClose} className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                plan.popular
                  ? 'border-indigo-400 dark:border-indigo-500/60 bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-500/10 dark:to-transparent shadow-lg shadow-indigo-500/10'
                  : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]'
              }`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white tracking-wider shadow-sm">
                    BEST VALUE
                  </span>
                )}
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${plan.popular ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}>{plan.name}</p>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">₹{plan.price_inr.toLocaleString()}</p>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400 text-sm">
                    <Coins className="w-4 h-4" />{plan.tokens.toLocaleString()} tokens
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">₹{plan.price_per_token}/token</p>
                  {['Never expires', 'Deduplication included'].map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />{f}
                    </div>
                  ))}
                </div>
                <button onClick={() => handleBuy(plan)} disabled={purchasing !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-700 dark:hover:bg-slate-100'
                  }`}>
                  {purchasing === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {purchasing === plan.id ? 'Processing…' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPricing, setShowPricing] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [a, b] = await Promise.all([fetchAnalytics(), fetchTokenBalance()])
      setAnalytics(a); setTokenBalance(b)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const isLow = tokenBalance !== null && tokenBalance < 100

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Overview</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5">{today}</p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          {error} — make sure the backend is running.
        </div>
      )}

      {/* Token Balance Banner */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${
        isLow
          ? 'border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5'
          : 'border-indigo-100 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/5'
      }`}>
        {/* Background decoration */}
        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20 ${isLow ? 'bg-amber-300 dark:bg-amber-500' : 'bg-indigo-300 dark:bg-indigo-500'}`} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              isLow ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-indigo-100 dark:bg-indigo-500/20'
            }`}>
              <Coins className={`w-6 h-6 sm:w-7 sm:h-7 ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Token Balance</p>
              {tokenBalance === null ? (
                <div className="h-8 w-28 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse" />
              ) : (
                <p className={`text-3xl sm:text-4xl font-extrabold tabular leading-none ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {tokenBalance.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                {isLow ? '⚠️ Running low — recharge soon' : '1 token = 1 lead saved · never expires'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPricing(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Zap className="w-4 h-4" />
            Recharge Tokens
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      {loading && !analytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[100px] sm:h-[120px] rounded-2xl bg-slate-100 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatsCard title="Total Leads"  value={analytics?.total ?? 0}     subtitle="All time"        icon={Users}       color="indigo"  />
          <StatsCard title="Today"        value={analytics?.today ?? 0}     subtitle="Generated today" icon={TrendingUp}  color="emerald" />
          <StatsCard title="This Week"    value={analytics?.thisWeek ?? 0}  subtitle="Last 7 days"     icon={Calendar}    color="amber"   />
          <StatsCard title="This Month"   value={analytics?.thisMonth ?? 0} subtitle="Last 30 days"    icon={CalendarDays} color="rose"   />
          <StatsCard title="With Phone"
            value={analytics?.withPhone ?? 0}
            subtitle={analytics && analytics.total > 0 ? `${Math.round((analytics.withPhone / analytics.total) * 100)}% contactable` : '—'}
            icon={Phone} color="violet"
          />
          <StatsCard title="With Website"
            value={analytics?.withWebsite ?? 0}
            subtitle={analytics && analytics.total > 0 ? `${Math.round((analytics.withWebsite / analytics.total) * 100)}% have web` : '—'}
            icon={Globe} color="sky"
          />
        </div>
      )}

      {/* Chart */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-white/[0.04]">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Leads Over Time</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Daily breakdown · last 30 days</p>
          </div>
          {analytics && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 whitespace-nowrap">
              {analytics.thisMonth} this month
            </span>
          )}
        </div>
        <div className="p-4 sm:p-6">
          <AnalyticsChart data={analytics?.chartData ?? []} />
        </div>
      </div>

      {showPricing && (
        <PricingModal
          onClose={() => setShowPricing(false)}
          onPurchase={(balance) => { setTokenBalance(balance); setShowPricing(false) }}
        />
      )}
    </div>
  )
}
