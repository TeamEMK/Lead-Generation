'use client'

import { useEffect } from 'react'
import { XCircle } from 'lucide-react'

export default function GoogleAuthError() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: 'google_error' }, window.location.origin)
      setTimeout(() => window.close(), 1500)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0d1228]">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto">
          <XCircle className="w-7 h-7 text-rose-500" />
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Connection failed</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Please try again.</p>
      </div>
    </div>
  )
}
