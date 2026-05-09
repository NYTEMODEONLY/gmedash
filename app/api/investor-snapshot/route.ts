import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

interface SnapshotMetric {
  label: string;
  value: string;
  detail?: string;
}

interface SnapshotSection {
  title: string;
  source: string;
  metrics: SnapshotMetric[];
}

const CIK = '0001326380';
const SEC_HEADERS = {
  'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
  Accept: 'application/json,text/html,application/xhtml+xml',
};

function decodeSECText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function moneyMillions(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(numeric)) return 'N/A';
  if (Math.abs(numeric) >= 1000) return `$${(numeric / 1000).toFixed(2)}B`;
  return `$${numeric.toFixed(1)}M`;
}

function numberWithCommas(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[,]/g, ''));
  return Number.isFinite(numeric) ? numeric.toLocaleString() : 'N/A';
}

function matchFirst(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

async function getLatestAnnualReportText(): Promise<{ text: string; filingDate: string; url: string }> {
  const submissionsResponse = await axios.get(`https://data.sec.gov/submissions/CIK${CIK}.json`, {
    timeout: 10000,
    headers: SEC_HEADERS,
  });

  const recent = submissionsResponse.data?.filings?.recent;
  const index = recent?.form?.findIndex((form: string) => form === '10-K') ?? -1;
  if (index < 0) throw new Error('No GameStop 10-K found in SEC submissions');

  const accession = recent.accessionNumber[index];
  const primaryDocument = recent.primaryDocument[index];
  const url = `https://www.sec.gov/Archives/edgar/data/1326380/${accession.replace(/-/g, '')}/${primaryDocument}`;
  const filingDate = recent.filingDate[index];

  const reportResponse = await axios.get(url, {
    timeout: 12000,
    responseType: 'text',
    headers: SEC_HEADERS,
  });

  return {
    text: decodeSECText(String(reportResponse.data)),
    filingDate,
    url,
  };
}

async function getBitcoinPrice(): Promise<number | null> {
  try {
    const response = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
      timeout: 8000,
      headers: {
        'User-Agent': 'GMEDASH/1.0',
        Accept: 'application/json',
      },
    });
    const price = Number(response.data?.data?.amount);
    return Number.isFinite(price) ? price : null;
  } catch (error) {
    console.error('Coinbase BTC price error:', error);
    return null;
  }
}

export async function GET() {
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
  };

  try {
    const [{ text, filingDate, url }, btcPrice] = await Promise.all([
      getLatestAnnualReportText(),
      getBitcoinPrice(),
    ]);

    const liquidityMatch = text.match(/Cash, cash equivalents and marketable securities\s+\$\s*([\d,.]+)\s+\$\s*([\d,.]+)/i);
    const cashMatch = text.match(/Cash and cash equivalents\s+\$\s*([\d,.]+)\s+\$\s*([\d,.]+)/i);
    const marketableMatch = text.match(/Marketable securities\s+([\d,.]+)\s+([\d,.]+)/i);
    const debtMatch = text.match(/Total debt\s+\$\s*([\d,.]+)\s+\$\s*([\d,.]+)/i);
    const resultsMatch = text.match(/Net sales\s+\$\s*([\d,.]+)\s+100\.0\s+%\s+\$\s*([\d,.]+)[\s\S]{0,500}?Gross profit\s+([\d,.]+)[\s\S]{0,700}?Net income\s+\$\s*([\d,.]+)/i);
    const segmentMatch = text.match(/United States\s+\$\s*([\d,.]+)\s+73\.5\s+%\s+\$\s*[\d,.]+[\s\S]{0,120}?Canada\s+([\d,.]+)\s+1\.1[\s\S]{0,80}?Australia\s+([\d,.]+)\s+13\.6[\s\S]{0,80}?Europe\s+([\d,.]+)\s+11\.8/i);
    const categoryMatch = text.match(/Hardware and accessories\s+\$\s*([\d,.]+)\s+50\.7[\s\S]{0,80}?Software\s+([\d,.]+)\s+20\.1[\s\S]{0,80}?Collectibles\s+([\d,.]+)\s+29\.2/i);
    const storesMatch = text.match(/Total Stores\s+([\d,]+)\s+1\s+\(([\d,]+)\)\s+([\d,]+)/i);
    const storeByRegionMatch = text.match(/As of January 31, 2026, we had a total of\s+([\d,]+)\s+st ores[\s\S]{0,120}?([\d,]+)\s+in the United States,\s+([\d,]+)\s+in Europe,\s+and\s+([\d,]+)\s+in A ustralia/i)
      || text.match(/As of January 31, 2026, we had a total of\s+([\d,]+)\s+stores[\s\S]{0,120}?([\d,]+)\s+in the United States,\s+([\d,]+)\s+in Europe,\s+and\s+([\d,]+)\s+in Australia/i);
    const holdersMatch = text.match(/approximately\s+([\d,.]+)\s+million shares\s+\(([\d.]+)%\)\s+were held by registered holders[\s\S]{0,260}?approximately\s+([\d,.]+)\s+million were held in our direct stock purchase plan[\s\S]{0,220}?there were\s+([\d,]+)\s+record holders/i);
    const dtcMatch = text.match(/approximately\s+([\d,.]+)\s+million shares\s+\(([\d.]+)%\)\s+were held by Cede & Co\./i);
    const bitcoinMatch = matchFirst(text, [
      /pledged\s+([\d,]+)\s+Bitcoin[\s\S]{0,260}?digital assets receivable with a fair value of\s+\$\s*([\d,.]+)\s+million[\s\S]{0,120}?and\s+\$\s*([\d,.]+)\s+million as of January 31, 2026/i,
      /pledged\s+([\d,]+)\s+of the Bitcoin[\s\S]{0,420}?Additions \(Cost of\s+\$\s*([\d,.]+)\s+million/i,
      /covered-call option contracts referencing approximately\s+([\d,]+)\s+Bitcoin[\s\S]{0,120}?strike prices ranging from\s+\$([\d,]+)\s+to\s+\$([\d,]+)/i,
    ]);
    const optionMatch = text.match(/strike prices ranging from\s+\$([\d,]+)\s+to\s+\$([\d,]+)\s+and maturities extending through\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);

    const sections: SnapshotSection[] = [
      {
        title: 'Balance Sheet',
        source: 'SEC 10-K',
        metrics: [
          {
            label: 'Cash + Marketable Securities',
            value: moneyMillions(liquidityMatch?.[1]),
            detail: `Cash ${moneyMillions(cashMatch?.[1])}; securities ${moneyMillions(marketableMatch?.[1])}`,
          },
          {
            label: 'Total Debt',
            value: moneyMillions(debtMatch?.[1]),
            detail: 'Includes convertible notes and other reported debt',
          },
          {
            label: 'FY Net Income',
            value: moneyMillions(resultsMatch?.[4]),
            detail: `Net sales ${moneyMillions(resultsMatch?.[1])}; gross profit ${moneyMillions(resultsMatch?.[3])}`,
          },
        ],
      },
      {
        title: 'Business Mix',
        source: 'SEC 10-K',
        metrics: [
          {
            label: 'Stores',
            value: numberWithCommas(storeByRegionMatch?.[1] || storesMatch?.[3]),
            detail: `US ${numberWithCommas(storeByRegionMatch?.[2])}; Europe ${numberWithCommas(storeByRegionMatch?.[3])}; Australia ${numberWithCommas(storeByRegionMatch?.[4])}`,
          },
          {
            label: 'Store Reduction',
            value: storesMatch ? `-${numberWithCommas(storesMatch[2])}` : 'N/A',
            detail: `From ${numberWithCommas(storesMatch?.[1])} to ${numberWithCommas(storesMatch?.[3])} stores in FY2025`,
          },
          {
            label: 'Collectibles Sales',
            value: moneyMillions(categoryMatch?.[3]),
            detail: `Hardware ${moneyMillions(categoryMatch?.[1])}; software ${moneyMillions(categoryMatch?.[2])}`,
          },
        ],
      },
      {
        title: 'Shareholder Base',
        source: 'SEC 10-K',
        metrics: [
          {
            label: 'Record Holders',
            value: numberWithCommas(holdersMatch?.[4]),
            detail: 'Registered holders of Class A common stock',
          },
          {
            label: 'Registered Shares',
            value: holdersMatch ? `${holdersMatch[1]}M (${holdersMatch[2]}%)` : 'N/A',
            detail: `DSPP ${holdersMatch?.[3] || 'N/A'}M; DTC/Cede ${dtcMatch?.[1] || 'N/A'}M (${dtcMatch?.[2] || 'N/A'}%)`,
          },
          {
            label: 'Dividend Status',
            value: 'No quarterly dividend',
            detail: 'Board eliminated quarterly dividend on June 3, 2019',
          },
        ],
      },
      {
        title: 'Capital Allocation',
        source: 'SEC 10-K / Coinbase spot BTC',
        metrics: [
          {
            label: 'Pledged Bitcoin',
            value: bitcoinMatch ? `${numberWithCommas(bitcoinMatch[1])} BTC` : 'N/A',
            detail: btcPrice && bitcoinMatch ? `BTC spot ~$${Math.round(btcPrice).toLocaleString()}; not a holding valuation` : 'Covered-call collateral disclosure',
          },
          {
            label: 'BTC Receivable',
            value: bitcoinMatch?.[3] ? moneyMillions(bitcoinMatch[3]) : 'N/A',
            detail: bitcoinMatch?.[2] ? `At derecognition ${moneyMillions(bitcoinMatch[2])}` : 'Digital asset receivable as of fiscal year-end',
          },
          {
            label: 'Covered Calls',
            value: optionMatch ? `$${optionMatch[1]}-$${optionMatch[2]}` : 'N/A',
            detail: optionMatch ? `Strike range; maturities through ${optionMatch[3]}` : 'Reported covered-call option terms',
          },
        ],
      },
    ];

    if (segmentMatch) {
      sections[1].metrics.push({
        label: 'Segment Sales',
        value: moneyMillions(segmentMatch[1]),
        detail: `US; Australia ${moneyMillions(segmentMatch[3])}; Europe ${moneyMillions(segmentMatch[4])}`,
      });
    }

    return NextResponse.json({
      asOf: 'January 31, 2026',
      filingDate,
      filingUrl: url,
      lastUpdated: new Date().toISOString(),
      sections,
    }, { headers: responseHeaders });
  } catch (error) {
    console.error('Investor snapshot API error:', error);
    return NextResponse.json({
      sections: [],
      error: 'Unable to fetch investor snapshot from public sources',
    }, { status: 503, headers: responseHeaders });
  }
}
