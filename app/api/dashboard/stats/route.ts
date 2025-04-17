// app/api/dashboard/stats/route.ts

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET(): Promise<NextResponse> {
  try {
    // Fetch latest stats from the database
    const result = await sql`
      SELECT 
        COUNT(*) as scrape_count,
        MAX(id) as last_id,
        (SELECT COUNT(*) FROM anime_episodes) as episode_count
      FROM anime
    `;
    
    const stats = result[0];
    
    // Simulating some failure count for demonstration
    const failureCount = Math.floor(stats.scrape_count * 0.05); // assuming ~5% failure rate
    
    return NextResponse.json({
      scrapeCount: parseInt(stats.scrape_count),
      failureCount: failureCount,
      lastScrapedId: parseInt(stats.last_id),
      episodeCount: parseInt(stats.episode_count),
      lastRun: new Date().toISOString() // This could be stored in a settings/stats table
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}