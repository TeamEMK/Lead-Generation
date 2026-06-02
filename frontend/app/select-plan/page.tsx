'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Zap, CheckCircle2, Coins, Loader2, ArrowRight,
  CreditCard, Lock, Shield,
} from 'lucide-react'
import { fetchPlans, purchasePlan, type Plan } from '../../lib/api'

type Step = 'select' | 'pay'

export default function SelectPlanPage() {
  return (
    <Suspense>
      <SelectPlanContent />
    </Suspense>
  )
}

function SelectPlanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const planIdParam = searchParams.get('planId')
    fetchPlans()
      .then(p => {
        setPlans(p)
        const preselected = planIdParam
          ? p.find(x => x.id === Number(planIdParam))
          : null
        setSelectedPlan(preselected ?? p.find(x => x.popular) ?? p[1] ?? p[0])
        if (preselected) setStep('pay')
      })
      .catch(() => setError('Failed to load plans'))
      .finally(() => setLoading(false))
  }, [searchParams])

  async function handlePay() {
    if (!selectedPlan) return
    setPaying(true)
    setError(null)
    try {
      await purchasePlan(selectedPlan.id)
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message)
      setPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1228] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0d1228]">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="e-Marketing" className="h-9 w-auto" />
        </Link>
        {/* Steps */}
        <div className="flex items-center gap-1">
          {/* Step 1 — Account */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="hidden sm:block text-xs font-semibold text-emerald-600 dark:text-emerald-400">Account created</span>
          </div>
          {/* Connector */}
          <div className="w-8 sm:w-12 h-[2px] bg-emerald-200 dark:bg-emerald-500/30 mx-1 rounded-full" />
          {/* Step 2 — Choose plan */}
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
              step !== 'select'
                ? 'bg-emerald-500'
                : 'bg-brand-500'
            }`}>
              {step !== 'select'
                ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                : <span className="text-white">2</span>
              }
            </div>
            <span className={`hidden sm:block text-xs font-semibold ${
              step === 'select' ? 'text-brand-600 dark:text-brand-400'
              : 'text-emerald-600 dark:text-emerald-400'
            }`}>Choose plan</span>
          </div>
          {/* Connector */}
          <div className={`w-8 sm:w-12 h-[2px] mx-1 rounded-full transition-colors ${
            step === 'pay' ? 'bg-brand-300 dark:bg-brand-500/40' : 'bg-slate-200 dark:bg-white/[0.08]'
          }`} />
          {/* Step 3 — Payment */}
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-colors ${
              step === 'pay'
                ? 'bg-brand-500'
                : 'bg-slate-200 dark:bg-white/[0.1]'
            }`}>
              <span className={step === 'pay' ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>3</span>
            </div>
            <span className={`hidden sm:block text-xs font-semibold ${
              step === 'pay' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
            }`}>Payment</span>
          </div>
        </div>
        <div className="w-28" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {step === 'select' ? (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                Choose your plan to get started
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                1 token = 1 lead saved. Unused tokens expire with the plan. Duplicates never cost a token.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm text-center">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                  {plans.map(plan => {
                    const isSelected = selectedPlan?.id === plan.id
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative rounded-2xl border p-6 flex flex-col gap-4 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/10 shadow-lg shadow-brand-500/10 ring-2 ring-brand-500/30'
                            : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.14]'
                        }`}
                      >
                        {plan.popular && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white tracking-wider">
                            MOST POPULAR
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </span>
                        )}
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {plan.name}
                          </p>
                          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            ₹{plan.price_inr.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">/month</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${isSelected ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-slate-100 dark:bg-white/[0.05]'}`}>
                          <p className={`text-xl font-extrabold ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {plan.tokens.toLocaleString()} tokens
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">₹{plan.price_per_token}/token</p>
                        </div>
                        <ul className="space-y-2">
                          {[`${plan.tokens.toLocaleString()} leads saved`, 'Expires with plan', 'Duplicates free'].map(f => (
                            <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => setStep('pay')}
                    disabled={!selectedPlan}
                    className="flex items-center gap-2 px-10 py-3.5 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white font-bold text-base shadow-xl shadow-brand-500/20 transition-all disabled:opacity-50"
                  >
                    Continue with {selectedPlan?.name}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <Link href="/dashboard" className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    Skip for now — I'll recharge later
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Payment step ── */
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                Complete your purchase
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Secure checkout · Payment gateway coming soon
              </p>
            </div>

            {/* Order summary */}
            <div className="bg-white dark:bg-[#141c32] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm p-6 mb-4 space-y-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Order Summary</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{selectedPlan?.name} Plan</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{selectedPlan?.tokens.toLocaleString()} tokens</p>
                  </div>
                </div>
                <p className="font-bold text-slate-900 dark:text-white">₹{selectedPlan?.price_inr.toLocaleString()}</p>
              </div>
              <div className="border-t border-slate-100 dark:border-white/[0.06] pt-3 flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">₹{selectedPlan?.price_inr.toLocaleString()}</p>
              </div>
            </div>

            {/* Payment gateway placeholder */}
            <div className="bg-white dark:bg-[#141c32] rounded-2xl border border-dashed border-slate-300 dark:border-white/[0.12] p-6 mb-4 text-center space-y-2">
              <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Payment gateway will appear here</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Razorpay / Stripe integration coming soon</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white font-bold text-sm shadow-xl shadow-brand-500/20 transition-all disabled:opacity-60"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {paying ? 'Processing…' : `Confirm & Pay ₹${selectedPlan?.price_inr.toLocaleString()}`}
            </button>

            <div className="flex items-center justify-center gap-4 mt-4">
              <button onClick={() => setStep('select')} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                ← Change plan
              </button>
              <span className="text-slate-200 dark:text-slate-700">·</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <Shield className="w-3.5 h-3.5" /> Secure & encrypted
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
