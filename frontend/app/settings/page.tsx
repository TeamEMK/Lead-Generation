'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings, User, Building2, Phone, MapPin, FileText,
  Save, Trash2, Eye, EyeOff, AlertTriangle, CheckCircle2,
  Loader2, Sparkles, X,
} from 'lucide-react'
import { fetchProfile, updateProfile, deleteAccount, type UserProfile } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 dark:focus:border-brand-500 transition-all"
const labelCls = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"

export default function SettingsPage() {
  const router = useRouter()
  const { logout } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [gst, setGst] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Delete account
  const [showDelete, setShowDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePw, setShowDeletePw] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
      .then(p => {
        setProfile(p)
        setName(p.name ?? '')
        setPhone(p.phone ?? '')
        setCity(p.city ?? '')
        setBusinessName(p.business_name ?? '')
        setGst(p.gst ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)
    if (phone && !/^\d{10}$/.test(phone)) { setSaveError('Mobile must be exactly 10 digits'); return }
    setSaving(true)
    try {
      const updated = await updateProfile({ name, phone, city, businessName, gst: gst || undefined })
      setProfile(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteAccount(deletePassword)
      logout()
      router.push('/')
    } catch (e: any) {
      setDeleteError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage your profile and account preferences</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          {/* Profile form */}
          <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141c32] shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-white/[0.04]">
              <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-brand-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile information</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Update your personal and business details</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {saveError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />{saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Profile updated successfully
                </div>
              )}

              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}><User className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />Full name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email address</label>
                  <input type="email" value={profile?.email ?? ''} disabled
                    className={`${inputCls} opacity-50 cursor-not-allowed`} />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Email cannot be changed</p>
                </div>
              </div>

              {/* Phone + City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />Mobile number
                    </label>
                    {phone.length > 0 && (
                      <span className={`text-xs font-medium tabular ${phone.length === 10 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {phone.length}/10
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.06] text-sm font-semibold text-slate-600 dark:text-slate-300 select-none flex-shrink-0">
                      🇮🇳 +91
                    </div>
                    <input type="tel" value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210" maxLength={10}
                      className={`${inputCls} ${phone.length > 0 && phone.length < 10 ? 'border-amber-300 dark:border-amber-500/40' : phone.length === 10 ? 'border-emerald-300 dark:border-emerald-500/40' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)}
                    placeholder="Jaipur" className={inputCls} />
                </div>
              </div>

              {/* Business name + GST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}><Building2 className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />Business name</label>
                  <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                    placeholder="My Agency" className={inputCls} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <FileText className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />GST number
                    </label>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Optional</span>
                  </div>
                  <input type="text" value={gst} onChange={e => setGst(e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5" maxLength={15} className={inputCls} />
                </div>
              </div>

              {/* Member since */}
              {profile?.created_at && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Member since {new Date(profile.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button type="submit" disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-500/20 disabled:opacity-60 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>

          {/* Danger zone */}
          <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-[#141c32] shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Danger zone</p>
                <p className="text-xs text-rose-500 dark:text-rose-500">These actions are permanent and cannot be undone</p>
              </div>
            </div>

            <div className="p-6">
              {!showDelete ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Delete account</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Permanently deletes your account, all leads, history, and billing data. Cannot be recovered.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDelete(true)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete account
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDelete} className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-rose-700 dark:text-rose-300">
                      This will permanently delete your account and all associated data. Enter your password to confirm.
                    </p>
                  </div>

                  {deleteError && (
                    <div className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
                      {deleteError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm your password</label>
                    <div className="relative">
                      <input
                        type={showDeletePw ? 'text' : 'password'}
                        required value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder="Enter your password"
                        className={inputCls + ' pr-11'}
                      />
                      <button type="button" onClick={() => setShowDeletePw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        {showDeletePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setShowDelete(false); setDeletePassword(''); setDeleteError(null) }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button type="submit" disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold disabled:opacity-60 transition-all shadow-md shadow-rose-500/20">
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {deleting ? 'Deleting…' : 'Yes, delete my account'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
