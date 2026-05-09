import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cik = searchParams.get('cik') || '1326380';
  const responseHeaders = {
    'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
  };
  
  try {
    const allFilings: any[] = [];
    
    // Method 1: SEC EDGAR API for recent filings
    try {
      const recentFilingsResponse = await axios.get(`https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`, {
        headers: {
          'User-Agent': 'GMEDASH-SEC-Reader/1.0 contact@example.com',
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const data = recentFilingsResponse.data;
      if (data && data.filings && data.filings.recent) {
        const recent = data.filings.recent;
        const forms = recent.form || [];
        const filingDates = recent.filingDate || [];
        const accessionNumbers = recent.accessionNumber || [];
        const descriptions = recent.primaryDocDescription || recent.description || [];

        for (let i = 0; i < Math.min(forms.length, 50); i++) {
          const formType = forms[i];

          // Show the latest live EDGAR submissions instead of hiding newer filing classes.
          if (formType && filingDates[i] && accessionNumbers[i]) {
            allFilings.push({
              formType,
              filingDate: filingDates[i],
              description: descriptions[i] && descriptions[i] !== formType ? descriptions[i] : getFilingDescription(formType),
              url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumbers[i].replace(/-/g, '')}/${accessionNumbers[i]}-index.htm`,
              companyName: data.name || 'GameStop Corp.',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching from SEC EDGAR API:', error);
    }

    // Sort by date and remove duplicates (use URL which contains unique accession number)
    const uniqueFilings = allFilings.filter((filing, index, arr) => {
      return !arr.slice(0, index).some(prevFiling => prevFiling.url === filing.url);
    });

    uniqueFilings.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());

    if (uniqueFilings.length === 0) {
      return NextResponse.json(
        { error: 'No real SEC filings data available from EDGAR' },
        { status: 503, headers: responseHeaders }
      );
    }

    return NextResponse.json(uniqueFilings.slice(0, 10), { headers: responseHeaders });
    
  } catch (error) {
    console.error('SEC API error:', error);
    return NextResponse.json([], { status: 500, headers: responseHeaders });
  }
}

// Helper function to get filing descriptions
const getFilingDescription = (formType: string): string => {
  const normalized = formType.toUpperCase().trim();

  if (normalized === '425') return 'Prospectus / communications filed under Rule 425';
  if (normalized === '144') return 'Notice of proposed sale of securities';
  if (normalized.includes('DEFA14A')) return 'Additional definitive proxy soliciting materials';

  // Check for specific patterns
  if (normalized === '4') return 'Insider Trading Report - Changes in beneficial ownership';
  if (normalized === '3') return 'Initial Insider Ownership - Statement of beneficial ownership';
  if (normalized === '5') return 'Annual Insider Report - Deferred ownership changes';

  if (normalized.includes('13D')) {
    if (normalized.includes('/A')) return 'Beneficial Ownership Amendment - Active investor update';
    return 'Beneficial Ownership Report - Active investor disclosure (>5%)';
  }

  if (normalized.includes('13G')) {
    if (normalized.includes('/A')) return 'Beneficial Ownership Amendment - Passive investor update';
    return 'Beneficial Ownership Report - Passive investor disclosure (>5%)';
  }

  if (normalized.startsWith('10-K')) {
    if (normalized.includes('/A')) return 'Annual Report Amendment';
    return 'Annual Report - Comprehensive overview of business and financial condition';
  }

  if (normalized.startsWith('10-Q')) {
    if (normalized.includes('/A')) return 'Quarterly Report Amendment';
    return 'Quarterly Report - Unaudited financial statements and updates';
  }

  if (normalized.startsWith('8-K')) {
    if (normalized.includes('/A')) return 'Current Report Amendment';
    return 'Current Report - Material corporate events and information';
  }

  if (normalized === 'DEF 14A') return 'Proxy Statement - Information for shareholder meetings';

  return `${formType} Filing`;
};
