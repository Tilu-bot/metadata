// app/api/db/init/route.ts

import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function POST(): Promise<NextResponse> {
  try {
    // Create anime table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS anime (
        id INTEGER PRIMARY KEY,
        title_romaji TEXT NOT NULL,
        title_english TEXT,
        title_native TEXT,
        format TEXT,
        status TEXT,
        season TEXT,
        season_year INTEGER,
        episodes INTEGER,
        duration INTEGER,
        genres TEXT,
        average_score NUMERIC,
        popularity INTEGER,
        description TEXT,
        release_date TEXT,
        start_date TEXT,
        end_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create anime_episodes table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS anime_episodes (
        id INTEGER PRIMARY KEY,
        anime_id INTEGER NOT NULL,
        number INTEGER,
        title TEXT,
        description TEXT,
        aired_at TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (anime_id) REFERENCES anime(id)
      )
    `;
    
    // Create anime_failures table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS anime_failures (
        id SERIAL PRIMARY KEY,
        anime_id INTEGER NOT NULL,
        reason TEXT,
        attempt_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Database schema initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing database schema:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize database schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}