'use client'

import { useEffect, useState } from 'react'
import { fetchInvoices, type AdminInvoice } from '../../../lib/api'
import { Search, Printer } from 'lucide-react'

const COMPANY = {
  name: 'JAI MARKETING',
  address: 'Shop no. 14, Shree Ganesh Market, Sanganer, Jaipur, Rajasthan - 302029',
  gstin: '08AAPFJ6061M1ZQ',
  email: 'mktg.emarketing@gmail.com',
  phone: '+91 98765 43210',
}

function printInvoice(inv: AdminInvoice) {
  const basePrice = inv.price_inr
  const gst = Math.round(basePrice * 0.18)
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #EE9535; padding-bottom: 20px; }
  .company h1 { font-size: 22px; font-weight: 800; color: #EE9535; margin: 0 0 4px; }
  .company p { font-size: 12px; color: #64748b; margin: 2px 0; }
  .invoice-meta { text-align: right; }
  .invoice-meta .inv-num { font-size: 20px; font-weight: 800; color: #1e293b; }
  .invoice-meta p { font-size: 12px; color: #64748b; margin: 2px 0; }
  .bill-to { margin-bottom: 24px; }
  .bill-to h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
  .bill-to p { font-size: 13px; margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; }
  td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .totals { margin-left: auto; width: 260px; }
  .totals table td { border: none; padding: 6px 8px; }
  .totals .grand-total td { font-weight: 800; font-size: 16px; border-top: 2px solid #EE9535; padding-top: 10px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="header">
  <div class="company">
    <h1>${COMPANY.name}</h1>
    <p>${COMPANY.address}</p>
    <p>GSTIN: ${COMPANY.gstin}</p>
    <p>${COMPANY.email} · ${COMPANY.phone}</p>
  </div>
  <div class="invoice-meta">
    <div class="inv-num">TAX INVOICE</div>
    <p><strong>${inv.invoice_number}</strong></p>
    <p>Date: ${fmt(inv.created_at)}</p>
  </div>
</div>
<div class="bill-to">
  <h3>Bill To</h3>
  <p><strong>${inv.user_name}</strong>${inv.business_name ? ` · ${inv.business_name}` : ''}</p>
  <p>${inv.user_email}${inv.user_phone ? ` · ${inv.user_phone}` : ''}</p>
  ${inv.user_city ? `<p>${inv.user_city}</p>` : ''}
  ${inv.user_gst ? `<p>GSTIN: ${inv.user_gst}</p>` : ''}
</div>
<table>
  <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>${inv.plan_name} Plan — ${inv.plan_tokens.toLocaleString()} tokens (30 days)</td><td>1</td><td>₹${basePrice.toLocaleString()}</td><td>₹${basePrice.toLocaleString()}</td></tr>
  </tbody>
</table>
<div class="totals">
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">₹${basePrice.toLocaleString()}</td></tr>
    <tr><td>CGST (9%)</td><td style="text-align:right">₹${Math.round(gst / 2).toLocaleString()}</td></tr>
    <tr><td>SGST (9%)</td><td style="text-align:right">₹${Math.round(gst / 2).toLocaleString()}</td></tr>
    <tr class="grand-total"><td>Total</td><td style="text-align:right">₹${inv.amount_paid_inr.toLocaleString()}</td></tr>
  </table>
</div>
<div class="footer"><p>This is a computer-generated invoice and does not require a signature.</p><p>${COMPANY.name} · ${COMPANY.gstin}</p></div>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([])
  const [filtered, setFiltered] = useState<AdminInvoice[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
      .then(i => { setInvoices(i); setFiltered(i) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(invoices.filter(i =>
      i.invoice_number.includes(q) || i.user_name.toLowerCase().includes(q) ||
      i.user_email.toLowerCase().includes(q) || i.plan_name.toLowerCase().includes(q)
    ))
  }, [search, invoices])

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Invoices</h1>
          <p className="text-slate-400 text-sm mt-1">{invoices.length} invoices generated</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice, user, plan…"
            className="pl-9 pr-4 py-2 rounded-xl bg-[var(--hover)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-64"
          />
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Invoice #', 'Customer', 'Plan', 'Amount (incl. GST)', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-[var(--hover)] transition-colors">
                    <td className="px-4 py-3 font-mono text-brand-400 font-semibold whitespace-nowrap">{inv.invoice_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-[var(--text)]">{inv.user_name}</p>
                      <p className="text-xs text-slate-500">{inv.user_email}</p>
                      {inv.business_name && <p className="text-xs text-slate-600">{inv.business_name}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs border border-brand-500/20">{inv.plan_name}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--text)] whitespace-nowrap">₹{inv.amount_paid_inr.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(inv.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => printInvoice(inv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--hover)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs text-slate-300 hover:text-[var(--text)] transition-all">
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-600">No invoices found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
