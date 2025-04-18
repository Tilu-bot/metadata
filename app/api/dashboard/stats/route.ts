// app/api/dashboard/stats/route.ts

import { NextResponse } from 'next/server';
import { sql, isDbConnected, connectionError } from '../../../../lib/db';
import { getScraperRunning } from '../../../../lib/scraperState';

// Define types more specifically for our database query results
interface CountItem { count: number }
interface IdItem { id: number }
type CountResult = CountItem[];
type IdResult = IdItem[];

// Remove edge runtime and revalidation to prevent caching issues
// export const runtime = 'edge';
// export const revalidate = 5;

export async function GET(): Promise<NextResponse> {
  try {
    console.log('Fetching dashboard stats...');
    
    // First check if database is connected
    if (!isDbConnected) {
      console.warn('Database is not connected, returning empty stats');
      return NextResponse.json({
        scrapeCount: 0,
        episodeCount: 0,
        failureCount: 0,
        lastScrapedId: 0,
        lastRun: null,
        isRunning: getScraperRunning(),
        dbConnected: false,
        dbError: connectionError?.message || 'Database not connected'
      }, {
        status: 200, // Return 200 with connection info instead of 500
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate'
        }
      });
    }
    
    // Get actual counts from database with failure count
    const [animeCount, episodeCount, lastAnimeId, failureCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM anime`.catch((err: Error) => {
        console.error('Error fetching anime count:', err);
        return [{ count: 0 }];
      }) as Promise<CountResult>,
      sql`SELECT COUNT(*) as count FROM anime_episodes`.catch((err: Error) => {
        console.error('Error fetching episode count:', err);
        return [{ count: 0 }];
      }) as Promise<CountResult>,
      sql`SELECT id FROM anime ORDER BY id DESC LIMIT 1`.catch((err: Error) => {
        console.error('Error fetching last anime ID:', err);
        return [{ id: 0 }];
      }) as Promise<IdResult>,
      sql`SELECT COUNT(*) as count FROM anime_failures`.catch((err: Error) => {
        console.error('Error fetching failure count:', err);
        return [{ count: 0 }];
      }) as Promise<CountResult>
    ]);

    // Now TypeScript understands these are arrays with specific item shapes
    const animeCountValue = animeCount[0]?.count ?? 0;
    const episodeCountValue = episodeCount[0]?.count ?? 0;
    const lastAnimeIdValue = lastAnimeId[0]?.id ?? 0;
    const failureCountValue = failureCount[0]?.count ?? 0;

    console.log('Database stats:', {
      animeCount: animeCountValue,
      episodeCount: episodeCountValue,
      lastAnimeId: lastAnimeIdValue,
      failureCount: failureCountValue,
      isRunning: getScraperRunning()
    });

    // Return empty stats with zeros if database is empty
    if (!animeCount[0]) {
      return NextResponse.json({
        scrapeCount: 0,
        episodeCount: 0,
        failureCount: 0,
        lastScrapedId: 0,
        lastRun: null,
        isRunning: getScraperRunning(),
        dbConnected: true
      }, {
        headers: {
          // Disable caching completely
          'Cache-Control': 'no-store, max-age=0, must-revalidate'
        }
      });
    }

    return NextResponse.json({
      scrapeCount: parseInt(String(animeCountValue)),
      episodeCount: parseInt(String(episodeCountValue)),
      failureCount: parseInt(String(failureCountValue)),
      lastScrapedId: lastAnimeIdValue,
      lastRun: new Date().toISOString(), // Just use current time since we don't have created_at
      isRunning: getScraperRunning(),
      dbConnected: true
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
      dbConnected: isDbConnected,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 200, // Return 200 with empty data instead of 500 to prevent dashboard breakage
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate'
      }
    });
  }
}