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
  pricing: {
    usd_inr: number; price_pro_usd: number; price_ent_usd: number
    free_pro: number; free_ent: number
  }
  trend: { date: string; revenue: number; leads: number; calls: number; cost_inr: number }[]
  top_users: { name: string; email: string; tokens_used: number; leads: number; calls: number; cost_inr: number }[]
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
}

export async function fetchSubscriptions(): Promise<AdminSubscription[]> {
  const res = await fetch(`${API_URL}/api/admin/subscriptions`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error('Unauthorized')
  return (await res.json()).subscriptions
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
