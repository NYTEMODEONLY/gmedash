import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL('https://gmedash.vercel.app'),
  title: {
    default: 'GME Dashboard | Real-Time GameStop Stock Tracker',
    template: '%s | GME Dashboard',
  },
  description: 'Track GameStop (GME) stock in real-time with live price data, SEC filings, news aggregation, and investor insights. The ultimate GME investor dashboard.',
  keywords: [
    'GameStop',
    'GME',
    'GME stock',
    'GameStop stock price',
    'GME dashboard',
    'stock tracker',
    'Ryan Cohen',
    'SEC filings',
    'GME news',
    'meme stock',
    'NYSE GME',
    'GameStop investor relations',
    'GME live price',
    'GameStop charts',
    'short interest',
    'GME analysis',
  ],
  authors: [
    { name: 'NYTEMODE', url: 'https://nytemode.com' },
  ],
  creator: 'NYTEMODE',
  publisher: 'NYTEMODE',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gmedash.vercel.app',
    siteName: 'GME Dashboard',
    title: 'GME Dashboard | Real-Time GameStop Stock Tracker',
    description: 'Track GameStop (GME) stock in real-time with live price data, SEC filings, news aggregation, and investor insights.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GME Dashboard - GameStop Stock Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GME Dashboard | Real-Time GameStop Stock Tracker',
    description: 'Track GameStop (GME) stock in real-time with live price data, SEC filings, news aggregation, and investor insights.',
    images: ['/og-image.png'],
    creator: '@ryancohen',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://gmedash.vercel.app',
  },
  category: 'finance',
  classification: 'Stock Tracker, Financial Dashboard',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'GME Dashboard',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#E31837',
    'msapplication-config': '/browserconfig.xml',
  },
}

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'GME Dashboard',
  description: 'Real-time GameStop (GME) stock dashboard with live price data, SEC filings, and news aggregation.',
  url: 'https://gmedash.vercel.app',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'NYTEMODE',
    url: 'https://nytemode.com',
  },
  about: {
    '@type': 'Corporation',
    name: 'GameStop Corp.',
    tickerSymbol: 'GME',
    exchange: 'NYSE',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://query1.finance.yahoo.com" />
        <link rel="dns-prefetch" href="https://finnhub.io" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-gme-light-100 dark:bg-gme-dark min-h-screen antialiased transition-colors duration-200`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
