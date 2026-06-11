'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { fetchOverview, type Overview } from '../../lib/api'
import {
  Users, CreditCard, IndianRupee, TrendingUp, MapPin, Coins,
  Cloud, Wallet, RefreshCw, Server, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const num = (n: number) => n.toLocaleString('en-IN')

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  orange: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  teal: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
}

function Card({ icon: Icon, color, label, value, sub }: {
  icon: any; color: string; label: string; value: string; sub?: ReactNode
}) {
  return (
    <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl p-5">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border mb-3 ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs mt-1.5">{sub}</p>}
    </div>
  )
}

function BarChart({ values, color, format }: { values: number[]; color: string; format: (n: number) => string }) {
  const max = Math.max(1, ...values)
  return (
    <div className="flex items-end gap-[2px] h-20">
      {values.map((v, i) => (
        <div key={i} className="flex-1 group relative flex items-end h-full">
          <div
            className={`w-full rounded-sm ${color} transition-all`}
            style={{ height: `${Math.max(v > 0 ? 4 : 0, (v / max) * 100)}%` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap text-[10px] bg-black/80 text-white px-1.5 py-0.5 rounded">
            {format(v)}
          </div>
        </div>
      ))}
    </div>
  )
}

function FreeTierBar({ used, free, label, color }: { used: number; free: number; label: string; color: string }) {
  const pct = Math.min(100, (used / free) * 100)
  const over = used > free
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={over ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
          {num(used)} / {num(free)}{over ? ` (+${num(used - free)})` : ''}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${over ? 'bg-rose-500' : color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [o, setO] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    fetchOverview().then(setO).catch(e => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
      </div>
    )
  }

  if (!o) {
    return (
      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    )
  }

  const profitPositive = o.profit.this_month >= 0
  const trendRev = o.trend.map(t => t.revenue)
  const trendCost = o.trend.map(t => t.cost_inr)
  const trendLeads = o.trend.map(t => t.leads)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Business, usage & estimated Outscraper cost</p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:bg-white/[0.08] disabled:opacity-50 transition">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* ── Money row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={IndianRupee} color="orange" label="Total Revenue" value={inr(o.revenue.total)} />
        <Card icon={TrendingUp} color="purple" label="Revenue This Month" value={inr(o.revenue.this_month)} />
        <Card icon={Cloud} color="sky" label="Outscraper Cost This Month" value={inr(o.api.cost_month_inr)}
          sub={<span className="text-slate-500">after free tier · {inr(o.api.cost_total_inr)} all-time (list)</span>} />
        <Card icon={Wallet} color={profitPositive ? 'green' : 'rose'} label="Profit This Month"
          value={inr(o.profit.this_month)}
          sub={<span className={profitPositive ? 'text-emerald-400' : 'text-rose-400'}>
            {profitPositive ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
            {' '}revenue − Outscraper cost
          </span>} />
      </div>

      {/* ── Cost economics: what we spent vs what users paid ── */}
      <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Cost economics — all-time</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">We spent · Outscraper</p>
            <p className="text-2xl font-bold text-sky-400">{inr(o.economics.we_spent_total)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Users paid · Revenue</p>
            <p className="text-2xl font-bold text-emerald-400">{inr(o.economics.users_paid_total)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Profit</p>
            <p className={`text-2xl font-bold ${o.economics.profit_total >= 0 ? 'text-white' : 'text-rose-400'}`}>{inr(o.economics.profit_total)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Margin</p>
            <p className="text-2xl font-bold text-white">{o.economics.margin_pct}%</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Users paid = real money received · We spent = Outscraper list cost · Profit = users paid − we spent.
          This month: spent {inr(o.economics.we_spent_month)} · paid {inr(o.economics.users_paid_month)} · profit {inr(o.economics.profit_month)}.
        </p>
      </div>

      {/* ── Usage row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Users} color="blue" label="Total Users" value={num(o.users.total)}
          sub={<span className="text-emerald-400">+{num(o.users.new_30d)} in 30 days</span>} />
        <Card icon={CreditCard} color="green" label="Active Plans" value={num(o.subscriptions.active)}
          sub={<span className="text-slate-500">{num(o.users.with_plan)} users with a plan</span>} />
        <Card icon={Coins} color="amber" label="Tokens Used" value={num(o.tokens.used)}
          sub={<span className="text-slate-500">{num(o.tokens.sold)} sold · {num(o.tokens.remaining)} left</span>} />
        <Card icon={MapPin} color="teal" label="Leads Generated" value={num(o.leads.total)}
          sub={<span className="text-slate-500">{num(o.leads.this_month)} this month</span>} />
      </div>

      {/* ── Outscraper cost detail + free tier ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Outscraper — Google Maps API usage</h2>
            <span className="ml-auto text-xs text-slate-500">@ ₹{o.pricing.usd_inr}/USD</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div>
              <p className="text-xl font-bold text-white">{num(o.api.ent_month)}</p>
              <p className="text-xs text-slate-400">Records this month</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{num(o.pricing.free_ent)}</p>
              <p className="text-xs text-slate-400">Free records / month</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{num(Math.max(0, o.api.ent_month - o.pricing.free_ent))}</p>
              <p className="text-xs text-slate-400">Billable records</p>
            </div>
            <div>
              <p className="text-xl font-bold text-sky-400">{inr(o.api.cost_month_inr)}</p>
              <p className="text-xs text-slate-400">Billable cost this month</p>
            </div>
          </div>
          <div className="space-y-3">
            <FreeTierBar used={o.api.ent_month} free={o.pricing.free_ent} label="Free records (this month)" color="bg-sky-500" />
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Estimated from records returned × Outscraper list price (${o.pricing.price_ent_usd}/record, ~$3/1000).
            First {num(o.pricing.free_ent)} records each month are free.
          </p>
        </div>

        <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">All-time records</h2>
          <p className="text-3xl font-bold text-white">{num(o.api.ent_total)}</p>
          <p className="text-xs text-slate-400 mb-4">Google Maps businesses pulled via Outscraper</p>
          <div className="pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-slate-400">List-price cost, all-time</p>
            <p className="text-2xl font-bold text-sky-400">{inr(o.api.cost_total_inr)}</p>
            <p className="text-xs text-slate-500 mt-1">Before monthly free credits</p>
          </div>
        </div>
      </div>

      {/* ── Trends ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-xs text-slate-400 mb-1">Revenue · last 30 days</p>
          <p className="text-lg font-bold text-white mb-3">{inr(trendRev.reduce((a, b) => a + b, 0))}</p>
          <BarChart values={trendRev} color="bg-brand-500" format={inr} />
        </div>
        <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-xs text-slate-400 mb-1">Leads · last 30 days</p>
          <p className="text-lg font-bold text-white mb-3">{num(trendLeads.reduce((a, b) => a + b, 0))}</p>
          <BarChart values={trendLeads} color="bg-teal-500" format={num} />
        </div>
        <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl p-5">
          <p className="text-xs text-slate-400 mb-1">Outscraper cost (list) · last 30 days</p>
          <p className="text-lg font-bold text-white mb-3">{inr(trendCost.reduce((a, b) => a + b, 0))}</p>
          <BarChart values={trendCost} color="bg-sky-500" format={inr} />
        </div>
      </div>

      {/* ── Top users ── */}
      <div className="bg-[#0f1629] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Top users by tokens used</h2>
        </div>
        {o.top_users.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No usage yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-white/[0.06]">
                <th className="text-left px-5 py-2.5 font-medium">User</th>
                <th className="text-right px-5 py-2.5 font-medium">Tokens used</th>
                <th className="text-right px-5 py-2.5 font-medium">Leads</th>
                <th className="text-right px-5 py-2.5 font-medium">Records</th>
                <th className="text-right px-5 py-2.5 font-medium">We spent</th>
                <th className="text-right px-5 py-2.5 font-medium">User paid</th>
                <th className="text-right px-5 py-2.5 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {o.top_users.map((u, i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <p className="text-white font-medium">{u.name || '—'}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 text-right text-white font-semibold">{num(u.tokens_used)}</td>
                  <td className="px-5 py-3 text-right text-slate-300">{num(u.leads)}</td>
                  <td className="px-5 py-3 text-right text-slate-300">{num(u.calls)}</td>
                  <td className="px-5 py-3 text-right text-sky-400">{inr(u.cost_inr)}</td>
                  <td className="px-5 py-3 text-right text-emerald-400">{inr(u.revenue)}</td>
                  <td className={`px-5 py-3 text-right font-medium ${u.profit >= 0 ? 'text-white' : 'text-rose-400'}`}>{inr(u.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
