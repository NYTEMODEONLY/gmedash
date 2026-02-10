# GameStop (GME) Dashboard

A comprehensive, real-time dashboard for GameStop (GME) investors. View live stock data, historical charts, SEC filings, company news, and more - all in one elegant interface with full dark/light mode support.

**Live Demo:** [gmedash.vercel.app](https://gmedash.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Live Stock Data
- **Real-time Stock Price** - Live price updates with visual flash animation on changes
- **Market Status Indicator** - Pre-market, Open, After-hours, Closed status
- **Day Range Slider** - Visual indicator showing current price position within daily range
- **Key Metrics** - Open, Close, High, Low, Volume, Previous Close

### Charts & Analytics
- **Interactive Price Chart** - Historical price data with period selection (1M, 3M, 6M, 1Y)
- **Volume Analysis** - Trading volume visualization with statistics
- **Theme-Aware Charts** - Charts adapt colors for optimal visibility in both themes

### Company Information
- **Company Overview** - Business description, sector, industry
- **Key Statistics** - Market cap, P/E ratio, EPS, dividend yield
- **Quick Links** - Direct links to Yahoo Finance, TradingView

### News & Updates
- **Latest News** - Aggregated GME news from Google News & Bing News RSS (IR excluded)
- **Press Releases** - Official GameStop investor relations announcements (IR feed)
- **SEC Filings** - 10-K, 10-Q, 8-K documents from SEC EDGAR
- **Upcoming Events** - Earnings dates, annual meetings, key dates

### User Experience
- **Dark/Light Mode** - Full theme support with smooth transitions
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Accessibility** - Focus states, reduced motion support, high contrast mode
- **Live Mode Toggle** - Switch between live updates and manual refresh

---

## Premium Features (API Access Required)

Some features require paid API subscriptions to display live data. These are marked as "Premium Features" in the dashboard and link to free alternatives:

| Feature | Required API | Why It's Gated | Free Alternative |
|---------|--------------|----------------|------------------|
| **Short Interest Data** | Finnhub, ORTEX, or S3 Partners | Real-time short data requires expensive institutional feeds | [FINRA Short Sale Data](https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data) |
| **Ryan Cohen Twitter Feed** | X/Twitter API (Basic tier: $100/mo) | Twitter API is no longer free | [View on X directly](https://twitter.com/ryancohen) |
| **Options Flow** | CBOE, Unusual Whales, or similar | Real-time options data requires premium subscriptions | Public options chains on broker platforms |

> **Want these features enabled?** Consider [sponsoring the developer](https://github.com/NYTEMODEONLY/gmedash) to help cover premium API costs.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom theme system
- **Charts**: Recharts (responsive, theme-aware)
- **HTTP Client**: Axios
- **Date Utilities**: date-fns
- **Theming**: Custom React Context with system preference detection

## Data Sources

| Data Type | Source | Cost | Status |
|-----------|--------|------|--------|
| Stock Quotes | Yahoo Finance API | Free | Active |
| Historical Data | Yahoo Finance API | Free | Active |
| News | Google News RSS, Bing News RSS (IR excluded) | Free | Active |
| SEC Filings | SEC EDGAR Database | Free | Active |
| Press Releases | GameStop Investor Relations (IR feed) | Free | Active |
| Company Info | Yahoo Finance API | Free | Active |
| Upcoming Events | Manually curated | Free | Active |
| Short Interest | Finnhub API | Paid | Premium |
| Twitter Feed | X/Twitter API | Paid | Premium |
| Options Flow | Various | Paid | Premium |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/NYTEMODEONLY/gmedash.git
cd gmedash

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables (Optional)

The dashboard works out of the box with free APIs. For premium features, create a `.env.local` file:

```bash
# Optional: For premium features
FINNHUB_API_KEY=your_finnhub_key_here
TWITTER_BEARER_TOKEN=your_twitter_token_here
```

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

Or connect your GitHub repo to [Vercel](https://vercel.com) for automatic deployments.

### Other Platforms

Works on any platform supporting Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with `npm run build && npm start`

---

## Project Structure

```
gmedash/
├── app/
│   ├── api/                 # API routes
│   │   ├── stock/          # Live stock quote
│   │   ├── historical/     # Historical price data
│   │   ├── news/           # News aggregation
│   │   ├── sec/            # SEC filings
│   │   ├── press-releases/ # Press releases
│   │   ├── company-info/   # Company metrics
│   │   ├── events/         # Upcoming events
│   │   ├── short-interest/ # Short data (premium)
│   │   ├── twitter/        # Twitter feed (premium)
│   │   └── options-flow/   # Options data (premium)
│   ├── globals.css         # Global styles & theme
│   ├── layout.tsx          # Root layout with metadata
│   └── page.tsx            # Main dashboard
├── components/
│   ├── Header.tsx          # Header with theme toggle
│   ├── StockInfoCard.tsx   # Live stock card
│   ├── CompanyOverview.tsx # Company information
│   ├── PriceChart.tsx      # Price history chart
│   ├── VolumeChart.tsx     # Volume chart
│   ├── ShortingChart.tsx   # Short interest (premium)
│   ├── RyanCohenTwitter.tsx# Twitter feed (premium)
│   ├── NewsSection.tsx     # News articles
│   ├── SECFilings.tsx      # SEC filings table
│   ├── PressReleases.tsx   # Press releases
│   ├── UpcomingEvents.tsx  # Events calendar
│   └── Footer.tsx          # Footer
├── lib/
│   ├── api.ts              # API client
│   ├── ThemeContext.tsx    # Theme provider
│   └── cache.ts            # Caching utilities
└── public/
    ├── icon.svg            # Favicon
    └── manifest.json       # PWA manifest
```

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

- WCAG 2.1 AA compliant contrast ratios
- Keyboard navigation with visible focus states
- Reduced motion support (`prefers-reduced-motion`)
- High contrast mode support (`prefers-contrast`)
- Screen reader friendly

---

## Legal Disclaimer

This dashboard is for **informational purposes only** and should not be considered financial advice. All data is sourced from third-party APIs and may have delays. Stock trading involves substantial risk of loss. Past performance does not guarantee future results.

**This is not an official GameStop product.** GameStop and the GameStop logo are trademarks of GameStop Corp.

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Ways to Contribute
- Report bugs or request features via [Issues](https://github.com/NYTEMODEONLY/gmedash/issues)
- Submit PRs for bug fixes or new features
- Sponsor the project to help cover premium API costs
- Share the project with other GME investors

---

Built with Next.js and Tailwind CSS. Deployed on Vercel.
