// lib/scraper.ts

import { sql } from './db'; // Database connection logic
import { formatDate } from '../utils/formatDate'; // Utility to format date
import { Anime } from '../types'; // Import only the Anime type since AnimeEpisode is not used
import { getScraperRunning } from './scraperState'; // Import the state check from the new utility

const BASE = process.env.ANILIST_API_BASE!;

let scrapeCount = 0;
let failureCount = 0;
let lastId = 0;

export async function fetchAnime(id: number): Promise<Anime | null> {
  try {
    const res = await fetch(`${BASE}/info/${id}`);
    if (!res.ok) {
      console.log(`ID ${id} returned status ${res.status}`);
      return null;
    }
    const data = await res.json();
    
    // Basic validation to ensure we have the minimum required data
    if (!data || !data.id || !data.title || !data.title.romaji) {
      console.log(`ID ${id} returned incomplete data`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching anime ID ${id}:`, error);
    return null;
  }
}

/**
 * Parse a date string in YYYY-MM-DD format into date components
 */
function parseDateString(dateStr: string | null): { year?: number; month?: number; day?: number } | undefined {
  if (!dateStr) return undefined;
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return undefined;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
  
  return { year, month, day };
}

export async function insertAnime(anime: Anime) {
  try {
    // Validate required fields to ensure the data is complete before inserting
    if (!anime.id || !anime.title || !anime.title.romaji) {
      console.error(`Invalid anime data for ID ${anime.id}, missing required fields`);
      return false;
    }

    const {
      id, title, format, status, season, seasonYear,
      episodes, duration, genres, averageScore, popularity,
      description, startDate, endDate, releaseDate, episodesList
    } = anime;

    // Provide defaults for nullable fields
    const genreStr = genres?.join(',') ?? null;
    const safeDescription = description || null;
    const safeReleaseDate = releaseDate || null;

    // Insert anime record
    await sql`
      INSERT INTO anime (
        id, title_romaji, title_english, title_native, format, status,
        season, season_year, episodes, duration, genres, average_score,
        popularity, description, release_date, start_date, end_date
      ) VALUES (
        ${id}, ${title.romaji}, ${title.english ?? null}, ${title.native ?? null},
        ${format || 'unknown'}, ${status || 'unknown'}, ${season || null}, ${seasonYear || null},
        ${episodes || null}, ${duration || null}, ${genreStr}, ${averageScore || null},
        ${popularity || null}, ${safeDescription}, ${safeReleaseDate},
        ${formatDate(parseDateString(startDate))}, ${formatDate(parseDateString(endDate))}
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    // Process episodes if they exist
    if (episodesList?.length) {
      for (const ep of episodesList) {
        // Skip episodes without required data
        if (!ep.id || !ep.number) {
          console.log(`Skipping invalid episode for anime ID ${id}`);
          continue;
        }
        
        await sql`
          INSERT INTO anime_episodes (
            id, anime_id, number, title, description, aired_at
          ) VALUES (
            ${ep.id}, ${id}, ${ep.number}, ${ep.title ?? null}, ${ep.description ?? null}, ${ep.airedAt ?? null}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    return true;
  } catch (error) {
    console.error(`Error inserting anime ID ${anime.id}:`, error);
    return false;
  }
}

export async function runScraper(start = 1, limit = 500) {
  scrapeCount = 0;
  failureCount = 0;
  lastId = start;
  const skipCount = 0; // Track IDs that don't exist in the API
  
  console.log(`Starting scrape from ID ${start} with limit of ${limit} items`);

  for (let id = start; scrapeCount < limit; id++) {
    // Check if we should stop the scraper
    if (!getScraperRunning()) {
      console.log('Scraper stopped by user');
      break;
    }
    
    // Update the lastId even before attempting to fetch
    lastId = id;
    
    // Try to fetch the anime data
    const anime = await fetchAnime(id);
    
    // If no data was returned, continue to the next ID
    if (!anime) {
      failureCount++;
      // If we've had 50 consecutive failures, we might be at the end of available IDs
      if (failureCount - scrapeCount >= 50) {
        console.log(`Reached 50 consecutive failures at ID ${id}, stopping scraper`);
        break;
      }
      continue;
    }

    // Try to insert the data
    const success = await insertAnime(anime);
    
    if (success) {
      scrapeCount++;
      console.log(`Successfully scraped anime "${anime.title.romaji}" (ID: ${anime.id})`);
    } else {
      failureCount++;
      console.error(`Failed to insert anime ID ${anime.id}`);
    }
    
    // Add a small delay to avoid rate limiting (200ms)
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`Scraping completed. Processed ${scrapeCount + failureCount} IDs, successfully scraped ${scrapeCount} anime.`);
  return { lastId, scrapeCount, failureCount, skipCount };
}
