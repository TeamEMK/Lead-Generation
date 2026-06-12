import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Admin — GMB Lead Generator',
  description: 'Admin dashboard',
}

const themeScript = `(function(){try{var t=localStorage.getItem('admin_theme');if(t? t==='dark' : true){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  )
}
