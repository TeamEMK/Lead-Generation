'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CreditCard, Coins, Zap, CheckCircle2, RefreshCw,
  TrendingDown, TrendingUp, Calendar, X, Loader2, Star, FileText, Printer,
} from 'lucide-react'
import { fetchSubscription, fetchPlans, purchasePlan, type Subscription, type Plan } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

type SubEntry = Subscription['subscriptions'][number]

const COMPANY = {
  name: 'JAI MARKETING',
  website: 'e-marketing.io',
  email: 'info@e-marketing.io',
  phone: '+91-9602694444',
  address: 'H-3, Globe House South Wing Transport Nagar, Jaipur - 302004 (Raj)',
  gstin: 'GSTIN: 08AAPFJ6061M1ZQ',
  logo: null as string | null,
}

function generateInvoiceHTML(entry: SubEntry, userName: string, userEmail: string): string {
  const date = new Date(entry.created_at)
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const invoiceNo = entry.invoice_number ?? '—'
  const baseAmount = entry.price_inr
  const gstAmount = Math.round(baseAmount * 0.18)
  const totalAmount = baseAmount + gstAmount
  const amount = totalAmount.toLocaleString('en-IN')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice ${invoiceNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; }
  .page { max-width: 720px; margin: 0 auto; padding: 48px 40px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 28px; border-bottom: 3px solid #EE9535; }
  .logo-block .company { font-size: 22px; font-weight: 800; color: #1e293b; }
  .logo-block .tagline { font-size: 11px; color: #64748b; margin-top: 2px; }
  .logo-placeholder { width: 60px; height: 60px; border-radius: 12px; background: #EE9535; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; margin-bottom: 8px; }
  .invoice-label { text-align: right; }
  .invoice-label .tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #EE9535; margin-bottom: 4px; }
  .invoice-label .number { font-size: 20px; font-weight: 800; color: #1e293b; font-family: monospace; }
  .invoice-label .inv-date { font-size: 12px; color: #64748b; margin-top: 4px; }

  /* Two-col info */
  .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .info-block h4 { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px; }
  .info-block p { font-size: 13px; color: #334155; line-height: 1.7; }
  .info-block p.strong { font-weight: 700; font-size: 14px; color: #1e293b; }

  /* Items table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  thead tr { background: #EE9535; color: #fff; }
  thead th { padding: 11px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
  thead th:last-child, thead th:nth-child(2) { text-align: right; }
  tbody tr { border-bottom: 1px solid #e2e8f0; }
  tbody tr:last-child { border-bottom: none; }
  tbody td { padding: 14px 16px; font-size: 13px; color: #334155; vertical-align: top; }
  tbody td:last-child, tbody td:nth-child(2) { text-align: right; }
  tbody td .sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .table-wrap { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 24px; }

  /* Totals */
  .totals { margin-left: auto; width: 240px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .totals-row { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
  .totals-row:last-child { border-bottom: none; background: #fff7ed; font-weight: 800; font-size: 15px; color: #EE9535; }
  .totals-row.sub-row { color: #64748b; }

  /* Status badge */
  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #16a34a; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer .note { font-size: 11px; color: #94a3b8; line-height: 1.6; }
  .footer .thank { font-size: 13px; font-weight: 700; color: #EE9535; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-block">
      <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png" alt="e-Marketing" style="height:56px;width:auto;margin-bottom:6px;display:block;" />
      <div class="tagline">${COMPANY.website} · ${COMPANY.email}</div>
    </div>
    <div class="invoice-label">
      <div class="tag">Tax Invoice</div>
      <div class="number">${invoiceNo}</div>
      <div class="inv-date">${dateStr}</div>
      <div style="margin-top:8px"><span class="badge">✓ Paid</span></div>
    </div>
  </div>

  <!-- From / To -->
  <div class="info-row">
    <div class="info-block">
      <h4>From</h4>
      <p class="strong">${COMPANY.name}</p>
      <p>${COMPANY.address}</p>
      <p style="margin-top:4px">${COMPANY.phone}</p>
      <p style="margin-top:4px;font-size:11px;color:#94a3b8">${COMPANY.gstin}</p>
    </div>
    <div class="info-block">
      <h4>Bill To</h4>
      <p class="strong">${userName}</p>
      <p>${userEmail}</p>
    </div>
  </div>

  <!-- Items -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Tokens</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight:600">${entry.plan_name} Plan — Lead Generation Tokens</div>
            <div class="sub">GMB Leads Extractor · 1 token = 1 lead saved · e-marketing.io</div>
          </td>
          <td>${entry.tokens_purchased.toLocaleString('en-IN')}</td>
          <td>₹${baseAmount.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div style="display:flex;justify-content:flex-end">
    <div class="totals">
      <div class="totals-row sub-row"><span>Subtotal</span><span>₹${baseAmount.toLocaleString('en-IN')}</span></div>
      <div class="totals-row sub-row"><span>GST (18%)</span><span>₹${gstAmount.toLocaleString('en-IN')}</span></div>
      <div class="totals-row"><span>Total</span><span>₹${amount}</span></div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="note">
      ${COMPANY.name} · ${COMPANY.address}<br/>
      ${COMPANY.phone} · ${COMPANY.email}
    </div>
    <div class="thank">Thank you for your business!</div>
  </div>

</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
}

function InvoiceModal({ entry, onClose }: { entry: SubEntry; onClose: () => void }) {
  const { user } = useAuth()
  const date = new Date(entry.created_at)
  const invoiceNo = entry.invoice_number ?? '—'
  const userName = user?.name ?? 'Customer'
  const userEmail = user?.email ?? ''

  function handlePrint() {
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) return
    w.document.write(generateInvoiceHTML(entry, userName, userEmail))
    w.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-[#141c32] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">

        {/* Orange header */}
        <div className="bg-brand-600 px-7 py-6 flex items-start justify-between">
          <div>
            <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mb-1.5">Tax Invoice</p>
            <p className="text-white text-2xl font-extrabold font-mono tracking-tight">{invoiceNo}</p>
            <p className="text-brand-100 text-xs mt-1">
              {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-2 ml-auto">
              <span className="text-white font-black text-lg">JM</span>
            </div>
            <p className="text-white font-bold text-sm">{COMPANY.name}</p>
            <p className="text-brand-100 text-xs">{COMPANY.website}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">

          {/* From / To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">From</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{COMPANY.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{COMPANY.phone}<br/>{COMPANY.email}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{COMPANY.gstin}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Bill To</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{userName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{userEmail}</p>
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" /> Paid
              </span>
            </div>
          </div>

          {/* Items table */}
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 dark:bg-navy-800 text-white">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Tokens</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100 dark:border-white/[0.04]">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{entry.plan_name} Plan — Lead Tokens</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">GMB Leads Extractor · 1 token = 1 lead saved</p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-600 dark:text-slate-300 text-sm">
                    {entry.tokens_purchased.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    ₹{entry.price_inr.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
                  <td className="px-4 py-2 text-xs text-slate-400 dark:text-slate-500">Subtotal (excl. GST)</td>
                  <td />
                  <td className="px-4 py-2 text-right text-xs text-slate-400 dark:text-slate-500">
                    ₹{entry.price_inr.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr className="border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
                  <td className="px-4 py-2 text-xs text-slate-400 dark:text-slate-500">GST (18%)</td>
                  <td />
                  <td className="px-4 py-2 text-right text-xs text-slate-400 dark:text-slate-500">
                    ₹{Math.round(entry.price_inr * 0.18).toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr className="border-t-2 border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10">
                  <td colSpan={2} className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200">Total</td>
                  <td className="px-4 py-3 text-right text-base font-extrabold text-brand-600 dark:text-brand-400">
                    ₹{(entry.price_inr + Math.round(entry.price_inr * 0.18)).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            {COMPANY.name} · {COMPANY.address}
          </p>
        </div>

        {/* Actions */}
        <div className="px-7 pb-6 flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            <Printer className="w-4 h-4" /> Download PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition-all shadow-md shadow-brand-500/20"
          >
            <X className="w-4 h-4" /> Close
          </button>
        </div>
      </div>
    </div>
  )
}

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
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#141c32] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all">
          <X className="w-4 h-4" />
        </button>
        <div className="mb-6">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-1">Renew Plan</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Renew or Upgrade Plan</h2>
        </div>
        {error && <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">{error}</div>}
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={`relative rounded-2xl border p-5 flex flex-col gap-4 ${plan.popular ? 'border-brand-400 dark:border-brand-500/60 bg-brand-50 dark:bg-brand-500/10 shadow-lg shadow-brand-500/10' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]'}`}>
                {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white tracking-wider">BEST VALUE</span>}
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</p>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">₹{plan.price_inr.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">+ 18% GST = ₹{(Math.round(plan.price_inr * 1.18)).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400">
                  <Coins className="w-4 h-4" />{plan.tokens.toLocaleString()} tokens
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">₹{plan.price_per_token}/token</p>
                <button onClick={() => handleBuy(plan)} disabled={purchasing !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 disabled:opacity-60' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-700 dark:hover:bg-slate-100 disabled:opacity-60'}`}>
                  {purchasing === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {purchasing === plan.id ? 'Processing…' : `Pay ₹${(Math.round(plan.price_inr * 1.18)).toLocaleString()}`}
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
  const [showRenew, setShowRenew] = useState(false)
  const [invoiceEntry, setInvoiceEntry] = useState<SubEntry | null>(null)

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
            <CreditCard className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Billing</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Your plan, token balance, and purchase history</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 transition-all shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowRenew(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all">
            <Zap className="w-3.5 h-3.5" /> Renew Plan
          </button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">{error}</div>}

      {loading && !sub ? (
        <div className="flex items-center justify-center h-48"><RefreshCw className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : (
        <>
          {/* Current plan + balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active plan */}
            <div className={`rounded-2xl border p-6 ${sub?.active_plan ? 'border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141c32]'}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Active Plan</p>
                  {sub?.active_plan ? (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{sub.active_plan.name}</h2>
                      {sub.active_plan.popular && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white">
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
                    <span className="text-slate-500 dark:text-slate-400">Monthly price</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹{sub.active_plan.price_inr.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Tokens/month</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{sub.active_plan.tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Rate</span>
                    <span className="font-semibold text-slate-900 dark:text-white">₹{sub.active_plan.price_per_token}/token</span>
                  </div>
                  {sub.subscriptions[0]?.expires_at && (
                    <div className="flex items-center justify-between text-sm pt-1.5 border-t border-slate-100 dark:border-white/[0.04] mt-1">
                      <span className="text-slate-500 dark:text-slate-400">Expires on</span>
                      <span className={`font-semibold ${Math.ceil((new Date(sub.subscriptions[0].expires_at!).getTime() - Date.now()) / 86400000) <= 7 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {new Date(sub.subscriptions[0].expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Activate a plan to start generating leads.
                </p>
              )}
              {!sub?.active_plan && (
                <button onClick={() => setShowRenew(true)} className="mt-4 w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all">
                  Choose a plan to get started
                </button>
              )}
            </div>

            {/* Token balance */}
            <div className={`rounded-2xl border p-6 ${isLow ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141c32]'}`}>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Token Balance</p>
              <p className={`text-4xl font-extrabold tabular mb-1 ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-brand-600 dark:text-brand-400'}`}>
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
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.04]">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Purchase History</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02]">
                    {['Invoice', 'Plan', 'Tokens', 'Amount Paid', 'Date', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {sub.subscriptions.map(s => (
                    <tr
                      key={s.id}
                      onClick={() => setInvoiceEntry(s)}
                      className="hover:bg-brand-50 dark:hover:bg-brand-500/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-mono text-xs font-semibold group-hover:underline">
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          {s.invoice_number ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">{s.plan_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-semibold">
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
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm overflow-hidden">
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

      {invoiceEntry && (
        <InvoiceModal entry={invoiceEntry} onClose={() => setInvoiceEntry(null)} />
      )}

      {showRenew && (
        <PricingModal
          onClose={() => setShowRenew(false)}
          onPurchase={(updated) => { setSub(updated); setShowRenew(false) }}
        />
      )}
    </div>
  )
}
