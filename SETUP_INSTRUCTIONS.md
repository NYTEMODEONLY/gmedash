# Quick Setup Instructions

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables (Optional)
Core market, filing, news, and investor-relations data uses completely free public APIs - no API keys required.

```bash
cp env.example .env.local
```

The `.env.local` file is optional for dashboard data.

To enable anonymous feedback submissions into GitHub Issues, add:

```bash
GITHUB_FEEDBACK_TOKEN=github_pat_or_fine_grained_token
GITHUB_FEEDBACK_REPO=NYTEMODEONLY/gmedash
```

Use a fine-grained GitHub token scoped to this repository with Issues read/write access. Do not expose this token with a `NEXT_PUBLIC_` prefix.

#### Data Sources (All Free):
- **Yahoo Finance chart API**: Real-time stock quote and historical chart data (no key required)
- **Google News + Bing News RSS**: Public news feeds (IR excluded)
- **SEC EDGAR**: Official SEC filings (no key required)
- **SEC 10-K**: Company facts and investor snapshot metrics
- **GameStop IR Feed**: Official press releases from investor relations with real article links
- **FINRA**: Public consolidated short-interest data (no key required)
- **Wikipedia Summary API**: Founded year reference
- **Coinbase Public Price API**: BTC spot context for SEC-disclosed Bitcoin collateral
- **Options flow**: Returns an unavailable state until a reliable free public source exists
- **Feedback submissions**: Optional GitHub Issues write path for anonymous visitor requests and accuracy reports

### 3. Run the Application
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 📱 What You'll See

- **Header**: Title, live indicator, refresh button
- **Stock Info Card**: Current GME price and OHLCV data
- **Company Overview**: SEC/Wikipedia/Yahoo-backed company facts with source links
- **Investor Snapshot**: SEC-backed liquidity, debt, store, shareholder, product mix, segment, and capital-allocation facts
- **Price Chart**: Interactive historical price chart (1M/3M/6M/1Y)
- **Short Interest Chart**: FINRA shares-short and days-to-cover history
- **Volume Chart**: Trading volume analysis
- **News Section**: Latest GameStop and GME news
- **Press Releases**: Official GameStop IR release feed
- **SEC Filings**: Recent SEC filings table
- **Footer**: Disclaimers and links
- **Feedback page**: Anonymous data requests and accuracy reports stored as GitHub Issues when configured

## 🔧 Features

- ✅ Real-time stock data
- ✅ Interactive charts with Recharts
- ✅ Responsive design (mobile-first)
- ✅ Loading states and error handling
- ✅ Time period selection
- ✅ Data refresh functionality
- ✅ User-facing source links for core data sections
- ✅ Anonymous feedback and data request loop via GitHub Issues
- ✅ TypeScript support
- ✅ Tailwind CSS styling

## 🚀 Deploy to Vercel

1. Push to GitHub
2. Connect to Vercel
3. Deploy. No environment variables are required for dashboard data.
4. Optional: set `GITHUB_FEEDBACK_TOKEN` and `GITHUB_FEEDBACK_REPO` in Vercel Project Environment Variables to enable public feedback submissions.

## 📄 Full Documentation

See `README.md` for complete documentation, troubleshooting, and customization options. 
