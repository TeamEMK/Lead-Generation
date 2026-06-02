import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky'
}

const colorMap = {
  indigo:  { iconBg: 'bg-brand-100 dark:bg-brand-500/10',  iconText: 'text-brand-600 dark:text-brand-400',  accent: 'from-brand-500 to-brand-600',  value: 'text-brand-600 dark:text-brand-400' },
  emerald: { iconBg: 'bg-emerald-100 dark:bg-emerald-500/10', iconText: 'text-emerald-600 dark:text-emerald-400', accent: 'from-emerald-500 to-teal-500',     value: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { iconBg: 'bg-amber-100 dark:bg-amber-500/10',    iconText: 'text-amber-600 dark:text-amber-400',    accent: 'from-amber-500 to-orange-500',    value: 'text-amber-600 dark:text-amber-400' },
  rose:    { iconBg: 'bg-rose-100 dark:bg-rose-500/10',      iconText: 'text-rose-600 dark:text-rose-400',      accent: 'from-rose-500 to-pink-500',       value: 'text-rose-600 dark:text-rose-400' },
  violet:  { iconBg: 'bg-navy-100 dark:bg-navy-500/10',  iconText: 'text-navy-600 dark:text-navy-400',  accent: 'from-navy-500 to-purple-600',   value: 'text-navy-600 dark:text-navy-400' },
  sky:     { iconBg: 'bg-sky-100 dark:bg-sky-500/10',        iconText: 'text-sky-600 dark:text-sky-400',        accent: 'from-sky-500 to-cyan-500',        value: 'text-sky-600 dark:text-sky-400' },
}

export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'indigo' }: StatsCardProps) {
  const c = colorMap[color]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-5">
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${c.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1.5 sm:mt-2 tabular leading-none ${c.value}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1.5 sm:mt-2 leading-tight">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 sm:p-2.5 rounded-xl ${c.iconBg} flex-shrink-0`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${c.iconText}`} />
        </div>
      </div>
    </div>
  )
}
