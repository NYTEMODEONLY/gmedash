import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#dc2626',
}

export const metadata: Metadata = {
  title: 'GameStop (GME) Dashboard | Live Stock Data, SEC Filings & News',
  description: 'Real-time GameStop (GME) stock dashboard with live price data, SEC filings, Ryan Cohen tweets, press releases, and company news. All the information investors need at a glance.',
  keywords: 'GameStop, GME, stock, dashboard, trading, finance, SEC filings, Ryan Cohen, stock price, investor relations, meme stock',
  authors: [{ name: 'GME Dashboard' }],
  creator: 'GME Dashboard',
  publisher: 'GME Dashboard',
  robots: 'index, follow',
  openGraph: {
    title: 'GameStop (GME) Dashboard',
    description: 'Real-time GameStop stock data, charts, news, and SEC filings dashboard',
    type: 'website',
    siteName: 'GME Dashboard',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GameStop (GME) Dashboard',
    description: 'Real-time GameStop stock data, charts, news, and SEC filings dashboard',
    creator: '@ryancohen',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} bg-gray-50 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  )
}
