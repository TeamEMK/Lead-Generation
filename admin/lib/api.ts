const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

function headers(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.ok
}

export async function fetchStats() {
  const res = await fetch(`${API_URL}/api/admin/stats`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json() as Promise<{
    total_users: number
    active_subscriptions: number
    total_revenue: number
    month_revenue: number
    total_leads: number
  }>
}

export interface Overview {
  users: { total: number; new_30d: number; with_plan: number }
  subscriptions: { active: number }
  revenue: { total: number; this_month: number }
  tokens: { sold: number; used: number; remaining: number }
  leads: { total: number; this_month: number }
  api: {
    pro_total: number; ent_total: number; calls_total: number
    pro_month: number; ent_month: number; calls_month: number
    cost_total_inr: number; cost_month_inr: number
  }
  profit: { this_month: number }
  economics: {
    we_spent_total: number; we_spent_month: number
    users_paid_total: number; users_paid_month: number
    profit_total: number; profit_month: number; margin_pct: number
  }
  outscraper: {
    recharged_usd: number; recharged_inr: number
    spent_usd: number; spent_inr: number
    remaining_usd: number; records_total: number
  }
  pricing: {
    usd_inr: number; price_pro_usd: number; price_ent_usd: number
    free_pro: number; free_ent: number
  }
  trend: { date: string; revenue: number; leads: number; calls: number; cost_inr: number }[]
  top_users: { name: string; email: string; tokens_used: number; leads: number; calls: number; cost_inr: number; revenue: number; profit: number }[]
}

export async function fetchOverview(): Promise<Overview> {
  const res = await fetch(`${API_URL}/api/admin/overview`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export interface AdminUser {
  id: number; name: string; email: string; phone: string | null
  city: string | null; business_name: string | null; gst: string | null
  tokens_balance: number; created_at: string; active_plan: string | null
  sub_count: number
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/api/admin/users`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return (await res.json()).users
}

export interface AdminSubscription {
  id: number; invoice_number: string | null; tokens_purchased: number
  amount_paid_inr: number; status: string; created_at: string; expires_at: string | null
  plan_name: string; price_inr: number; user_name: string; user_email: string
  razorpay_payment_id: string | null; razorpay_order_id: string | null
}

export async function fetchSubscriptions(): Promise<AdminSubscription[]> {
  const res = await fetch(`${API_URL}/api/admin/subscriptions`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return (await res.json()).subscriptions
}

export interface RazorpayPayment {
  id: string; order_id: string | null; amount_inr: number; currency: string
  status: string; method: string; email: string; contact: string; created_at: string
}

export async function fetchRazorpayPayments(): Promise<{ configured: boolean; payments: RazorpayPayment[]; error?: string }> {
  const res = await fetch(`${API_URL}/api/admin/razorpay/payments`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export interface TokenActivity {
  id: number; keyword: string; leads: number; tokens_used: number
  status: string; created_at: string; user_name: string; user_email: string
}

export async function fetchTokenActivity(): Promise<TokenActivity[]> {
  const res = await fetch(`${API_URL}/api/admin/token-activity`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return (await res.json()).activity
}

export interface AdminLead {
  id: number; keyword: string; assigned_at: string
  business_name: string; phone: string; website: string; email: string; address: string
  user_name: string; user_email: string
}

export async function fetchLeads(): Promise<{ leads: AdminLead[]; total: number }> {
  const res = await fetch(`${API_URL}/api/admin/leads`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export interface Recharge {
  id: number; amount_usd: number; note: string; created_at: string
}

export async function fetchRecharges(): Promise<{ recharges: Recharge[]; total_usd: number }> {
  const res = await fetch(`${API_URL}/api/admin/outscraper-recharges`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export async function addRecharge(amount_usd: number, note: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/outscraper-recharges`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ amount_usd, note }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to add recharge')
}

export async function deleteRecharge(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/outscraper-recharges/${id}`, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw new Error('Failed to delete recharge')
}

export interface AdminTransaction {
  id: number; type: string; amount: number; description: string
  created_at: string; user_name: string; user_email: string
}

export async function fetchTransactions(): Promise<AdminTransaction[]> {
  const res = await fetch(`${API_URL}/api/admin/transactions`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return (await res.json()).transactions
}

export interface AdminInvoice {
  id: number; invoice_number: string; amount_paid_inr: number
  created_at: string; status: string; plan_name: string
  price_inr: number; plan_tokens: number
  user_name: string; user_email: string; user_phone: string | null
  user_city: string | null; business_name: string | null; user_gst: string | null
}

export async function fetchInvoices(): Promise<AdminInvoice[]> {
  const res = await fetch(`${API_URL}/api/admin/invoices`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return (await res.json()).invoices
}
