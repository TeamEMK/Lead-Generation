const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

export interface Lead {
  id: number
  timestamp: string
  keyword: string
  businessName: string
  phone: string
  website: string
  email: string
  address: string
}

export interface GenerationRun {
  id: number
  keywords: string[]
  total_found: number
  created_at: string
}

export interface Analytics {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  withPhone: number
  withWebsite: number
  chartData: { date: string; count: number }[]
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(`${API_URL}/api/leads`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch leads')
  return (await res.json()).leads
}

export async function fetchHistory(): Promise<GenerationRun[]> {
  const res = await fetch(`${API_URL}/api/leads/history`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch history')
  return (await res.json()).runs
}

export async function fetchRunLeads(runId: number): Promise<{ run: GenerationRun; leads: Lead[] }> {
  const res = await fetch(`${API_URL}/api/leads/history/${runId}`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch run leads')
  return res.json()
}

export async function fetchAnalytics(): Promise<Analytics> {
  const res = await fetch(`${API_URL}/api/analytics`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return res.json()
}

export async function clearAllLeads(): Promise<number> {
  const res = await fetch(`${API_URL}/api/leads/all`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to clear leads')
  return data.deleted
}

export async function deleteLeads(ids: number[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/leads`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error('Failed to delete leads')
}

export interface Plan {
  id: number
  name: string
  price_inr: number
  tokens: number
  price_per_token: number
  popular: boolean
}

export async function fetchPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_URL}/api/tokens/plans`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch plans')
  return (await res.json()).plans
}

export async function fetchTokenBalance(): Promise<number> {
  const res = await fetch(`${API_URL}/api/tokens/balance`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch token balance')
  return (await res.json()).balance
}

export interface Subscription {
  balance: number
  active_plan: Plan | null
  subscriptions: {
    id: number
    plan_name: string
    plan_tokens: number
    price_inr: number
    tokens_purchased: number
    amount_paid_inr: number
    status: string
    invoice_number: string | null
    expires_at: string | null
    created_at: string
  }[]
  transactions: {
    id: number
    type: string
    amount: number
    description: string
    created_at: string
  }[]
}

export async function fetchSubscription(): Promise<Subscription> {
  const res = await fetch(`${API_URL}/api/tokens/subscription`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch subscription')
  return res.json()
}

export async function purchasePlan(planId: number): Promise<{ balance: number; tokens_added: number; plan: Plan }> {
  const res = await fetch(`${API_URL}/api/tokens/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ planId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Purchase failed')
  return data
}

export interface UserProfile {
  id: number
  name: string
  email: string
  phone: string | null
  city: string | null
  business_name: string | null
  gst: string | null
  created_at: string
}

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/auth/me`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return (await res.json()).user
}

export async function updateProfile(data: { name: string; phone: string; city: string; businessName: string; gst?: string }): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Update failed')
  return json.user
}

export interface PlanStatus {
  balance: number
  plan_name: string | null
  expires_at: string | null
  days_remaining: number | null
}

export async function fetchPlanStatus(): Promise<PlanStatus> {
  const res = await fetch(`${API_URL}/api/tokens/status`, { headers: authHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch plan status')
  return res.json()
}

export async function deleteAccount(password: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ password }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Deletion failed')
}
