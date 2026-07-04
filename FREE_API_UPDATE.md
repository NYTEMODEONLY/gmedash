# Free Public Data Source Contract

The GameStop Dashboard uses free public data sources only. No API keys, paid feeds, mirror scraping, or mock finance records are required for the current dashboard.

## Current Source Map

| Data Type | Source | Reliability Policy |
|-----------|--------|--------------------|
| Stock quote | Yahoo Finance chart API | Live quote endpoint with 30 second market-hours cache and 5 minute closed-market cache |
| Historical prices and volume | Yahoo Finance chart API | End-of-day chart data with source metadata in chart cards |
| News | Google News RSS and Bing News RSS | Aggregated third-party articles, excluding official IR releases |
| Press releases | Official GameStop Investor Relations feed | Validated GameStop IR release URLs only |
| SEC filings | SEC EDGAR submissions and archives | Official filing links |
| Company facts | SEC submissions, latest 10-K, Yahoo Finance chart metadata, Wikipedia summary API | Filing facts take precedence; unavailable metrics stay blank |
| Investor snapshot | Latest SEC 10-K plus Coinbase public BTC spot context | SEC facts are filing-dated; BTC price is contextual only |
| Turnaround progress | SEC companyfacts XBRL API and exact 10-K filings | Filing-backed annual metrics |
| Insider transactions | SEC Forms 3/4/5 ownership filings | Exact SEC ownership filing links |
| Short interest | FINRA consolidated short-interest page/API | Reported short-interest cycles |
| Upcoming events | Confirmed GameStop IR links and Yahoo Finance metadata | No estimated events |
| Options flow | None configured | API returns an unavailable state until a reliable free public source exists |

## Removed Sources

- Stooq quote CSV was removed from the live quote path because the former quote endpoint returned 404 for GME.
- Ryan Cohen/X widgets and `/api/twitter` were removed because the project does not currently have proper X API access.
- Nitter/Jina public X mirrors are not used. Do not re-add mirror scraping without a clear source, attribution, reliability, and compliance review.
- MarketWatch is not presented as an in-app data source because no dashboard data is currently fetched from it.

## Accuracy Policy

- Every core dashboard section should expose a user-facing source link or item-level source link.
- SEC-backed facts must link to the relevant SEC filing or EDGAR page.
- Market-backed facts must link to Yahoo Finance or another active market source page.
- News and press releases must link to the original article or official GameStop IR release.
- The app should show an empty or unavailable state when a public source cannot confirm a value.
- The app must not invent data, backfill mock records, or silently replace missing live values with estimates.

## Implementation Notes

- `getStockQuote()` uses the app `/api/stock` route backed by Yahoo Finance chart data.
- `getHistoricalData()` uses the app `/api/historical` route backed by Yahoo Finance chart data.
- `/api/press-releases` validates official GameStop IR feed records and returns real IR article URLs.
- `/api/options-flow` intentionally returns an unavailable response rather than scraped, blocked, paid, or estimated records.
- `/api/twitter` and the Ryan Cohen UI widget have been removed until proper X API access exists.

## Deployment

The project is deployable from GitHub to Vercel without environment variables. Production data quality depends on the public source endpoints above being reachable from Vercel.
