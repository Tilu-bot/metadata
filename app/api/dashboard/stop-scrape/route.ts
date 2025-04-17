// app/api/dashboard/stop-scrape/route.ts

import { NextResponse } from 'next/server';
import { setScraperRunning } from '../../../../lib/scraperState';

export async function POST(): Promise<NextResponse> {
  try {
    // Set the scraper running flag to false
    setScraperRunning(false);
    
    return NextResponse.json({
      message: 'Scraping stopped successfully',
      isRunning: false,
    });
  } catch (error) {
    console.error('Error stopping scraper:', error);
    return NextResponse.json({ error: 'Failed to stop scraper' }, { status: 500 });
  }
}