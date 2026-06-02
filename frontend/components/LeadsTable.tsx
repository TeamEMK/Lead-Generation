'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search, Phone, Globe, MapPin, Mail, ChevronLeft, ChevronRight,
  CheckSquare, Square, Download, X, MinusSquare, Tag, Filter, ChevronDown,
} from 'lucide-react'
import type { Lead } from '../lib/api'
import LeadDetailModal from './LeadDetailModal'

interface LeadsTableProps {
  leads: Lead[]
  onSelectionChange?: (count: number) => void
}

function downloadCSV(leads: Lead[], filename = 'leads') {
  const esc = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`
  const headers = ['Timestamp', 'Keyword', 'Business Name', 'Phone', 'Website', 'Email', 'Address']
  const rows = leads.map(l => [
    esc(l.timestamp), esc(l.keyword), esc(l.businessName),
    esc(l.phone), esc(l.website), esc(l.email), esc(l.address),
  ].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function LeadsTable({ leads, onSelectionChange }: LeadsTableProps) {
  const [search, setSearch] = useState('')
  const [keywordFilter, setKeywordFilter] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [modalLeadId, setModalLeadId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = 25

  useEffect(() => {
    onSelectionChange?.(selected.size)
  }, [selected.size, onSelectionChange])

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const modalLead = modalLeadId !== null ? leads.find(l => l.id === modalLeadId) ?? null : null

  const keywords = useMemo(() =>
    [...new Set(leads.map(l => l.keyword).filter(Boolean))].sort(), [leads])

  const filtered = useMemo(() => leads.filter(l => {
    if (keywordFilter && l.keyword !== keywordFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return [l.businessName, l.phone, l.website, l.address, l.email, l.keyword]
        .some(v => v?.toLowerCase().includes(q))
    }
    return true
  }), [leads, keywordFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const visibleIds = rows.map(r => r.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(i => selected.has(i))
  const someVisibleSelected = visibleIds.some(i => selected.has(i))
  const hasFilters = !!keywordFilter || !!search

  function resetPage() { setPage(1) }
  function toggleRow(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(prev => {
      const n = new Set(prev)
      allVisibleSelected ? visibleIds.forEach(i => n.delete(i)) : visibleIds.forEach(i => n.add(i))
      return n
    })
  }

  function handleDownloadSelected() {
    const selectedLeads = filtered.filter(l => selected.has(l.id))
    downloadCSV(selectedLeads, `leads-selected`)
  }

  return (
    <div className="space-y-3">
      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads…"
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage() }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 dark:focus:border-brand-500 text-sm transition-all"
          />
        </div>
        {keywords.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className={`flex items-center gap-1.5 pl-2.5 pr-2 py-2.5 rounded-xl border text-xs font-medium transition-all whitespace-nowrap ${
                keywordFilter
                  ? 'border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/[0.14]'
              }`}
            >
              <Tag className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="max-w-[100px] truncate">{keywordFilter || 'All'}</span>
              <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-[#141c32] rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-xl z-30 overflow-hidden">
                <button
                  onClick={() => { setKeywordFilter(''); resetPage(); setDropdownOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors ${
                    !keywordFilter
                      ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  All keywords
                </button>
                <div className="max-h-52 overflow-y-auto">
                  {keywords.map(kw => (
                    <button
                      key={kw}
                      onClick={() => { setKeywordFilter(kw); resetPage(); setDropdownOpen(false) }}
                      className={`w-full text-left px-3 py-2.5 text-xs font-medium transition-colors truncate ${
                        keywordFilter === kw
                          ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {hasFilters && (
          <button
            onClick={() => { setKeywordFilter(''); setSearch(''); resetPage() }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bulk action bar — only shown when rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
            {selected.size} selected
          </span>
          <button
            onClick={handleDownloadSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-sm shadow-brand-500/20"
          >
            <Download className="w-3 h-3" />
            Download CSV
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-2">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 dark:text-slate-500">
            <Filter className="w-8 h-8 opacity-40" />
            <p className="font-medium text-sm">{hasFilters ? 'No matches' : 'No leads yet'}</p>
            {hasFilters && (
              <button onClick={() => { setKeywordFilter(''); setSearch('') }} className="text-xs text-brand-500 hover:underline">Clear filters</button>
            )}
          </div>
        ) : rows.map(lead => {
          const isSelected = selected.has(lead.id)
          return (
            <div
              key={lead.id}
              onClick={() => setModalLeadId(lead.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-brand-300 dark:border-brand-500/40 bg-brand-50/60 dark:bg-brand-500/10'
                  : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.14]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button onClick={e => { e.stopPropagation(); toggleRow(lead.id) }} className="flex-shrink-0">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-brand-500" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                  </button>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{lead.businessName || '—'}</p>
                </div>
                {lead.keyword && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-navy-100 dark:bg-navy-500/10 text-navy-700 dark:text-navy-400 border border-navy-200 dark:border-navy-500/20 flex-shrink-0">
                    <Tag className="w-2.5 h-2.5" />{lead.keyword}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-brand-500">
                    <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" /><span className="truncate">{lead.phone}</span>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-brand-500">
                    <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" /><span className="truncate">{lead.email}</span>
                  </a>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-brand-500 hover:underline col-span-2">
                    <Globe className="w-3 h-3 flex-shrink-0" /><span className="truncate">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  </a>
                )}
                {lead.address && (
                  <div className="flex items-start gap-1.5 col-span-2">
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-400" /><span className="line-clamp-1">{lead.address}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table — fixed height, scrolls internally */}
      <div className="hidden sm:block overflow-auto max-h-[60vh] rounded-xl border border-slate-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#18213a] border-b border-slate-100 dark:border-white/[0.04]">
              <th className="sticky top-0 z-10 bg-slate-50 dark:bg-[#18213a] px-4 py-3 w-10">
                <button onClick={toggleAll} className="flex items-center text-slate-400 hover:text-brand-500 transition-colors">
                  {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-brand-500" />
                    : someVisibleSelected ? <MinusSquare className="w-4 h-4 text-brand-400" />
                    : <Square className="w-4 h-4" />}
                </button>
              </th>
              {['Business Name', 'Keyword', 'Phone', 'Website', 'Email', 'Address', 'Date'].map(h => (
                <th key={h} className="sticky top-0 z-10 bg-slate-50 dark:bg-[#18213a] text-left px-4 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                    <Filter className="w-7 h-7 opacity-40" />
                    <p className="font-medium text-sm">{hasFilters ? 'No leads match your filters' : 'No leads yet'}</p>
                    {hasFilters && (
                      <button onClick={() => { setKeywordFilter(''); setSearch('') }} className="text-xs text-brand-500 hover:underline">Clear filters</button>
                    )}
                  </div>
                </td>
              </tr>
            ) : rows.map(lead => {
              const isSelected = selected.has(lead.id)
              return (
                <tr key={lead.id}
                  onClick={() => setModalLeadId(lead.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-brand-50/60 dark:bg-brand-900/10'
                      : 'bg-white dark:bg-transparent hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                  }`}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleRow(lead.id)}
                      className="flex items-center text-slate-300 hover:text-brand-500 dark:text-slate-600 dark:hover:text-brand-400 transition-colors">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-brand-500" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-[160px]">
                    <span className="truncate block">{lead.businessName || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.keyword
                      ? <button onClick={e => { e.stopPropagation(); setKeywordFilter(lead.keyword); resetPage() }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-navy-100 dark:bg-navy-900/30 text-navy-700 dark:text-navy-400 hover:bg-navy-200 dark:hover:bg-navy-800/50 transition-colors whitespace-nowrap">
                          <Tag className="w-2.5 h-2.5" />{lead.keyword}
                        </button>
                      : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {lead.phone
                      ? <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400">
                          <Phone className="w-3 h-3 flex-shrink-0 text-slate-400" />{lead.phone}
                        </a> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    {lead.website
                      ? <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 hover:underline">
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        </a> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {lead.email
                      ? <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400">
                          <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />{lead.email}
                        </a>
                      : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500 max-w-[180px]">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-400" />
                      <span className="line-clamp-2 text-xs">{lead.address || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">
                    {lead.timestamp ? new Date(lead.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>{filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {modalLead && <LeadDetailModal lead={modalLead} onClose={() => setModalLeadId(null)} />}
    </div>
  )
}
