import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

interface FactUnit {
  val: number;
  end: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  accn: string;
  frame?: string;
}

interface AnnualFiling {
  fiscalYearEnd: string;
  filed: string;
  accn: string;
  url: string;
}

const CIK = '0001326380';
const SEC_HEADERS = {
  'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
  Accept: 'application/json,text/html,application/xhtml+xml',
};

const decodeSECText = (value: string): string => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&#8220;|&#8221;|&quot;/g, '"')
  .replace(/&#8217;|&rsquo;/g, "'")
  .replace(/&#8211;|&#8212;/g, '-')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const money = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString()}`;
};

const numberText = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString();
};

const annualUrl = (accn: string, doc: string): string =>
  `https://www.sec.gov/Archives/edgar/data/1326380/${accn.replace(/-/g, '')}/${doc}`;

async function getAnnualFilings(): Promise<AnnualFiling[]> {
  const response = await axios.get(`https://data.sec.gov/submissions/CIK${CIK}.json`, {
    timeout: 10000,
    headers: SEC_HEADERS,
  });

  const recent = response.data?.filings?.recent;
  const annuals: AnnualFiling[] = [];

  for (let i = 0; i < (recent?.form?.length || 0); i++) {
    if (recent.form[i] !== '10-K') continue;
    if (!recent.reportDate?.[i] || !recent.accessionNumber?.[i] || !recent.primaryDocument?.[i]) continue;

    annuals.push({
      fiscalYearEnd: recent.reportDate[i],
      filed: recent.filingDate[i],
      accn: recent.accessionNumber[i],
      url: annualUrl(recent.accessionNumber[i], recent.primaryDocument[i]),
    });
  }

  return annuals.slice(0, 7);
}

function latestFactForEnd(facts: any, tag: string, end: string, unit = 'USD'): FactUnit | null {
  const units = facts?.['us-gaap']?.[tag]?.units?.[unit] || facts?.dei?.[tag]?.units?.[unit] || [];
  const matches = units.filter((item: FactUnit) =>
    item.end === end &&
    item.form === '10-K' &&
    item.fp === 'FY' &&
    Number.isFinite(item.val)
  );

  if (matches.length === 0) return null;

  return matches.sort((a: FactUnit, b: FactUnit) =>
    new Date(a.filed).getTime() - new Date(b.filed).getTime()
  )[matches.length - 1];
}

function factForFiling(facts: any, tag: string, end: string, accn: string, unit = 'USD'): FactUnit | null {
  const units = facts?.['us-gaap']?.[tag]?.units?.[unit] || facts?.dei?.[tag]?.units?.[unit] || [];
  const exact = units.find((item: FactUnit) =>
    item.end === end &&
    item.accn === accn &&
    item.form === '10-K' &&
    Number.isFinite(item.val)
  );
  return exact || latestFactForEnd(facts, tag, end, unit);
}

function latestFactForAccession(facts: any, tag: string, accn: string, unit = 'USD'): FactUnit | null {
  const units = facts?.['us-gaap']?.[tag]?.units?.[unit] || facts?.dei?.[tag]?.units?.[unit] || [];
  const matches = units.filter((item: FactUnit) =>
    item.accn === accn &&
    item.form === '10-K' &&
    Number.isFinite(item.val)
  );
  if (matches.length === 0) return null;
  return matches.sort((a: FactUnit, b: FactUnit) =>
    new Date(a.end).getTime() - new Date(b.end).getTime()
  )[matches.length - 1];
}

async function getAnnualTextFacts(filing: AnnualFiling) {
  try {
    const response = await axios.get(filing.url, {
      timeout: 10000,
      responseType: 'text',
      headers: SEC_HEADERS,
    });
    const text = decodeSECText(String(response.data));

    const storeMatch = text.match(/total of\s+([\d,]+)\s+st\s*ores/i)
      || text.match(/operated\s+([\d,]+)\s+stores/i)
      || text.match(/Total Stores\s+([\d,]+)\s+\d+\s+\([\d,]+\)\s+([\d,]+)/i);

    const registeredMatch = text.match(/and\s+approximately\s+([\d,.]+)\s+million shares[\s\S]{0,220}?were held by registered holders[\s\S]{0,360}?approximately\s+([\d,.]+)\s+million(?:\s+shares)?[\s\S]{0,160}?direct stock purchase plan/i)
      || text.match(/approximately\s+([\d,.]+)\s+million shares[^.]{0,220}?were held by registered holders with our transfer agent/i)
      || text.match(/approximately\s+([\d,.]+)\s+million shares[^.]{0,220}?were held by registered holders/i);
    const recordHolderMatch = text.match(/there were\s+([\d,]+)\s+record holders/i);

    return {
      stores: storeMatch ? Number(String(storeMatch[storeMatch.length - 1]).replace(/,/g, '')) : null,
      registeredShares: registeredMatch ? Number(registeredMatch[1]) * 1_000_000 : null,
      dsppShares: registeredMatch?.[2] ? Number(registeredMatch[2]) * 1_000_000 : null,
      recordHolders: recordHolderMatch ? Number(recordHolderMatch[1].replace(/,/g, '')) : null,
    };
  } catch (error) {
    console.error(`Turnaround annual text parse failed for ${filing.accn}:`, error);
    return {
      stores: null,
      registeredShares: null,
      dsppShares: null,
      recordHolders: null,
    };
  }
}

export async function GET() {
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
  };

  try {
    const [factsResponse, annualFilings] = await Promise.all([
      axios.get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${CIK}.json`, {
        timeout: 12000,
        headers: SEC_HEADERS,
      }),
      getAnnualFilings(),
    ]);

    const facts = factsResponse.data?.facts || {};
    const recentAnnuals = annualFilings.slice(0, 6).reverse();
    const textFacts = await Promise.all(recentAnnuals.map(getAnnualTextFacts));

    const years = recentAnnuals.map((filing, index) => {
      const revenue = factForFiling(facts, 'Revenues', filing.fiscalYearEnd, filing.accn)?.val
        ?? factForFiling(facts, 'RevenueFromContractWithCustomerExcludingAssessedTax', filing.fiscalYearEnd, filing.accn)?.val
        ?? null;
      const grossProfit = factForFiling(facts, 'GrossProfit', filing.fiscalYearEnd, filing.accn)?.val ?? null;
      const netIncome = factForFiling(facts, 'NetIncomeLoss', filing.fiscalYearEnd, filing.accn)?.val ?? null;
      const cash = factForFiling(facts, 'CashAndCashEquivalentsAtCarryingValue', filing.fiscalYearEnd, filing.accn)?.val ?? null;
      const marketableSecurities = factForFiling(facts, 'MarketableSecuritiesCurrent', filing.fiscalYearEnd, filing.accn)?.val ?? 0;
      const totalDebtReported = factForFiling(facts, 'LongTermDebt', filing.fiscalYearEnd, filing.accn)?.val
        ?? factForFiling(facts, 'ConvertibleDebt', filing.fiscalYearEnd, filing.accn)?.val
        ?? factForFiling(facts, 'LongTermNotesPayable', filing.fiscalYearEnd, filing.accn)?.val
        ?? null;
      const debtCurrent = factForFiling(facts, 'LongTermDebtCurrent', filing.fiscalYearEnd, filing.accn)?.val
        ?? factForFiling(facts, 'DebtCurrent', filing.fiscalYearEnd, filing.accn)?.val
        ?? 0;
      const debtNoncurrent = factForFiling(facts, 'LongTermDebtNoncurrent', filing.fiscalYearEnd, filing.accn)?.val ?? 0;
      const sharesOutstanding = latestFactForAccession(facts, 'EntityCommonStockSharesOutstanding', filing.accn, 'shares')?.val ?? null;
      const filingText = textFacts[index];
      const liquidity = cash !== null ? cash + (marketableSecurities || 0) : null;

      return {
        fiscalYearEnd: filing.fiscalYearEnd,
        fiscalYear: filing.fiscalYearEnd.slice(0, 4),
        filed: filing.filed,
        filingUrl: filing.url,
        revenue,
        grossProfit,
        grossMargin: revenue && grossProfit ? grossProfit / revenue : null,
        netIncome,
        cash,
        marketableSecurities,
        liquidity,
        totalDebt: totalDebtReported ?? ((debtCurrent || 0) + (debtNoncurrent || 0)),
        stores: filingText.stores,
        registeredShares: filingText.registeredShares,
        dsppShares: filingText.dsppShares,
        recordHolders: filingText.recordHolders,
        sharesOutstanding,
      };
    });

    const first = years[0];
    const latest = years[years.length - 1];

    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      sources: [
        'SEC companyfacts XBRL API',
        'GameStop SEC 10-K archive filings',
      ],
      sourceUrl: 'https://data.sec.gov/submissions/CIK0001326380.json',
      years,
      highlights: [
        {
          label: 'Net Income Turnaround',
          value: latest?.netIncome !== null && latest?.netIncome !== undefined ? money(latest.netIncome) : 'N/A',
          detail: first?.netIncome !== null && first?.netIncome !== undefined
            ? `From ${money(first.netIncome)} in ${first.fiscalYearEnd}`
            : 'Latest SEC annual filing',
        },
        {
          label: 'Liquidity (10-K year-end)',
          value: money(latest?.liquidity),
          detail: latest?.fiscalYearEnd
            ? `As of ${latest.fiscalYearEnd}. Cash ${money(latest?.cash)}; securities ${money(latest?.marketableSecurities)}`
            : `Cash ${money(latest?.cash)}; securities ${money(latest?.marketableSecurities)}`,
        },
        {
          label: 'Store Footprint',
          value: latest?.stores ? numberText(latest.stores) : 'N/A',
          detail: first?.stores && latest?.stores
            ? `${numberText(first.stores - latest.stores)} fewer stores since ${first.fiscalYearEnd}`
            : 'Pulled from 10-K text',
        },
        {
          label: 'Registered Shares',
          value: latest?.registeredShares ? numberText(latest.registeredShares) : 'N/A',
          detail: latest?.recordHolders ? `${numberText(latest.recordHolders)} record holders` : 'Disclosed when available',
        },
      ],
    }, { headers: responseHeaders });
  } catch (error) {
    console.error('Turnaround API error:', error);
    return NextResponse.json({
      years: [],
      highlights: [],
      error: 'Unable to fetch turnaround progress from SEC sources',
    }, { status: 503, headers: responseHeaders });
  }
}
