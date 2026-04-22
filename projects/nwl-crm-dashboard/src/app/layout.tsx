import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NWL CRM Dashboard',
  description:
    'NHS North West London Cardiovascular-Renal-Metabolic Local Enhanced Service 2026-27 analytics dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning on <html> and <body>: browser extensions
  // (Grammarly, InboxSDK, etc.) inject data-* attributes into these elements
  // before React hydrates, which triggers a false-positive mismatch warning.
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
