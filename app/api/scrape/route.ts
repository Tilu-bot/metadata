// app/api/cron/route.ts

import { NextResponse } from 'next/server';
import { runScraper } from '../../../lib/scraper'; // Corrected the scraper logic import path

export async function GET(req: Request): Promise<NextResponse> {
  // Check for authorization using the CRON_SECRET header
  const authorization = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Trigger your scraping logic here
    const { scrapeCount, failureCount, lastId } = await runScraper(1, 500);

    return NextResponse.json({
      message: 'Scraping completed',
      scrapeCount,
      failureCount,
      lastScrapedId: lastId, // Map lastId to lastScrapedId
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run scraper', details: error }, { status: 500 });
  }
}
