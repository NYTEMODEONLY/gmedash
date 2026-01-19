# GameStop (GME) Dashboard

A comprehensive, real-time dashboard for GameStop (GME) investors. View live stock data, SEC filings, Ryan Cohen tweets, press releases, and company news all in one place.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Live Stock Data
- **Real-time Stock Price** - Updates every 30 seconds during market hours
- **Market Status Indicator** - Pre-market, Open, After-hours, Closed
- **Price Flash Animation** - Visual feedback when price changes
- **Day Range Indicator** - Visual slider showing current price position

### Charts & Analytics
- **Price Charts** - Interactive historical charts (1W, 1M, 3M, 6M, 1Y, 5Y)
- **Volume Analysis** - Trading volume visualization
- **Short Interest** - Track short positions over time

### Company Information
- **Company Overview** - Key metrics, financials, company details
- **CEO, Headquarters, Industry** - Essential company information
- **Market Cap, P/E Ratio, EPS, Beta** - Financial indicators
- **52-Week Range** - Visual price range indicator

### News & Social
- **Ryan Cohen Twitter Feed** - Embedded timeline from @ryancohen
- **Latest News** - Aggregated GME news from Yahoo Finance & Google News
- **Press Releases** - Official GameStop investor relations announcements

### Regulatory Filings
- **SEC Filings** - 10-K, 10-Q, 8-K documents from SEC EDGAR
- **Upcoming Events** - Earnings dates, annual meetings, filing deadlines

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Date Utilities**: date-fns

## Data Sources

| Data Type | Source | API Key Required |
|-----------|--------|------------------|
| Stock Quotes | Yahoo Finance API | No |
| Historical Data | Yahoo Finance API | No |
| SEC Filings | SEC EDGAR API | No |
| News | Yahoo Finance RSS, Google News RSS | No |
| Press Releases | GameStop IR, SEC 8-K Filings | No |
| Twitter | Twitter Embed Widget | No |

**No API keys required!** All data sources use public APIs.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gmedash
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Option 2: Git Integration

1. Push your code to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Vercel will automatically deploy on every push

### Option 3: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## Project Structure

```
gmedash/
├── app/
│   ├── api/                 # API routes
│   │   ├── stock/          # Stock quote endpoint
│   │   ├── historical/     # Historical data endpoint
│   │   ├── news/           # News aggregation endpoint
│   │   ├── sec/            # SEC filings endpoint
│   │   ├── twitter/        # Twitter data endpoint
│   │   ├── press-releases/ # Press releases endpoint
│   │   ├── company-info/   # Company info endpoint
│   │   └── events/         # Upcoming events endpoint
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   └── icon.svg            # Favicon
├── components/
│   ├── Header.tsx          # Header with market status
│   ├── StockInfoCard.tsx   # Live stock price card
│   ├── CompanyOverview.tsx # Company information
│   ├── PriceChart.tsx      # Price history chart
│   ├── VolumeChart.tsx     # Volume chart
│   ├── ShortingChart.tsx   # Short interest chart
│   ├── RyanCohenTwitter.tsx# Twitter feed
│   ├── NewsSection.tsx     # News articles
│   ├── SECFilings.tsx      # SEC filings table
│   ├── PressReleases.tsx   # Press releases
│   ├── UpcomingEvents.tsx  # Events calendar
│   └── Footer.tsx          # Footer with links
├── lib/
│   └── api.ts              # API client utilities
└── public/
    ├── icon.svg            # Public favicon
    └── manifest.json       # PWA manifest
```

## API Endpoints

| Endpoint | Description | Update Frequency |
|----------|-------------|------------------|
| `/api/stock` | Live stock quote | 30 seconds |
| `/api/historical` | Historical price data | On demand |
| `/api/news` | Aggregated news | 5 minutes |
| `/api/sec` | SEC filings | 10 minutes |
| `/api/press-releases` | Press releases | 15 minutes |
| `/api/company-info` | Company metrics | On demand |
| `/api/events` | Upcoming events | On demand |

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- First Load JS: ~140 kB (page) + 82 kB (shared)
- Static generation with dynamic API routes
- Responsive design for all screen sizes

## Legal Disclaimer

This dashboard is for informational purposes only and should not be considered financial advice. All data is sourced from third-party APIs and may have delays. Stock trading involves substantial risk of loss. Past performance does not guarantee future results.

This is not an official GameStop product. GameStop and the GameStop logo are trademarks of GameStop Corp.

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with Next.js and Tailwind CSS. Deployed on Vercel.
