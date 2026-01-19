import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'GME';
  
  try {
    const optionsData = [];

    // Method 1: Scrape Yahoo Finance Options
    try {
      const yahooOptionsResponse = await axios.get(`https://query1.finance.yahoo.com/v7/finance/options/${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
        },
        timeout: 10000,
      });

      const data = yahooOptionsResponse.data;
      if (data?.optionChain?.result?.[0]?.options?.[0]) {
        const options = data.optionChain.result[0].options[0];
        const calls = options.calls || [];
        const puts = options.puts || [];
        
        // Process options data to extract volume and open interest
        const totalCallVolume = calls.reduce((sum: number, call: any) => sum + (call.volume || 0), 0);
        const totalPutVolume = puts.reduce((sum: number, put: any) => sum + (put.volume || 0), 0);
        const totalCallOI = calls.reduce((sum: number, call: any) => sum + (call.openInterest || 0), 0);
        const totalPutOI = puts.reduce((sum: number, put: any) => sum + (put.openInterest || 0), 0);
        
        optionsData.push({
          date: new Date().toISOString().split('T')[0],
          callVolume: totalCallVolume,
          putVolume: totalPutVolume,
          callOpenInterest: totalCallOI,
          putOpenInterest: totalPutOI,
          putCallRatio: totalPutVolume / (totalCallVolume || 1),
        });
      }
    } catch (yahooError: any) {
      console.log('Yahoo options data not accessible:', yahooError?.message || 'Unknown error');
    }

    // Method 2: Unusual Whales / FlowAlgo alternatives
    try {
      // Try to access options flow from alternative sources
      const marketwatchOptionsResponse = await axios.get(`https://www.marketwatch.com/investing/stock/${symbol.toLowerCase()}/options`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
        },
        timeout: 8000,
      });

      const html = marketwatchOptionsResponse.data;
      
      // Extract options volume from MarketWatch
      const volumeMatch = html.match(/Options Volume[^>]*?(\d+(?:,\d+)*)/i);
      if (volumeMatch) {
        const volume = parseInt(volumeMatch[1].replace(/,/g, ''));
        optionsData.push({
          date: new Date().toISOString().split('T')[0],
          totalVolume: volume,
          source: 'MarketWatch',
        });
      }
    } catch (marketwatchError: any) {
      console.log('MarketWatch options data not accessible:', marketwatchError?.message || 'Unknown error');
    }

    // Method 3: Barchart Options Data
    try {
      const barchartResponse = await axios.get(`https://www.barchart.com/stocks/quotes/${symbol}/options`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GMEDASH/1.0)',
        },
        timeout: 8000,
      });

      const html = barchartResponse.data;
      
      // Extract options metrics from Barchart
      const putCallRatioMatch = html.match(/Put\/Call Ratio[^>]*?(\d+\.?\d*)/i);
      if (putCallRatioMatch) {
        optionsData.push({
          date: new Date().toISOString().split('T')[0],
          putCallRatio: parseFloat(putCallRatioMatch[1]),
          source: 'Barchart',
        });
      }
    } catch (barchartError: any) {
      console.log('Barchart options data not accessible:', barchartError?.message || 'Unknown error');
    }

    if (optionsData.length === 0) {
      return NextResponse.json({ error: 'No real options flow data available' }, { status: 503 });
    }

    return NextResponse.json(optionsData);
    
  } catch (error) {
    console.error('Options flow API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve real options flow data' }, { status: 500 });
  }
}