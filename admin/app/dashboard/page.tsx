'use client'

import { useEffect, useState } from 'react'
import { fetchStats } from '../../lib/api'
import { Users, CreditCard, IndianRupee, TrendingUp, MapPin } from 'lucide-react'

interface Stats {
  total_users: number
  active_subscriptions: number
  total_revenue: number
  month_revenue: number
  total_leads: number
}

const CARDS = (s: Stats) => [
  { label: 'Total Users', value: s.total_users.toLocaleString(), icon: Users, color: 'blue' },
  { label: 'Active Plans', value: s.active_subscriptions.toLocaleString(), icon: CreditCard, color: 'green' },
  { label: 'Total Revenue', value: `₹${s.total_revenue.toLocaleString()}`, icon: IndianRupee, color: 'orange' },
  { label: 'This Month', value: `₹${s.month_revenue.toLocaleString()}`, icon: TrendingUp, color: 'purple' },
  { label: 'Total Leads', value: s.total_leads.toLocaleString(), icon: MapPin, color: 'teal' },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  orange: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  teal: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats().then(setStats).catch(e => setError(e.message))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Live metrics from the database</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
      )}

      {!stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {CARDS(stats).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#0f1629] border border-white/[0.07] rounded-2xl p-5">
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border mb-3 ${colorMap[color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
