// app/api/dashboard/start-scrape/route.ts

import { NextResponse } from 'next/server';
import { runScraper } from '../../../../lib/scraper';
import { setScraperRunning } from '../../../../lib/scraperState';
import { sql } from '../../../../lib/db';

export async function POST(): Promise<NextResponse> {
  try {
    // Get the authorization secret from environment variables
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Get the last anime ID from the database with proper typing
    const result = await sql`SELECT MAX(id) as last_id FROM anime`;
    
    // Safely extract and transform the data
    let lastId = 0;
    if (result && result.length > 0) {
      // Use the proper double casting pattern for TypeScript
      const row = result[0] as unknown as { last_id: string | number | null };
      const lastIdValue = row.last_id;
      lastId = lastIdValue ? (typeof lastIdValue === 'number' ? lastIdValue : parseInt(String(lastIdValue), 10)) : 0;
    }
    
    // Set starting ID (use 1 if database is empty)
    const startId = lastId > 0 ? lastId + 1 : 1;
    
    // Set the scraper running flag to true
    setScraperRunning(true);
    
    // Start the scraper in a non-blocking way
    Promise.resolve().then(async () => {
      try {
        await runScraper(startId, 500);
      } catch (error) {
        console.error('Error in background scraper task:', error);
      } finally {
        setScraperRunning(false);
      }
    });
    
    return NextResponse.json({
      message: 'Scraping initiated successfully',
      startingFromId: startId,
      isRunning: true
    });
  } catch (error) {
    console.error('Error starting scraper:', error);
    return NextResponse.json({ error: 'Failed to start scraper' }, { status: 500 });
  }
}