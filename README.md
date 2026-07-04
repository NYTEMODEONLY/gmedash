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
- **Live Company Facts** - CEO and employee range from the latest SEC 10-K; founded year from Wikipedia's public summary API
- **Investor Snapshot** - Balance sheet liquidity, debt, net income, store footprint, segment/product mix, shareholder registration, and Bitcoin/capital-allocation disclosures
- **Turnaround Progress** - Year-over-year SEC annual filing trend for revenue, gross margin, net income, liquidity, debt, stores, DRS/registered shares, and shares outstanding
- **Insider Transactions** - SEC Form 3/4/5 ownership transactions for board, officer, and Section 16 buys, sells, awards, and dispositions
- **Quick Links** - Direct links to the source filing, Yahoo Finance, SEC EDGAR, Wikipedia, TradingView, and investor relations

### News & Updates
- **Latest News** - Aggregated GME news from Google News & Bing News RSS (IR excluded)
- **Press Releases** - Official GameStop investor relations announcements (IR feed)
- **SEC Filings** - Latest EDGAR submissions from SEC, including newer forms such as 425 and 144
- **Upcoming Events** - Confirmed GameStop IR event feed and Yahoo Finance metadata only

### User Experience
- **Dark/Light Mode** - Full theme support with smooth transitions
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Accessibility** - Focus states, reduced motion support, high contrast mode
- **Live Mode Toggle** - Switch between live updates and manual refresh

---

## Source Coverage

The dashboard uses free public sources only. If a source is unavailable or does not expose a confirmed current value, the app shows an unavailable state instead of mock, paid, or estimated data. Source links are exposed in the relevant dashboard cards so end users can verify the underlying data.

| Widget | Current Behavior | In-App Source Link |
|--------|------------------|--------------------|
| **Header / Controls** | Local refresh, theme, and live-mode state only | No external data source; browser/app state |
| **Live Quote Card** | Current OHLCV quote with live refresh cadence | Yahoo Finance chart API, Yahoo Finance quote page, TradingView quote page |
| **Historical Price Chart** | End-of-day historical prices | Yahoo Finance GME history page |
| **Volume Chart** | End-of-day historical volume | Yahoo Finance GME history page |
| **Company Overview** | SEC identity, CEO, employees, headquarters, market metrics, founded year | SEC 10-K archive filing, SEC EDGAR company page, Yahoo Finance key statistics, Wikipedia page |
| **Investor Snapshot** | Liquidity, debt, FY results, stores, product mix, shareholder base, DRS/DSPP context, Bitcoin disclosures | Latest GameStop SEC 10-K archive filing, SEC EDGAR company page, Coinbase BTC spot page |
| **Turnaround Progress** | Year-over-year revenue, gross margin, net income, liquidity, debt, stores, registered shares, record holders, and shares outstanding | SEC companyfacts XBRL API and exact SEC 10-K archive filing links |
| **Insider Transactions** | Recent Form 3/4/5 board, officer, and Section 16 transactions with buy/sell code summaries | Exact SEC ownership filing links and SEC EDGAR ownership page |
| **Short Interest** | Live reported short-position history | FINRA Consolidated Short Interest page |
| **Press Releases** | Official GameStop announcements from the IR feed | Exact GameStop IR release links and GameStop IR news releases page |
| **News** | Third-party GME news excluding official IR releases | Original article URLs, Google News GME search, Bing News GME search |
| **SEC Filings** | Latest EDGAR filings with filing links | Exact SEC archive filing links and SEC EDGAR company page |
| **Upcoming Events** | Confirmed events only; no estimates if sources are empty | GameStop IR events page and Yahoo Finance quote/chart metadata page |
| **Footer Source Registry** | Project-level source directory | GameStop, GameStop IR, SEC EDGAR, Yahoo Finance, FINRA, Coinbase, WhyDRS, DRSGME, GitHub |
| **Options** | Not shown as a core card until a reliable free public source is wired; API returns an unavailable state | N/A |

### Accuracy Contract

- The app does not use mock records, static fake finance values, or paid API-only fields.
- Company/fundamental facts are factual to the cited filing or public-source response date.
- Market, news, RSS, and third-party feeds can have source-side delays or outages; the UI surfaces source links and unavailable states rather than silently inventing values.
- Bitcoin spot price is shown only as live context for the SEC-disclosed pledged BTC amount and is not presented as a formal company holding valuation.

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
| Stock Quotes | Yahoo Finance chart API | Free | Active |
| Historical Data | Yahoo Finance chart API | Free | Active |
| News | Google News RSS, Bing News RSS (IR excluded) | Free | Active |
| SEC Filings | SEC EDGAR Database | Free | Active |
| Press Releases | GameStop Investor Relations (IR feed) | Free | Active |
| Company Info | SEC submissions, SEC 10-K, Yahoo Finance, Wikipedia summary API | Free | Active |
| Investor Snapshot | SEC 10-K, Coinbase BTC spot | Free | Active |
| Turnaround Progress | SEC companyfacts XBRL API, SEC 10-K archive filings | Free | Active |
| Insider Transactions | SEC Forms 3/4/5 ownership filings | Free | Active |
| Upcoming Events | Confirmed Yahoo Finance metadata and GameStop IR links | Free | Active |
| Short Interest | FINRA public API | Free | Active |
| Options Flow | No reliable free source configured; unavailable response only | Free | Disabled |

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

### Environment Variables

No environment variables are required. The dashboard works out of the box with free public sources.

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
│   │   ├── investor-snapshot/ # SEC-backed investor facts
│   │   ├── turnaround/     # SEC year-over-year turnaround metrics
│   │   ├── insider-transactions/ # SEC ownership transactions
│   │   ├── events/         # Upcoming events
│   │   ├── short-interest/ # FINRA short interest
│   │   └── options-flow/   # Unavailable response until a reliable free source exists
│   ├── globals.css         # Global styles & theme
│   ├── layout.tsx          # Root layout with metadata
│   └── page.tsx            # Main dashboard
├── components/
│   ├── Header.tsx          # Header with theme toggle
│   ├── StockInfoCard.tsx   # Live stock card
│   ├── CompanyOverview.tsx # Company information
│   ├── InvestorSnapshot.tsx# SEC-backed investor facts
│   ├── TurnaroundProgress.tsx # SEC annual trend dashboard
│   ├── InsiderTransactions.tsx# SEC Form 3/4/5 transactions
│   ├── PriceChart.tsx      # Price history chart
│   ├── VolumeChart.tsx     # Volume chart
│   ├── ShortingChart.tsx   # FINRA short interest
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
- Share the project with other GME investors

---

Built with Next.js and Tailwind CSS. Deployed on Vercel. A [nytemode](https://nytemode.com) project.
