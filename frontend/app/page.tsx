'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Zap, MapPin, Sheet, BarChart3, Users, Mail, Shield, ArrowRight,
  CheckCircle2, Star, ChevronDown, Menu, X, Sparkles, Database,
  Globe, Phone, TrendingUp, Layers, Send,
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: MapPin,
    title: 'Google Maps Integration',
    desc: 'Search any business category in any city. We pull every result Google Maps has — no page limits.',
    color: 'indigo',
  },
  {
    icon: Sheet,
    title: 'Auto Sheet Sync',
    desc: 'Every lead goes straight into your Google Sheet the moment it\'s found. No copy-paste, no CSV uploads.',
    color: 'emerald',
  },
  {
    icon: Mail,
    title: 'Email Scraping',
    desc: 'We visit each business website and extract contact email addresses automatically.',
    color: 'violet',
  },
  {
    icon: Shield,
    title: 'Smart Deduplication',
    desc: 'Already have that lead? We detect duplicates across all your searches and skip them silently.',
    color: 'amber',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    desc: 'See how many leads you\'ve generated today, this week, and this month — with a 30-day chart.',
    color: 'rose',
  },
  {
    icon: Users,
    title: 'Multi-User Ready',
    desc: 'Each team member gets their own account and their own linked sheet. No shared credentials.',
    color: 'sky',
  },
]

const STEPS = [
  {
    number: '01',
    icon: Layers,
    title: 'Enter your keywords',
    desc: 'Type business categories you want to target — "hotel", "dental clinic", "car dealership". One per line.',
  },
  {
    number: '02',
    icon: MapPin,
    title: 'We search Google Maps',
    desc: 'Our engine fetches every business result for each keyword, complete with phone, website, and address.',
  },
  {
    number: '03',
    icon: Database,
    title: 'Leads land in your Sheet',
    desc: 'Results are saved directly to your linked Google Sheet in real time. Duplicates are skipped automatically.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Head of Business Development',
    company: 'GrowthStack',
    avatar: 'SC',
    color: 'indigo',
    quote: 'We used to spend 3 hours a week manually pulling leads from Google Maps. LeadGen cut that to zero. The sheet sync is flawless.',
    stars: 5,
  },
  {
    name: 'Marcus Webb',
    role: 'Founder',
    company: 'Outbound Labs',
    avatar: 'MW',
    color: 'violet',
    quote: 'The deduplication alone is worth it. We run the same keyword across 20 cities and never get a single duplicate. Incredible.',
    stars: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Sales Director',
    company: 'Scalr Agency',
    avatar: 'PS',
    color: 'emerald',
    quote: 'Our SDRs generate 500+ qualified leads a day now. LeadGen is the backbone of our entire outbound motion.',
    stars: 5,
  },
]

const STATS = [
  { value: '2M+', label: 'Leads generated' },
  { value: '150+', label: 'Active teams' },
  { value: '40+', label: 'Countries covered' },
  { value: '< 2min', label: 'Time to first lead' },
]

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = ['Features', 'How it Works', 'Testimonials', 'About', 'Contact']

  function scrollTo(id: string) {
    document.getElementById(id.toLowerCase().replace(/\s+/g, '-'))?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/95 dark:bg-[#0e1117]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.06] shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-[17px] tracking-tight">
            Lead<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">Gen</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(l => (
            <button key={l} onClick={() => scrollTo(l)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
              {l}
            </button>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all">
            Get started
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-slate-600 dark:text-slate-300" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-[#0e1117] border-t border-slate-200 dark:border-white/[0.06] px-6 py-4 space-y-3">
          {navLinks.map(l => (
            <button key={l} onClick={() => scrollTo(l)} className="block text-sm text-slate-600 dark:text-slate-300 font-medium py-1">
              {l}
            </button>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-slate-100 dark:border-white/[0.06]">
            <Link href="/login" className="text-sm font-medium text-center py-2 text-slate-600 dark:text-slate-300">Sign in</Link>
            <Link href="/signup" className="text-sm font-semibold text-center py-2 rounded-xl bg-indigo-600 text-white">Get started</Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)

  function handleContact(e: React.FormEvent) {
    e.preventDefault()
    setContactSent(true)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0e1117] text-slate-900 dark:text-white">
      <LandingNavbar />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 lg:px-10 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-500/10 dark:bg-violet-500/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Google Maps API
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Generate business leads{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500">
              at scale
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Search Google Maps by keyword, scrape contacts from websites, and save every lead directly to your Google Sheet — automatically, in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-base shadow-xl shadow-indigo-500/30 transition-all">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 font-semibold text-base hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-all"
            >
              See how it works
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Hero visual */}
          <div className="mt-16 max-w-4xl mx-auto rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#161b27] shadow-2xl shadow-black/10 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.02]">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 font-mono">LeadGen — Generate</span>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="sm:col-span-1 space-y-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Keywords</p>
                {['Hotel', 'Hospital', 'Car Dealership', 'Dental Clinic', 'Law Firm'].map((k, i) => (
                  <div key={k} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                    <div className={`w-1.5 h-1.5 rounded-full ${i < 3 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">{k}</span>
                  </div>
                ))}
              </div>
              <div className="sm:col-span-2 space-y-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Live results</p>
                {[
                  { name: 'The Grand Hotel Mumbai', phone: '+91 22 6654 1234', status: 'Saved' },
                  { name: 'Apollo Hospitals Delhi', phone: '+91 11 2692 5858', status: 'Saved' },
                  { name: 'Maruti Suzuki Arena Pune', phone: '+91 20 2441 3392', status: 'Saved' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{l.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5" />{l.phone}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                      {l.status}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Searching "Hospital" — 12 found so far…</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 border-y border-slate-100 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">{value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Everything you need to build a pipeline</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              From search to spreadsheet in minutes. No integrations to configure, no exports to manage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="group p-6 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-6 lg:px-10 bg-slate-50 dark:bg-white/[0.01] border-y border-slate-100 dark:border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">From keyword to Google Sheet in 3 steps</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              No technical setup. Link your sheet, type a keyword, hit Generate.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {STEPS.map(({ number, icon: Icon, title, desc }, i) => (
              <div key={number} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%+1rem)] w-8 text-slate-300 dark:text-slate-700">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-indigo-300 dark:text-indigo-700 tracking-widest">{number}</span>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Trusted by sales teams worldwide</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Here's what our users say about going from zero to pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, company, avatar, color, quote, stars }) => (
              <div key={name} className="p-6 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#161b27] flex flex-col gap-4">
                <div className="flex gap-1">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${colorMap[color]}`}>
                    {avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{role} · {company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-24 px-6 lg:px-10 bg-slate-50 dark:bg-white/[0.01] border-y border-slate-100 dark:border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-4">About us</p>
              <h2 className="text-4xl font-extrabold tracking-tight mb-6">Built for teams that run on outbound</h2>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                LeadGen was born out of frustration. Our founders were running outbound sales for a B2B agency and spending hours every week manually copying business details from Google Maps into spreadsheets.
              </p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                We built LeadGen to automate that entirely — from search to sheet, in real time, with zero manual work. Today we help hundreds of sales teams and agencies generate and organize leads at a scale that simply wasn't possible before.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: TrendingUp, label: 'Growing fast', value: '10× in 12 months' },
                  { icon: Globe, label: 'Global reach', value: '40+ countries' },
                  { icon: Users, label: 'Happy users', value: '500+ teams' },
                  { icon: CheckCircle2, label: 'Uptime', value: '99.9% SLA' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Leads generated daily', value: '50,000+', color: 'indigo' },
                { label: 'Keywords processed', value: '1M+', color: 'violet' },
                { label: 'Sheets synced', value: '12,000+', color: 'emerald' },
                { label: 'Duplicates prevented', value: '3.2M+', color: 'amber' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`p-5 rounded-2xl border ${
                  color === 'indigo' ? 'border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10'
                  : color === 'violet' ? 'border-violet-100 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/10'
                  : color === 'emerald' ? 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10'
                  : 'border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10'
                }`}>
                  <p className={`text-2xl font-extrabold ${
                    color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400'
                    : color === 'violet' ? 'text-violet-600 dark:text-violet-400'
                    : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                  }`}>{value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 lg:px-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Ready to fill your pipeline?
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-10">
            Sign up in 30 seconds. Link your Google Sheet. Generate your first leads in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base shadow-xl shadow-indigo-500/30 transition-all">
              Get started for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-24 px-6 lg:px-10 bg-slate-50 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-4">Contact us</p>
              <h2 className="text-4xl font-extrabold tracking-tight mb-6">We'd love to hear from you</h2>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                Have a question about pricing, enterprise plans, or a custom integration? Drop us a message and we'll get back within 24 hours.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Mail, label: 'Email us', value: 'hello@leadgen.io' },
                  { icon: Globe, label: 'Website', value: 'www.leadgen.io' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-[#161b27] rounded-2xl border border-slate-200 dark:border-white/[0.06] shadow-sm p-6">
              {contactSent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Message sent!</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                      <input
                        required
                        value={contactForm.name}
                        onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="you@company.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={contactForm.message}
                      onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Tell us what you're looking for…"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Send message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 dark:border-white/[0.06] py-10 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              Lead<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">Gen</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-600 text-center">
            © {new Date().getFullYear()} LeadGen. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {['Features', 'About', 'Contact'].map(l => (
              <button
                key={l}
                onClick={() => document.getElementById(l.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {l}
              </button>
            ))}
            <Link href="/login" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
