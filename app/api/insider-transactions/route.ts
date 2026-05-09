import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

interface OwnershipFiling {
  form: string;
  filed: string;
  accn: string;
  primaryDocument: string;
  url: string;
  rawUrl: string;
}

interface InsiderTransaction {
  id: string;
  filingDate: string;
  transactionDate: string;
  reporter: string;
  role: string;
  title: string;
  transactionCode: string;
  transactionType: string;
  acquiredDisposed: 'A' | 'D' | null;
  shares: number | null;
  price: number | null;
  value: number | null;
  sharesOwnedAfter: number | null;
  ownershipForm: string | null;
  sourceUrl: string;
}

const CIK = '0001326380';
const SEC_HEADERS = {
  'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
  Accept: 'application/json,application/xml,text/xml,text/html',
};

const strip = (value: string): string => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&#8220;|&#8221;|&quot;/g, '"')
  .replace(/&#8217;|&rsquo;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const nestedValue = (xml: string, path: string): string | null => {
  const parts = path.split('.');
  let current = xml;
  for (const part of parts) {
    const match = current.match(new RegExp(`<${part}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${part}>`, 'i'));
    if (!match) return null;
    current = match[1];
  }
  return strip(current);
};

const toNumber = (value: string | null): number | null => {
  if (!value) return null;
  const numeric = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const transactionLabel = (code: string, acquiredDisposed: string | null): string => {
  if (code === 'P') return 'Open-market purchase';
  if (code === 'S') return 'Open-market sale';
  if (code === 'F') return 'Tax withholding / disposition';
  if (code === 'A') return 'Grant or award';
  if (code === 'M') return 'Option exercise / conversion';
  if (code === 'G') return acquiredDisposed === 'A' ? 'Gift received' : 'Gift / transfer';
  return `Form 4 code ${code || 'N/A'}`;
};

const ownershipUrl = (accn: string, primaryDocument: string, rendered: boolean): string => {
  const base = `https://www.sec.gov/Archives/edgar/data/1326380/${accn.replace(/-/g, '')}`;
  if (rendered) return `${base}/${primaryDocument}`;
  return `${base}/${primaryDocument.replace(/^xslF345X\d+\//, '')}`;
};

async function getOwnershipFilings(): Promise<OwnershipFiling[]> {
  const response = await axios.get(`https://data.sec.gov/submissions/CIK${CIK}.json`, {
    timeout: 10000,
    headers: SEC_HEADERS,
  });

  const recent = response.data?.filings?.recent;
  const filings: OwnershipFiling[] = [];

  for (let i = 0; i < (recent?.form?.length || 0); i++) {
    if (!['3', '4', '5'].includes(recent.form[i])) continue;
    if (!recent.accessionNumber?.[i] || !recent.primaryDocument?.[i] || !recent.filingDate?.[i]) continue;

    filings.push({
      form: recent.form[i],
      filed: recent.filingDate[i],
      accn: recent.accessionNumber[i],
      primaryDocument: recent.primaryDocument[i],
      url: ownershipUrl(recent.accessionNumber[i], recent.primaryDocument[i], true),
      rawUrl: ownershipUrl(recent.accessionNumber[i], recent.primaryDocument[i], false),
    });
  }

  return filings.slice(0, 25);
}

async function parseOwnershipFiling(filing: OwnershipFiling): Promise<InsiderTransaction[]> {
  try {
    const response = await axios.get(filing.rawUrl, {
      timeout: 10000,
      responseType: 'text',
      headers: SEC_HEADERS,
    });
    const xml = String(response.data);

    const reporter = nestedValue(xml, 'reportingOwner.reportingOwnerId.rptOwnerName') || 'Unknown insider';
    const isDirector = /<isDirector>\s*1\s*<\/isDirector>/i.test(xml);
    const isOfficer = /<isOfficer>\s*1\s*<\/isOfficer>/i.test(xml);
    const isTenPercentOwner = /<isTenPercentOwner>\s*1\s*<\/isTenPercentOwner>/i.test(xml);
    const officerTitle = nestedValue(xml, 'reportingOwner.reportingOwnerRelationship.officerTitle');
    const role = [
      isDirector ? 'Director' : null,
      isOfficer ? (officerTitle || 'Officer') : null,
      isTenPercentOwner ? '10% owner' : null,
    ].filter(Boolean).join(' / ') || 'Section 16 filer';

    const transactionBlocks = Array.from(xml.matchAll(/<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi))
      .map((match) => match[1]);

    return transactionBlocks.map((block, index) => {
      const transactionDate = nestedValue(block, 'transactionDate.value') || filing.filed;
      const code = nestedValue(block, 'transactionCoding.transactionCode') || '';
      const acquiredDisposed = nestedValue(block, 'transactionAmounts.transactionAcquiredDisposedCode.value');
      const shares = toNumber(nestedValue(block, 'transactionAmounts.transactionShares.value'));
      const price = toNumber(nestedValue(block, 'transactionAmounts.transactionPricePerShare.value'));
      const sharesOwnedAfter = toNumber(nestedValue(block, 'postTransactionAmounts.sharesOwnedFollowingTransaction.value'));

      return {
        id: `${filing.accn}-${index}`,
        filingDate: filing.filed,
        transactionDate,
        reporter,
        role,
        title: nestedValue(block, 'securityTitle.value') || 'Class A Common Stock',
        transactionCode: code,
        transactionType: transactionLabel(code, acquiredDisposed),
        acquiredDisposed: acquiredDisposed === 'A' || acquiredDisposed === 'D' ? acquiredDisposed : null,
        shares,
        price,
        value: shares !== null && price !== null ? shares * price : null,
        sharesOwnedAfter,
        ownershipForm: nestedValue(block, 'ownershipNature.directOrIndirectOwnership.value'),
        sourceUrl: filing.url,
      };
    });
  } catch (error) {
    console.error(`Ownership filing parse failed for ${filing.accn}:`, error);
    return [];
  }
}

export async function GET() {
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300',
  };

  try {
    const filings = await getOwnershipFilings();
    const parsed = await Promise.all(filings.map(parseOwnershipFiling));
    const transactions = parsed.flat()
      .filter((transaction) => transaction.shares !== null)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
      .slice(0, 20);

    const openMarketBuys = transactions.filter((transaction) => transaction.transactionCode === 'P');
    const openMarketSales = transactions.filter((transaction) => transaction.transactionCode === 'S');
    const sum = (items: InsiderTransaction[], key: 'shares' | 'value') =>
      items.reduce((total, item) => total + (item[key] || 0), 0);

    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      source: 'SEC Forms 3, 4, and 5 ownership filings',
      sourceUrl: 'https://www.sec.gov/edgar/browse/?CIK=0001326380&owner=include',
      summary: {
        openMarketBuys: openMarketBuys.length,
        openMarketBuyShares: sum(openMarketBuys, 'shares'),
        openMarketBuyValue: sum(openMarketBuys, 'value'),
        openMarketSales: openMarketSales.length,
        openMarketSaleShares: sum(openMarketSales, 'shares'),
        openMarketSaleValue: sum(openMarketSales, 'value'),
      },
      transactions,
    }, { headers: responseHeaders });
  } catch (error) {
    console.error('Insider transactions API error:', error);
    return NextResponse.json({
      transactions: [],
      error: 'Unable to fetch insider transactions from SEC ownership filings',
    }, { status: 503, headers: responseHeaders });
  }
}
