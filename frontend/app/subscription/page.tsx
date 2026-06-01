'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CreditCard, Coins, Zap, CheckCircle2, RefreshCw,
  TrendingDown, TrendingUp, Calendar, X, Loader2, Star,
} from 'lucide-react'
import { fetchSubscription, fetchPlans, purchasePlan, type Subscription, type Plan } from '../../lib/api'

function PricingModal({ onClose, onPurchase }: { onClose: () => void; onPurchase: (s: Subscription) => void }) {
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
      await purchasePlan(plan.id)
      const updated = await fetchSubscription()
      onPurchase(updated)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all">
          <X className="w-4 h-4" />
        </button>
        <div className="mb-6">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Recharge</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Buy more tokens</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">1 token = 1 lead saved. Tokens are additive — they stack on your balance.</p>
        </div>
        {error && <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">{error}</div>}
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${plan.popular ? 'border-indigo-400 dark:border-indigo-500/60 bg-indigo-50 dark:bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]'}`}>
                {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white tracking-wider">BEST VALUE</span>}
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</p>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">₹{plan.price_inr.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  <Coins className="w-4 h-4" />{plan.tokens.toLocaleString()} tokens
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">₹{plan.price_per_token}/token</p>
                <button onClick={() => handleBuy(plan)} disabled={purchasing !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/25 disabled:opacity-60' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-700 dark:hover:bg-slate-100 disabled:opacity-60'}`}>
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

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRecharge, setShowRecharge] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setSub(await fetchSubscription()) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const isLow = sub !== null && sub.balance < 100

  const totalPurchased = sub?.subscriptions.reduce((a, s) => a + s.tokens_purchased, 0) ?? 0
  const totalUsed = sub?.transactions.filter(t => t.type === 'usage').reduce((a, t) => a + Math.abs(t.amount), 0) ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Billing</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Your plan, token balance, and purchase history</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowRecharge(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/25 transition-all">
            <Zap className="w-3.5 h-3.5" /> Buy Tokens
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">{error}</div>}

      {loading && !sub ? (
        <div className="flex items-center justify-center h-48"><RefreshCw className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : (
        <>
          {/* Current plan + balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active plan */}
            <div className={`rounded-2xl border p-6 ${sub?.active_plan ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161b27]'}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Active Plan</p>
                  {sub?.active_plan ? (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{sub.active_plan.name}</h2>
                      {sub.active_plan.popular && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                          <Star className="w-2.5 h-2.5" /> Popular
                        </span>
                      )}
                    </div>
                  ) : (
                    <h2 className="text-lg font-semibold text-slate-500 dark:text-slate-400">No plan selected</h2>
                  )}
                </div>
                {sub?.active_plan && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              {sub?.active_plan ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Price paid</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹{sub.active_plan.price_inr.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Tokens included</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{sub.active_plan.tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Rate</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹{sub.active_plan.price_per_token}/token</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Purchase a plan to start generating leads.
                </p>
              )}
              {!sub?.active_plan && (
                <button onClick={() => setShowRecharge(true)} className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all">
                  Choose a plan
                </button>
              )}
            </div>

            {/* Token balance */}
            <div className={`rounded-2xl border p-6 ${isLow ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161b27]'}`}>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Token Balance</p>
              <p className={`text-4xl font-extrabold tabular mb-1 ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {(sub?.balance ?? 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">
                {isLow ? 'Running low — consider recharging' : 'tokens available · 1 token = 1 lead'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-100 dark:bg-white/[0.05] p-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total bought</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{totalPurchased.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-slate-100 dark:bg-white/[0.05] p-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Total used</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{totalUsed.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase history */}
          {sub && sub.subscriptions.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Purchase History</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02]">
                    {['Plan', 'Tokens', 'Amount Paid', 'Date', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {sub.subscriptions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">{s.plan_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                          <Coins className="w-3.5 h-3.5" />{s.tokens_purchased.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">₹{s.amount_paid_inr.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{fmt(s.created_at)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />{s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Token usage log */}
          {sub && sub.transactions.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Token Activity</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Last 30 transactions</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02]">
                    {['Description', 'Tokens', 'Date'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {sub.transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{t.description}</td>
                      <td className="px-5 py-3">
                        <span className={`font-semibold ${t.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">{fmt(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showRecharge && (
        <PricingModal
          onClose={() => setShowRecharge(false)}
          onPurchase={(updated) => { setSub(updated); setShowRecharge(false) }}
        />
      )}
    </div>
  )
}
