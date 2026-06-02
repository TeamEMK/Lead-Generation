'use client'

import { useEffect } from 'react'
import {
  X, Phone, Globe, Mail, MapPin, Tag, Calendar, ExternalLink, Building2,
} from 'lucide-react'
import type { Lead } from '../lib/api'

interface LeadDetailModalProps {
  lead: Lead
  onClose: () => void
}

function DetailRow({ icon, label, children, empty }: {
  icon: React.ReactNode; label: string; children?: React.ReactNode; empty?: boolean
}) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center flex-shrink-0">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        {empty
          ? <p className="text-sm text-slate-300 dark:text-slate-600">—</p>
          : <div className="text-sm text-slate-800 dark:text-slate-200 break-words">{children}</div>}
      </div>
    </div>
  )
}

export default function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md bg-white dark:bg-[#141c32] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-500 via-brand-500 to-brand-500" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-600/10 border border-brand-200 dark:border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-brand-500 dark:text-brand-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug break-words">
                {lead.businessName || 'Unnamed Business'}
              </h2>
              {lead.keyword && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-navy-100 dark:bg-navy-500/10 text-navy-700 dark:text-navy-400 border border-navy-200 dark:border-navy-500/20">
                  <Tag className="w-2.5 h-2.5" />{lead.keyword}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-5 h-px bg-slate-100 dark:bg-white/[0.04]" />

        <div className="px-5 py-1 pb-5">
          <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" empty={!lead.phone}>
            <a href={`tel:${lead.phone}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
              {lead.phone}
            </a>
          </DetailRow>
          <DetailRow icon={<Globe className="w-3.5 h-3.5" />} label="Website" empty={!lead.website}>
            <a href={lead.website} target="_blank" rel="noopener noreferrer"
              className="font-medium text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 break-all">
              {lead.website?.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </DetailRow>
          <DetailRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" empty={!lead.email}>
            <a href={`mailto:${lead.email}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
              {lead.email}
            </a>
          </DetailRow>
          <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Address" empty={!lead.address}>
            <span className="leading-relaxed text-slate-700 dark:text-slate-300">{lead.address}</span>
          </DetailRow>
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Added" empty={!lead.timestamp}>
            <span className="text-slate-500 dark:text-slate-400">
              {lead.timestamp && new Date(lead.timestamp).toLocaleString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </DetailRow>
        </div>
      </div>
    </div>
  )
}
