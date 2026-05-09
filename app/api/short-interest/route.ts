import { NextResponse } from 'next/server';
import axios from 'axios';
import { cache, CACHE_TTL, CACHE_KEYS } from '@/lib/cache';

// Force dynamic rendering - required for runtime env vars
export const dynamic = 'force-dynamic';

interface ShortInterestData {
  date: string;
  shortInterest: number;
  daysToCover: number;
  sharesShort?: number;
  averageDailyVolume?: number;
  changePercent?: number;
  revisionFlag?: string | null;
  source: string;
}

interface FinraPartitionResponse {
  availablePartitions?: Array<{ partitions: string[] }>;
}

const FINRA_BASE = 'https://api.finra.org';

async function getLatestFinraPartitions(dataset: string, limit: number): Promise<string[]> {
  const response = await axios.get<FinraPartitionResponse>(
    `${FINRA_BASE}/partitions/group/otcmarket/name/${dataset}`,
    {
      timeout: 10000,
      headers: { Accept: 'application/json' },
    }
  );

  return (response.data.availablePartitions || [])
    .map((item) => item.partitions?.[0])
    .filter((date): date is string => Boolean(date))
    .slice(0, limit);
}

async function queryFinraDataset<T>(dataset: string, payload: Record<string, unknown>): Promise<T[]> {
  const response = await axios.post<T[]>(
    `${FINRA_BASE}/data/group/otcmarket/name/${dataset}`,
    payload,
    {
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }
  );

  return Array.isArray(response.data) ? response.data : [];
}

async function getFinraShortInterest(symbol: string = 'GME'): Promise<ShortInterestData[]> {
  const partitions = await getLatestFinraPartitions('consolidatedShortInterest', 12);
  const rows: ShortInterestData[] = [];

  for (const settlementDate of partitions) {
    const data = await queryFinraDataset<any>('consolidatedShortInterest', {
      limit: 1,
      compareFilters: [
        { fieldName: 'symbolCode', fieldValue: symbol, compareType: 'equal' },
        { fieldName: 'settlementDate', fieldValue: settlementDate, compareType: 'equal' },
      ],
    });

    const row = data[0];
    if (row?.currentShortPositionQuantity) {
      rows.push({
        date: row.settlementDate,
        shortInterest: Number(row.currentShortPositionQuantity),
        daysToCover: Number(row.daysToCoverQuantity || 0),
        sharesShort: Number(row.currentShortPositionQuantity),
        averageDailyVolume: Number(row.averageDailyVolumeQuantity || 0),
        changePercent: Number(row.changePercent || 0),
        revisionFlag: row.revisionFlag || null,
        source: 'FINRA Consolidated Short Interest',
      });
    }
  }

  return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function GET() {
  try {
    // Check cache first
    const cached = cache.get<ShortInterestData[]>(CACHE_KEYS.SHORT_INTEREST);
    if (cached && !cached.isStale) {
      return NextResponse.json({
        data: cached.data,
        source: 'cache',
        cacheAge: cache.getAge(CACHE_KEYS.SHORT_INTEREST),
      });
    }

    const shortData = await getFinraShortInterest('GME');

    if (shortData.length > 0) {
      // Cache the result
      cache.set(CACHE_KEYS.SHORT_INTEREST, shortData, CACHE_TTL.SHORT_INTEREST);

      return NextResponse.json({
        data: shortData,
        source: 'FINRA Consolidated Short Interest',
        cacheAge: 0,
      });
    }

    // Check for stale cache
    const staleData = cache.getStale<ShortInterestData[]>(CACHE_KEYS.SHORT_INTEREST);
    if (staleData) {
      return NextResponse.json({
        data: staleData,
        source: 'cache',
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.SHORT_INTEREST),
      });
    }

    // No data available - return clear message
    return NextResponse.json({
      data: [],
      available: false,
      message: 'FINRA did not return current GME short interest data.',
      source: 'none',
    });
  } catch (error) {
    console.error('Short interest API error:', error);

    // Try stale cache on error
    const staleData = cache.getStale<ShortInterestData[]>(CACHE_KEYS.SHORT_INTEREST);
    if (staleData) {
      return NextResponse.json({
        data: staleData,
        source: 'cache',
        stale: true,
        cacheAge: cache.getAge(CACHE_KEYS.SHORT_INTEREST),
      });
    }

    return NextResponse.json({
      data: [],
      available: false,
      error: 'Failed to fetch short interest data',
      source: 'error',
    });
  }
}
