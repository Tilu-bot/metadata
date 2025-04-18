// app/api/dashboard/stop-scrape/route.ts

import { NextResponse } from 'next/server';
import { requestGracefulStop, getScraperInfo } from '../../../../lib/scraperState';

export async function POST(): Promise<NextResponse> {
  try {
    // Request a graceful stop first
    requestGracefulStop();
    
    const scraperInfo = getScraperInfo();
    
    return NextResponse.json({
      message: 'Graceful stopping initiated. The current anime being processed will complete before stopping.',
      isRunning: scraperInfo.isRunning,
      gracefulStopRequested: scraperInfo.gracefulStopRequested
    });
  } catch (error) {
    console.error('Error stopping scraper:', error);
    return NextResponse.json({ error: 'Failed to stop scraper' }, { status: 500 });
  }
}