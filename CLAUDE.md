# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start dev server at http://localhost:3000 with hot reload
npm run build    # Production build (outputs to .next/)
npm start        # Run production build locally
npm run lint     # ESLint checks
```

## Architecture Overview

This is a **Next.js 14 App Router** dashboard displaying real-time GameStop (GME) financial data. All data is fetched from free public APIs.

### Data Flow
```
Client Components → lib/api.ts → /app/api/* routes → External APIs
                                       ↓
                              lib/cache.ts (TTL cache)
```

### Key Directories
- **app/api/** - 11 API route handlers with caching layer
- **components/** - React client components ('use client' directive)
- **lib/** - Shared utilities: api.ts (client), cache.ts (caching), data-providers.ts (fetching), ThemeContext.tsx (theming)

### Data Sources & Cache TTLs
| Source | Purpose | Cache |
|--------|---------|-------|
| Yahoo Finance | Stock quotes, historical data | 30s (market open) / 5m (closed) |
| Google News RSS | News aggregation (IR excluded) | 5 min |
| Bing News RSS | News aggregation (secondary, IR excluded) | 5 min |
| GameStop IR Feed | Press releases (company announcements only) | 5 min |
| SEC EDGAR | SEC filings (10-K, 10-Q, 8-K) | 10 min |
| Finnhub / Yahoo | Short interest (premium, optional) | 24 hours |
| Finnhub (optional) | Company metrics | 1 hour |

### Theming System
- Uses React Context (`lib/ThemeContext.tsx`)
- Modes: 'dark', 'light', 'system'
- Persists to localStorage as `gme-theme`
- Uses Tailwind's `dark:` class strategy

### Premium Features (require paid APIs)
- Short Interest Data - requires Finnhub/ORTEX
- Ryan Cohen Twitter Feed - requires X API ($100/mo)
- Options Flow - requires CBOE/Unusual Whales

## Key Patterns

### Adding an API endpoint:
1. Create `/app/api/[feature]/route.ts` with GET handler
2. Use `cache.get()`/`cache.set()` from `lib/cache.ts`
3. Add client function in `lib/api.ts`
4. Call from component

### Component structure:
```typescript
'use client';
import { SomeType } from '@/lib/api';
interface Props { data: SomeType; isLoading: boolean; }
export default function Component({ data, isLoading }: Props) { ... }
```

### Styling:
- Tailwind with custom GME colors: `gme-red`, `gme-dark-*`, `stock-green`, `stock-red`
- Dark mode: prefix with `dark:`
- Responsive: `sm:`, `lg:` breakpoints

## Environment Variables

Optional - all features work without them, but these enable premium data:
- `FINNHUB_API_KEY` - Enables company metrics (Market Cap, P/E, EPS, Beta) and short interest when available

## Tech Stack

- Next.js 14.0.4 (App Router)
- React 18, TypeScript 5
- Tailwind CSS 3.3.0
- Recharts 2.8.0 (charts)
- Axios (HTTP), date-fns (dates)
