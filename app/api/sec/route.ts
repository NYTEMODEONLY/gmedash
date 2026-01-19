import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cik = searchParams.get('cik') || '1326380';
  
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
        const descriptions = recent.description || [];

        for (let i = 0; i < Math.min(forms.length, 15); i++) {
          const formType = forms[i];
          
          // Focus on key filing types
          if (['10-K', '10-Q', '8-K', 'DEF 14A', 'SC 13G', 'SC 13D', '4'].includes(formType)) {
            allFilings.push({
              formType,
              filingDate: filingDates[i],
              description: descriptions[i] || getFilingDescription(formType),
              url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumbers[i].replace(/-/g, '')}/${accessionNumbers[i]}-index.htm`,
              companyName: data.name || 'GameStop Corp.',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching from SEC EDGAR API:', error);
    }

    // Sort by date and remove duplicates
    const uniqueFilings = allFilings.filter((filing, index, arr) => {
      return !arr.slice(0, index).some(prevFiling => 
        prevFiling.formType === filing.formType && 
        prevFiling.filingDate === filing.filingDate
      );
    });

    uniqueFilings.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());

    if (uniqueFilings.length === 0) {
      return NextResponse.json({ error: 'No real SEC filings data available from EDGAR' }, { status: 503 });
    }

    return NextResponse.json(uniqueFilings.slice(0, 10));
    
  } catch (error) {
    console.error('SEC API error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// Helper function to get filing descriptions
const getFilingDescription = (formType: string): string => {
  const descriptions: { [key: string]: string } = {
    '10-K': 'Annual Report - Comprehensive overview of business and financial condition',
    '10-Q': 'Quarterly Report - Unaudited financial statements and updates',
    '8-K': 'Current Report - Material corporate events and information',
    'DEF 14A': 'Proxy Statement - Information for shareholder meetings',
    'SC 13G': 'Beneficial Ownership Report - Large shareholding disclosure',
    'SC 13D': 'Beneficial Ownership Report - Active investor disclosure',
    '4': 'Insider Trading Report - Changes in beneficial ownership',
  };
  
  return descriptions[formType] || `${formType} Filing`;
};