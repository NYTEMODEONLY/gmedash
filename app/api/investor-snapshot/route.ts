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
  'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@nytemode.com',
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

interface FilingText {
  text: string;
  form: string;
  filingDate: string;
  reportDate: string | null;
  url: string;
}

async function getSubmissions() {
  const submissionsResponse = await axios.get(`https://data.sec.gov/submissions/CIK${CIK}.json`, {
    timeout: 10000,
    headers: SEC_HEADERS,
  });
  return submissionsResponse.data?.filings?.recent;
}

function filingUrl(accession: string, primaryDocument: string) {
  return `https://www.sec.gov/Archives/edgar/data/1326380/${accession.replace(/-/g, '')}/${primaryDocument}`;
}

async function getFilingText(recent: any, index: number): Promise<FilingText> {
  const accession = recent.accessionNumber[index];
  const primaryDocument = recent.primaryDocument[index];
  const url = filingUrl(accession, primaryDocument);
  const reportResponse = await axios.get(url, {
    timeout: 12000,
    responseType: 'text',
    headers: SEC_HEADERS,
  });

  return {
    text: decodeSECText(String(reportResponse.data)),
    form: recent.form[index],
    filingDate: recent.filingDate[index],
    reportDate: recent.reportDate?.[index] || null,
    url,
  };
}

async function getLatestFiling(recent: any, forms: string[]): Promise<FilingText | null> {
  const index = recent?.form?.findIndex((form: string) => forms.includes(form)) ?? -1;
  if (index < 0) return null;
  return getFilingText(recent, index);
}

function fiscalIncomeLabel(reportDate: string | null, isQuarterly: boolean): string {
  if (!isQuarterly || !reportDate) return 'FY Net Income';
  const month = Number(reportDate.slice(5, 7));
  if (month >= 4 && month <= 6) return 'Q1 Net Income';
  if (month >= 7 && month <= 9) return 'Q2 Net Income';
  if (month >= 10 && month <= 12) return 'Q3 Net Income';
  return 'FY Net Income';
}

function parseMillions(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

async function getNotesExchange(recent: any): Promise<{
  principal: string;
  remaining: string;
  close: string;
  closed: boolean;
  sharesIssuedMillion: number | null;
  sharesOutstandingMillion: number | null;
  url: string;
  filingDate: string;
} | null> {
  const forms: string[] = recent?.form || [];
  let announced: {
    principal: string;
    remaining: string;
    close: string;
    closed: boolean;
    sharesIssuedMillion: number | null;
    sharesOutstandingMillion: number | null;
    url: string;
    filingDate: string;
  } | null = null;

  for (let i = 0; i < forms.length && i < 40; i++) {
    if (forms[i] !== '8-K' && forms[i] !== '8-K/A') continue;
    const filing = await getFilingText(recent, i);
    const exchange = filing.text.match(
      /exchange approximately \(i\) \$([0-9.,]+)\s*million aggregate principal amount of the outstanding 2030 Notes, and \(ii\) \$([0-9.,]+)\s*billion aggregate principal amount of the outstanding 2032 Notes/i
    );
    const reduced = filing.text.match(
      /outstanding long-term debt will be reduced by approximately \$([0-9.,]+)\s*billion/i
    );
    const remaining = filing.text.match(
      /approximately \$([0-9.,]+)\s*billion aggregate principal amount of 2030 Notes and \$([0-9.,]+)\s*billion aggregate principal amount of 2032 Notes remaining outstanding/i
    );
    const expectedClose = filing.text.match(
      /Closing Date is expected to occur on or about ([A-Za-z]+ \d{1,2}, \d{4})/i
    );
    const closed = /the (notes )?exchange (has (been )?(closed|completed|consummated)|closed|was (completed|consummated)|was closed)/i.test(filing.text)
      || /Closing Date occurred/i.test(filing.text)
      || /completed the previously announced exchange/i.test(filing.text);
    const sharesIssued = filing.text.match(
      /issued (approximately )?([0-9.,]+)\s*million shares/i
    );
    const sharesOutstanding = filing.text.match(
      /(?:there (?:were|are) (?:approximately )?|(?:shares|Class A common stock) outstanding[^\d]{0,80})([0-9.,]+)\s*million shares/i
    ) || filing.text.match(
      /approximately ([0-9.,]+)\s*million shares of Class A common stock (?:outstanding|issued and outstanding)/i
    );

    if (reduced || exchange || (closed && (sharesIssued || sharesOutstanding))) {
      const principal = reduced?.[1]
        ? `$${reduced[1]}B notes-for-equity`
        : exchange
          ? `$${(Number(exchange[1].replace(/,/g, '')) / 1000 + Number(exchange[2].replace(/,/g, ''))).toFixed(1)}B notes-for-equity`
          : announced?.principal || 'Notes-for-equity';
      const parsed = {
        principal,
        remaining: remaining ? `~$${remaining[1]}B of 2030 and ~$${remaining[2]}B of 2032 remain` : (announced?.remaining || 'Exchange retires debt without cash'),
        close: closed
          ? `Closed ${filing.reportDate || filing.filingDate}`
          : expectedClose
            ? `Expected close ${expectedClose[1]}`
            : (announced?.close || 'Close pending'),
        closed,
        sharesIssuedMillion: parseMillions(sharesIssued?.[2]),
        sharesOutstandingMillion: parseMillions(sharesOutstanding?.[1]),
        url: filing.url,
        filingDate: filing.filingDate,
      };
      if (closed && (parsed.sharesOutstandingMillion || parsed.sharesIssuedMillion)) return parsed;
      if (!announced) announced = parsed;
    }
  }
  return announced;
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
    const recent = await getSubmissions();
    const [annual, quarterly, notes, btcPrice] = await Promise.all([
      getLatestFiling(recent, ['10-K']),
      getLatestFiling(recent, ['10-Q']),
      getNotesExchange(recent),
      getBitcoinPrice(),
    ]);

    if (!annual) throw new Error('No GameStop 10-K found in SEC submissions');

    const useQuarterly = Boolean(
      quarterly
      && quarterly.reportDate
      && annual.reportDate
      && quarterly.reportDate > annual.reportDate
    );
    const operating = useQuarterly && quarterly ? quarterly : annual;
    const operatingLabel = useQuarterly ? 'SEC 10-Q' : 'SEC 10-K';
    const text = operating.text;
    const annualText = annual.text;

    const liquidityMatch = text.match(/Cash, cash equivalents and marketable securities\s+\$\s*([\d,.]+)\s+\$\s*([\d,.]+)/i);
    const cashMatch = text.match(/Cash and cash equivalents\s+\$\s*([\d,.]+)\s+\$\s*([\d,.]+)/i);
    const marketableMatch = text.match(/Marketable securities\s+([\d,.]+)/i);
    const debtMatch = text.match(/Long-term debt\s+([\d,.]+)\s+([\d,.]+)/i)
      || text.match(/Total debt\s+\$\s*([\d,.]+)\s+\$\s*([\d,.]+)/i);
    const resultsMatch = text.match(/Net sales\s+\$\s*([\d,.]+)[\s\S]{0,80}?Gross profit\s+([\d,.]+)[\s\S]{0,400}?Net income\s+\$\s*([\d,.]+)/i);
    const categoryMatch = text.match(/Hardware and accessories\s+\$\s*([\d,.]+)\s+([\d.]+)\s*%[\s\S]{0,80}?Software\s+([\d,.]+)\s+([\d.]+)[\s\S]{0,80}?Collectibles\s+([\d,.]+)\s+([\d.]+)/i);
    const storesMatch = annualText.match(/Total Stores\s+([\d,]+)\s+1\s+\(([\d,]+)\)\s+([\d,]+)/i);
    const storeByRegionMatch = annualText.match(/As of [A-Za-z]+ \d{1,2}, \d{4}, we had a total of\s+([\d,]+)\s+st\s*ores[\s\S]{0,160}?([\d,]+)\s+in the United States,\s+([\d,]+)\s+in Europe,\s+and\s+([\d,]+)\s+in A\s*ustralia/i)
      || annualText.match(/As of [A-Za-z]+ \d{1,2}, \d{4}, we had a total of\s+([\d,]+)\s+stores[\s\S]{0,160}?([\d,]+)\s+in the United States,\s+([\d,]+)\s+in Europe,\s+and\s+([\d,]+)\s+in Australia/i);
    const holdersMatch = annualText.match(/approximately\s+([\d,.]+)\s+million shares\s+\(([\d.]+)%\)\s+were held by registered holders[\s\S]{0,260}?approximately\s+([\d,.]+)\s+million were held in our direct stock purchase plan[\s\S]{0,220}?there were\s+([\d,]+)\s+record holders/i);
    const dtcMatch = annualText.match(/approximately\s+([\d,.]+)\s+million shares\s+\(([\d.]+)%\)\s+were held by Cede & Co\./i);
    const bitcoinMatch = matchFirst(annualText, [
      /pledged\s+([\d,]+)\s+Bitcoin[\s\S]{0,260}?digital assets receivable with a fair value of\s+\$\s*([\d,.]+)\s+million[\s\S]{0,120}?and\s+\$\s*([\d,.]+)\s+million as of January 31, 2026/i,
      /pledged\s+([\d,]+)\s+of the Bitcoin[\s\S]{0,420}?Additions \(Cost of\s+\$\s*([\d,.]+)\s+million/i,
      /covered-call option contracts referencing approximately\s+([\d,]+)\s+Bitcoin[\s\S]{0,120}?strike prices ranging from\s+\$([\d,]+)\s+to\s+\$([\d,]+)/i,
    ]);
    const optionMatch = annualText.match(/strike prices ranging from\s+\$([\d,]+)\s+to\s+\$([\d,]+)\s+and maturities extending through\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);

    const incomeLabel = fiscalIncomeLabel(operating.reportDate, useQuarterly);
    const collectiblesPct = categoryMatch?.[6] ? `${categoryMatch[6]}% of net sales` : undefined;

    const sections: SnapshotSection[] = [
      {
        title: 'Balance Sheet',
        source: operatingLabel,
        metrics: [
          {
            label: 'Cash + Marketable Securities',
            value: moneyMillions(liquidityMatch?.[1]),
            detail: `Cash ${moneyMillions(cashMatch?.[1])}; securities ${moneyMillions(marketableMatch?.[1])}`,
          },
          {
            label: 'Long-term Debt',
            value: moneyMillions(debtMatch?.[1]),
            detail: notes
              ? `${notes.principal} announced; ${notes.close}`
              : 'Convertible notes and other reported long-term debt',
          },
          {
            label: incomeLabel,
            value: moneyMillions(resultsMatch?.[3]),
            detail: `Net sales ${moneyMillions(resultsMatch?.[1])}; gross profit ${moneyMillions(resultsMatch?.[2])}`,
          },
        ],
      },
      {
        title: 'Business Mix',
        source: operatingLabel,
        metrics: [
          {
            label: 'Stores',
            value: numberWithCommas(storeByRegionMatch?.[1] || storesMatch?.[3]),
            detail: `US ${numberWithCommas(storeByRegionMatch?.[2])}; Europe ${numberWithCommas(storeByRegionMatch?.[3])}; Australia ${numberWithCommas(storeByRegionMatch?.[4])} (10-K)`,
          },
          {
            label: 'Store Reduction',
            value: storesMatch ? `-${numberWithCommas(storesMatch[2])}` : 'N/A',
            detail: `From ${numberWithCommas(storesMatch?.[1])} to ${numberWithCommas(storesMatch?.[3])} stores in FY2025`,
          },
          {
            label: 'Collectibles Sales',
            value: moneyMillions(categoryMatch?.[5]),
            detail: collectiblesPct
              ? `${collectiblesPct}; hardware ${moneyMillions(categoryMatch?.[1])}; software ${moneyMillions(categoryMatch?.[3])}`
              : `Hardware ${moneyMillions(categoryMatch?.[1])}; software ${moneyMillions(categoryMatch?.[3])}`,
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
            value: (() => {
              if (!holdersMatch) return 'N/A';
              const drsMillion = parseMillions(holdersMatch[1]);
              const soMillion = notes?.closed ? notes.sharesOutstandingMillion : null;
              if (drsMillion && soMillion && soMillion > 0) {
                return `${holdersMatch[1]}M (${((drsMillion / soMillion) * 100).toFixed(1)}%)`;
              }
              return `${holdersMatch[1]}M (${holdersMatch[2]}%)`;
            })(),
            detail: (() => {
              const asOf = `As of 10-K${annual.reportDate ? ` ${annual.reportDate}` : ''} (annual HQ count)`;
              const base = `DSPP ${holdersMatch?.[3] || 'N/A'}M; DTC/Cede ${dtcMatch?.[1] || 'N/A'}M (${dtcMatch?.[2] || 'N/A'}%)`;
              if (notes?.closed && notes.sharesOutstandingMillion) {
                return `${asOf}. ${base}. DRS % uses post-close shares outstanding ${notes.sharesOutstandingMillion}M from the close 8-K; the 66.2M count is unchanged.`;
              }
              return `${asOf}. ${base}. Notes close updates share count and this %, not the registered share count.`;
            })(),
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
        source: notes ? 'SEC 10-K / 8-K / Coinbase' : 'SEC 10-K / Coinbase spot BTC',
        metrics: [
          {
            label: 'Notes Exchange',
            value: notes?.principal || 'N/A',
            detail: notes ? `${notes.close}. ${notes.remaining}${notes.closed && notes.sharesOutstandingMillion ? `; shares outstanding ${notes.sharesOutstandingMillion}M` : ''}` : 'No subsequent notes-for-equity 8-K found',
          },
          {
            label: 'Pledged Bitcoin',
            value: bitcoinMatch ? `${numberWithCommas(bitcoinMatch[1])} BTC` : 'N/A',
            detail: btcPrice && bitcoinMatch ? `BTC spot ~$${Math.round(btcPrice).toLocaleString()}; not a holding valuation` : 'Covered-call collateral disclosure',
          },
          {
            label: 'Covered Calls',
            value: optionMatch ? `$${optionMatch[1]}-$${optionMatch[2]}` : 'N/A',
            detail: optionMatch ? `Strike range; maturities through ${optionMatch[3]}` : 'Reported covered-call option terms',
          },
        ],
      },
    ];

    return NextResponse.json({
      asOf: operating.reportDate || operating.filingDate,
      filingDate: operating.filingDate,
      filingUrl: operating.url,
      notesFilingUrl: notes?.url,
      drsAsOf: annual.reportDate || annual.filingDate,
      drsSource: 'SEC 10-K',
      drsNote: 'Registered/DRS share count is the annual HQ count from the 10-K. It is not updated intra-year. A notes-close 8-K updates shares outstanding and the DRS percentage only; the 66.2M figure is not invented.',
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
