import { NextResponse } from 'next/server';
import axios from 'axios';

// Revalidate every 5 minutes
export const revalidate = 300;

interface PressRelease {
  title: string;
  date: string;
  url: string;
  description: string;
  source: string;
}

interface PressReleaseUnavailable {
  data: PressRelease[];
  available: false;
  source: string;
  sourceUrl: string;
  message: string;
}

interface Q4PressRelease {
  Headline: string;
  LinkToDetailPage: string;
  PressReleaseDate: string;
  ShortDescription?: string;
  Subheadline?: string;
}

const IR_BASE_URL = 'https://investor.gamestop.com';
const Q4_FEED_URL = `${IR_BASE_URL}/feed/PressRelease.svc/GetPressReleaseList`;
const PRESS_RELEASE_CATEGORY_ID = '1cb807d2-208f-4bc3-9133-6a9ad45ac3b0';

const parsePressReleaseDate = (value: string): string => {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }

  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
};

const fetchIRPressReleases = async (): Promise<PressRelease[]> => {
  const response = await axios.get<{ GetPressReleaseListResult: Q4PressRelease[] }>(Q4_FEED_URL, {
    params: {
      LanguageId: 1,
      pressReleaseDateFilter: 3,
      categoryId: PRESS_RELEASE_CATEGORY_ID,
      bodyType: 0,
      pageSize: 15,
      pageNumber: 0,
    },
    timeout: 15000,
  });

  const items = response.data?.GetPressReleaseListResult || [];

  return items
    .map((item) => {
      const title = item.Headline?.trim();
      const detailPath = item.LinkToDetailPage?.trim();
      const description =
        item.ShortDescription?.trim() ||
        item.Subheadline?.trim() ||
        'Official GameStop investor relations press release';

      if (!title || !detailPath || !item.PressReleaseDate) {
        return null;
      }

      const url = new URL(detailPath, IR_BASE_URL).toString();
      if (!url.startsWith(`${IR_BASE_URL}/news-releases/`)) {
        return null;
      }

      return {
        title,
        date: parsePressReleaseDate(item.PressReleaseDate),
        url,
        description,
        source: 'GameStop IR',
      };
    })
    .filter((item): item is PressRelease => Boolean(item));
};

export async function GET() {
  try {
    const releases = await fetchIRPressReleases();

    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    };

    if (releases.length === 0) {
      const unavailable: PressReleaseUnavailable = {
        data: [],
        available: false,
        source: 'GameStop IR',
        sourceUrl: 'https://news.gamestop.com/news-releases-0',
        message: 'The official GameStop IR feed returned no validated press releases.',
      };

      return NextResponse.json(unavailable, { status: 200, headers });
    }

    return NextResponse.json(releases.slice(0, 10), { headers });
  } catch (error) {
    console.error('Press Releases API error:', error);
    return NextResponse.json(
      {
        data: [],
        available: false,
        source: 'GameStop IR',
        sourceUrl: 'https://news.gamestop.com/news-releases-0',
        message: 'Unable to fetch the official GameStop IR press release feed.',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        },
      }
    );
  }
}
