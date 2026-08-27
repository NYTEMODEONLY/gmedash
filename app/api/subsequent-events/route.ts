import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const CIK = '0001326380';
const SEC_HEADERS = {
  'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@nytemode.com',
  Accept: 'application/json,text/html,application/xhtml+xml',
};

const EVENT_FORMS = new Set([
  '8-K',
  '8-K/A',
  '425',
  'SC 13D',
  'SC 13D/A',
  'SCHEDULE 13D',
  'SCHEDULE 13D/A',
  'SC TO-T',
  'SC TO-T/A',
  'SC TO-C',
]);

const ITEM_LABELS: Record<string, string> = {
  '1.01': 'Material agreement',
  '2.02': 'Earnings',
  '3.02': 'Unregistered equity',
  '5.03': 'Charter / bylaws',
  '5.07': 'Shareholder vote',
  '7.01': 'Regulation FD',
  '8.01': 'Other events',
  '9.01': 'Exhibits',
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

function filingUrl(accession: string, primaryDocument: string) {
  return `https://www.sec.gov/Archives/edgar/data/${Number(CIK)}/${accession.replace(/-/g, '')}/${primaryDocument}`;
}

function itemHeadline(items: string): string {
  const parts = String(items || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item && item !== '9.01');
  const labels = parts.map((item) => ITEM_LABELS[item] || `Item ${item}`);
  return labels.length ? labels.join(' · ') : 'Current report';
}

async function getSnippet(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      responseType: 'text',
      headers: SEC_HEADERS,
    });
    const text = decodeSECText(String(response.data)).slice(0, 1600);
    return text || null;
  } catch (error) {
    console.error('subsequent-events snippet error:', error);
    return null;
  }
}

function classify(form: string, items: string, snippet: string | null): { tag: string; title: string; detail: string } {
  const blob = `${form} ${items} ${snippet || ''}`.toLowerCase();
  if (blob.includes('ebay')) {
    return {
      tag: 'eBay',
      title: form.startsWith('425') ? 'Rule 425 communication (eBay)' : form.includes('13D') ? '13D/A (eBay-related)' : 'eBay-related filing',
      detail: snippet
        ? snippet.replace(/^.*?Filed by:[^.]*\./i, '').slice(0, 280).trim()
        : 'Subject company eBay. Open the filing for stake, bid, or partnership language.',
    };
  }
  if (blob.includes('notes exchange') || blob.includes('convertible senior notes') || blob.includes('notes-for-equity') || blob.includes('exchange agreements')) {
    return {
      tag: 'Notes',
      title: 'Convertible notes exchange',
      detail: snippet?.match(/outstanding long-term debt will be reduced by approximately \$[0-9.,]+ billion[\s\S]{0,120}/i)?.[0]
        || snippet?.slice(0, 280)
        || 'Notes-for-equity 8-K. Share count/% update on close; DRS share count stays on the 10-K.',
    };
  }
  if (form.startsWith('8-K')) {
    return {
      tag: '8-K',
      title: itemHeadline(items),
      detail: snippet?.slice(0, 240) || `Items ${items || 'n/a'}`,
    };
  }
  if (form.includes('13D') || form.includes('13G')) {
    return {
      tag: '13D',
      title: form,
      detail: snippet?.slice(0, 240) || 'Beneficial ownership filing. Open source for stake size.',
    };
  }
  if (form === '425') {
    return {
      tag: '425',
      title: 'Rule 425 communication',
      detail: snippet?.slice(0, 240) || 'Subject-company communication. Open the filing.',
    };
  }
  return {
    tag: form,
    title: form,
    detail: snippet?.slice(0, 240) || 'SEC subsequent event',
  };
}

export async function GET() {
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300',
  };

  try {
    const submissionsResponse = await axios.get(`https://data.sec.gov/submissions/CIK${CIK}.json`, {
      timeout: 10000,
      headers: SEC_HEADERS,
    });
    const recent = submissionsResponse.data?.filings?.recent;
    const forms: string[] = recent?.form || [];
    const picked: number[] = [];
    for (let i = 0; i < forms.length && picked.length < 12; i++) {
      if (EVENT_FORMS.has(forms[i])) picked.push(i);
    }

    const events = [];
    let fetched = 0;
    for (const index of picked) {
      const form = recent.form[index];
      const accession = recent.accessionNumber[index];
      const primaryDocument = recent.primaryDocument[index];
      const items = recent.items?.[index] || '';
      const url = filingUrl(accession, primaryDocument);
      const shouldFetch = fetched < 6 && !primaryDocument.includes('.xml') && (form.startsWith('8-K') || form === '425' || form.includes('13D'));
      const snippet = shouldFetch ? await getSnippet(url) : null;
      if (shouldFetch) fetched += 1;
      const classified = classify(form, items, snippet);
      events.push({
        id: accession,
        form,
        tag: classified.tag,
        title: classified.title,
        detail: classified.detail,
        items: items || null,
        filingDate: recent.filingDate[index],
        reportDate: recent.reportDate?.[index] || null,
        url,
      });
    }

    return NextResponse.json({
      source: 'SEC EDGAR',
      sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${CIK}`,
      lastUpdated: new Date().toISOString(),
      note: 'Filing-backed subsequent events only. DRS share count is annual (10-K / HQ count). Notes close updates shares outstanding and the DRS percentage, not the 66.2M figure.',
      events,
    }, { headers: responseHeaders });
  } catch (error) {
    console.error('subsequent-events API error:', error);
    return NextResponse.json({
      events: [],
      error: 'Unable to load subsequent SEC events',
    }, { status: 503, headers: responseHeaders });
  }
}
