// app/api/dashboard/stats/route.ts

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getScraperRunning } from '../../../../lib/scraperState';

// Remove edge runtime and revalidation to prevent caching issues
// export const runtime = 'edge';
// export const revalidate = 5;

export async function GET(): Promise<NextResponse> {
  try {
    console.log('Fetching dashboard stats...');
    
    // Get actual counts from database with failure count
    const [animeCount, episodeCount, lastAnimeId, failureCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM anime`,
      sql`SELECT COUNT(*) as count FROM anime_episodes`,
      sql`SELECT id FROM anime ORDER BY id DESC LIMIT 1`,
      sql`SELECT COUNT(*) as count FROM anime_failures`
        .catch((err) => {
          console.error('Error fetching failure count:', err);
          return [{ count: 0 }];
        })
    ]);

    console.log('Database stats:', {
      animeCount: animeCount?.[0]?.count,
      episodeCount: episodeCount?.[0]?.count,
      lastAnimeId: lastAnimeId?.[0]?.id,
      failureCount: failureCount?.[0]?.count,
      isRunning: getScraperRunning()
    });

    // Return empty stats with zeros if database is empty
    if (!animeCount?.[0]) {
      return NextResponse.json({
        scrapeCount: 0,
        episodeCount: 0,
        failureCount: 0,
        lastScrapedId: 0,
        lastRun: null,
        isRunning: getScraperRunning()
      }, {
        headers: {
          // Disable caching completely
          'Cache-Control': 'no-store, max-age=0, must-revalidate'
        }
      });
    }

    return NextResponse.json({
      scrapeCount: parseInt(animeCount[0]?.count || '0'),
      episodeCount: parseInt(episodeCount[0]?.count || '0'),
      failureCount: parseInt(failureCount[0]?.count || '0'),
      lastScrapedId: lastAnimeId[0]?.id || 0,
      lastRun: new Date().toISOString(), // Just use current time since we don't have created_at
      isRunning: getScraperRunning()
    }, {
      headers: {
        // Disable caching completely
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });
  } catch (error) {
    // More detailed error logging
    console.error('Error fetching stats:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return empty stats in case of error to prevent dashboard breakage
    return NextResponse.json({
      scrapeCount: 0,
      episodeCount: 0,
      failureCount: 0,
      lastScrapedId: 0,
      lastRun: null,
      isRunning: getScraperRunning(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 200, // Return 200 with empty data instead of 500 to prevent dashboard breakage
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });
  }
}