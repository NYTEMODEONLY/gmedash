# Quick Setup Instructions

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables (Optional)
This application uses completely free APIs - no API keys required!

```bash
cp env.example .env.local
```

The `.env.local` file is optional since no API keys are needed.

#### Data Sources (All Free):
- **Yahoo Finance API**: Real-time stock data (no key required)
- **Google News + Bing News RSS**: Public news feeds (IR excluded)
- **SEC EDGAR**: Official SEC filings (no key required)
- **GameStop IR Feed**: Official press releases from investor relations
- **Short Interest (Premium)**: Finnhub API key optional, Yahoo fallback when available

### 3. Run the Application
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 📱 What You'll See

- **Header**: Title, live indicator, refresh button
- **Stock Info Card**: Current GME price and OHLCV data
- **Price Chart**: Interactive historical price chart (1M/3M/6M/1Y)
- **Short Interest Chart**: Short interest percentage over time
- **Volume Chart**: Trading volume analysis
- **News Section**: Latest GameStop and GME news
- **SEC Filings**: Recent SEC filings table
- **Footer**: Disclaimers and links

## 🔧 Features

- ✅ Real-time stock data
- ✅ Interactive charts with Recharts
- ✅ Responsive design (mobile-first)
- ✅ Loading states and error handling
- ✅ Time period selection
- ✅ Data refresh functionality
- ✅ TypeScript support
- ✅ Tailwind CSS styling

## 🚀 Deploy to Vercel

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## 📄 Full Documentation

See `README.md` for complete documentation, troubleshooting, and customization options. 
