import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'GMB Leads Extractor',
  description: 'Generate business leads from Google Maps',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-slate-50 dark:bg-[#0d1228] min-h-screen transition-colors duration-200`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
