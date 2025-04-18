// app/api/cron/route.ts

import { NextResponse } from 'next/server';
import { runScraper } from '../../../lib/scraper'; // Corrected import path
import { sql } from '../../../lib/db';

export async function GET(req: Request): Promise<NextResponse> {
  // Check for authorization using the CRON_SECRET header
  const authorization = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the last anime ID from the database
    const result = await sql`SELECT MAX(id) as last_id FROM anime`;
    
    // Use proper casting with the same pattern as other files
    let lastId = 0;
    if (result && result.length > 0) {
      const row = result[0] as unknown as { last_id: string | number | null };
      const lastIdValue = row.last_id;
      lastId = lastIdValue ? (typeof lastIdValue === 'number' ? lastIdValue : parseInt(String(lastIdValue), 10)) : 0;
    }
    
    // Set starting ID (use 1 if database is empty)
    const startId = lastId > 0 ? lastId + 1 : 1;
    
    // Trigger your scraping logic here, starting from the last ID + 1
    const { scrapeCount, failureCount, lastId: newLastId } = await runScraper(startId, 500);

    return NextResponse.json({
      message: 'Scraping completed',
      startedFromId: startId,
      scrapeCount,
      failureCount,
      lastScrapedId: newLastId,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to run scraper', details: error }, { status: 500 });
  }
}
