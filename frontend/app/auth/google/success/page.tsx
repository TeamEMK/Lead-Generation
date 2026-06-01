'use client'

import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function GoogleAuthSuccess() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: 'google_connected' }, window.location.origin)
      setTimeout(() => window.close(), 800)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0e1117]">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Google connected!</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">This window will close automatically.</p>
      </div>
    </div>
  )
}
