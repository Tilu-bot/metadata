// lib/scraper.ts

import { sql } from './db';
import { formatDate } from '../utils/formatDate';
import { Anime } from '../types';
import { getScraperRunning, setScraperRunning, isGracefulStopRequested } from './scraperState';

const BASE = process.env.ANILIST_API_BASE!;

let scrapeCount = 0;
let failureCount = 0;
let lastId = 0;

// Convert string or object dates to object format or handle API's date objects directly
const parseDate = (dateStr: string | null | Record<string, unknown>): { year?: number; month?: number; day?: number } | undefined => {
  // If it's null or undefined, return undefined
  if (!dateStr) return undefined;
  
  // If it's already an object with year, month, day structure (like from the API)
  if (typeof dateStr === 'object' && 'year' in dateStr) {
    return {
      year: typeof dateStr.year === 'number' ? dateStr.year : undefined,
      month: typeof dateStr.month === 'number' ? dateStr.month : undefined,
      day: typeof dateStr.day === 'number' ? dateStr.day : undefined
    };
  }
  
  // If it's a string that needs parsing
  try {
    // First try to parse as JSON in case it's a stringified object
    if (typeof dateStr === 'string' && dateStr.includes('{')) {
      const parsed = JSON.parse(dateStr);
      if (parsed && typeof parsed === 'object' && 'year' in parsed) {
        return {
          year: typeof parsed.year === 'number' ? parsed.year : undefined,
          month: typeof parsed.month === 'number' ? parsed.month : undefined,
          day: typeof parsed.day === 'number' ? parsed.day : undefined
        };
      }
    }
    
    // Otherwise treat as normal date string
    const date = new Date(dateStr as string);
    if (isNaN(date.getTime())) return undefined;
    
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  } catch (e) {
    console.warn('Error parsing date:', dateStr, e);
    return undefined;
  }
};

// Record failure in the database
async function recordFailure(animeId: number, reason: string): Promise<void> {
  try {
    // Check if we already have a record for this anime ID
    const existing = await sql`
      SELECT id, attempt_count FROM anime_failures 
      WHERE anime_id = ${animeId}
    `;

    if (existing.length > 0) {
      // Update existing record
      await sql`
        UPDATE anime_failures 
        SET attempt_count = ${existing[0].attempt_count + 1},
            reason = ${reason},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing[0].id}
      `;
    } else {
      // Create new failure record
      await sql`
        INSERT INTO anime_failures (anime_id, reason)
        VALUES (${animeId}, ${reason})
      `;
    }
  } catch (error) {
    console.error(`Error recording failure for anime ID ${animeId}:`, error);
  }
}

// Check if an anime exists in the database
async function checkAnimeExists(id: number): Promise<boolean> {
  try {
    const result = await sql`SELECT id FROM anime WHERE id = ${id}`;
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if anime ${id} exists:`, error);
    return false;
  }
}

export async function fetchAnime(id: number): Promise<Anime | null> {
  try {
    console.log(`Fetching anime ID: ${id}`);
    
    // First check if this anime already exists in our database
    const exists = await checkAnimeExists(id);
    if (exists) {
      console.log(`Anime ID ${id} already exists in database, skipping fetch`);
      return null;
    }

    const res = await fetch(`${BASE}/info/${id}`, {
      // Add cache control headers for edge caching
      headers: {
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
    
    if (!res.ok) {
      console.log(`Failed to fetch anime ID ${id}: ${res.status}`);
      await recordFailure(id, `API returned status ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    
    // Map API response to our Anime type with proper field mappings
    const mappedData: Anime = {
      ...data,
      episodesList: data.episodes || [],
      episodes: data.totalEpisodes || data.currentEpisode || 0,
      // Map rating to averageScore since they're the same thing with different names
      averageScore: data.rating || data.averageScore || 0,
      // Ensure dates are properly mapped - API uses nested objects but our type might expect strings
      startDate: data.startDate ? JSON.stringify(data.startDate) : null,
      endDate: data.endDate ? JSON.stringify(data.endDate) : null
    };
    
    console.log(`Fetched anime ${mappedData.title.romaji} with ${mappedData.episodesList?.length || 0} episodes`);
    console.log(`Total episodes: ${mappedData.episodes}, Rating/Score: ${mappedData.averageScore}, Start date: ${mappedData.startDate}, End date: ${mappedData.endDate}`);
    
    return mappedData;
  } catch (error) {
    console.error(`Error fetching anime ID ${id}:`, error);
    await recordFailure(id, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function insertAnime(anime: Anime): Promise<boolean> {
  try {
    console.log(`Inserting anime: ${anime.title.romaji} (ID: ${anime.id})`);

    // Double-check if the anime already exists (for concurrency safety)
    const exists = await checkAnimeExists(anime.id);
    if (exists) {
      console.log(`Anime ID ${anime.id} already exists in database`);
      return true; // Consider it a success since it's already in the DB
    }

    const {
      id, title, format, status, season, seasonYear,
      episodes, duration, genres, averageScore, popularity,
      description, startDate: startDateStr, endDate: endDateStr, releaseDate, episodesList
    } = anime;

    // Detailed episode debugging
    console.log(`Episode data for anime ${id}:`, 
      episodesList ? `Found ${episodesList.length} episodes` : 'No episodes found');
    
    // Check the structure of episodesList
    if (episodesList) {
      console.log('Episodes type:', typeof episodesList);
      
      if (Array.isArray(episodesList) && episodesList.length > 0) {
        console.log('First episode sample:', JSON.stringify(episodesList[0]));
        
        // Check if all required properties exist in the first episode
        const firstEp = episodesList[0];
        const hasId = 'id' in firstEp;
        const hasNumber = 'number' in firstEp;
        const hasTitle = 'title' in firstEp;
        
        console.log('Episode structure checks:', {
          hasId,
          hasNumber,
          hasTitle,
          idType: typeof firstEp.id,
          numberType: typeof firstEp.number
        });
      } else if (typeof episodesList === 'object') {
        // Maybe it's not an array but an object with episodes
        console.log('Episodes object keys:', Object.keys(episodesList));
      }
    }

    // Ensure numeric values are properly converted and NaN is handled
    const safeId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(safeId)) {
      throw new Error(`Invalid anime ID: ${id}`);
    }
    
    let safeSeasonYear = seasonYear != null ? 
      (typeof seasonYear === 'number' ? seasonYear : parseInt(String(seasonYear), 10)) : 
      null;
    
    let safeEpisodes = episodes != null ? 
      (typeof episodes === 'number' ? episodes : parseInt(String(episodes), 10)) : 
      null;
    
    let safeDuration = duration != null ? 
      (typeof duration === 'number' ? duration : parseInt(String(duration), 10)) : 
      null;
    
    let safeAverageScore = averageScore != null ? 
      (typeof averageScore === 'number' ? averageScore : parseFloat(String(averageScore))) : 
      null;
    
    let safePopularity = popularity != null ? 
      (typeof popularity === 'number' ? popularity : parseInt(String(popularity), 10)) : 
      null;
    
    if (safeSeasonYear !== null && isNaN(safeSeasonYear)) {
      console.warn(`Invalid season year for anime ${id}: ${seasonYear}, using null instead`);
      safeSeasonYear = null;
    }
    
    if (safeEpisodes !== null && isNaN(safeEpisodes)) {
      console.warn(`Invalid episodes for anime ${id}: ${episodes}, using null instead`);
      safeEpisodes = null;
    }
    
    if (safeDuration !== null && isNaN(safeDuration)) {
      console.warn(`Invalid duration for anime ${id}: ${duration}, using null instead`);
      safeDuration = null;
    }
    
    if (safeAverageScore !== null && isNaN(safeAverageScore)) {
      console.warn(`Invalid average score for anime ${id}: ${averageScore}, using null instead`);
      safeAverageScore = null;
    }
    
    if (safePopularity !== null && isNaN(safePopularity)) {
      console.warn(`Invalid popularity for anime ${id}: ${popularity}, using null instead`);
      safePopularity = null;
    }

    const genreStr = genres?.join(',') ?? null;

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    const result = await sql`
      INSERT INTO anime (
        id, title_romaji, title_english, title_native, format, status,
        season, season_year, episodes, duration, genres, average_score,
        popularity, description, release_date, start_date, end_date
      ) VALUES (
        ${safeId}, ${title.romaji}, ${title.english ?? null}, ${title.native ?? null},
        ${format}, ${status}, ${season}, ${safeSeasonYear},
        ${safeEpisodes}, ${safeDuration}, ${genreStr}, ${safeAverageScore},
        ${safePopularity}, ${description}, ${releaseDate},
        ${formatDate(startDate)}, ${formatDate(endDate)}
      )
      RETURNING id
    `;

    if (result.length === 0) {
      console.error(`Failed to insert anime ID ${id}`);
      await recordFailure(id, 'Failed to insert into database');
      return false;
    }

    let episodesInserted = 0;
    
    if (Array.isArray(episodesList) && episodesList.length > 0) {
      for (const ep of episodesList) {
        try {
          if (!ep.id) {
            console.warn(`Episode for anime ${id} missing ID, skipping`);
            continue;
          }
          
          const epId = typeof ep.id === 'string' && !isNaN(parseInt(ep.id)) 
            ? parseInt(ep.id) 
            : ep.id;
            
          console.log(`Inserting episode with ID ${epId}, number ${ep.number}`);
          
          let safeNumber = ep.number != null ? 
            (typeof ep.number === 'number' ? ep.number : parseInt(String(ep.number), 10)) : 
            null;
          
          if (safeNumber !== null && isNaN(safeNumber)) {
            console.warn(`Invalid episode number for anime ${id}: ${ep.number}, using null`);
            safeNumber = null;
          }
          
          const epResult = await sql`
            INSERT INTO anime_episodes (
              id, anime_id, number, title, description, aired_at
            ) VALUES (
              ${epId}, ${safeId}, ${safeNumber}, ${ep.title ?? null}, 
              ${ep.description ?? null}, ${ep.airedAt ?? null}
            )
            ON CONFLICT (id) DO NOTHING
            RETURNING id
          `;
          
          if (epResult.length > 0) {
            episodesInserted++;
          }
        } catch (epError) {
          console.error(`Error inserting episode for anime ${id}:`, epError);
        }
      }
    } else if (typeof anime === 'object' && anime !== null) {
      const possibleEpisodeProps = [
        'episodes_list', 'episode_list', 'episode', 'episodes_data', 'episodesData'
      ];
      
      for (const prop of possibleEpisodeProps) {
        if (prop in anime && Array.isArray(anime[prop]) && anime[prop].length > 0) {
          console.log(`Found episodes in property: ${prop}`);
          const epList = anime[prop];
          
          for (const ep of epList) {
            try {
              if (!ep.id) {
                console.warn(`Episode missing ID in ${prop}, skipping`);
                continue;
              }
              
              const epId = typeof ep.id === 'string' && !isNaN(parseInt(ep.id)) 
                ? parseInt(ep.id) 
                : ep.id;
                
              const epNumber = ep.number || ep.episode_number || null;
              const epTitle = ep.title || ep.name || null;
              const epDescription = ep.description || ep.synopsis || null;
              const epAiredAt = ep.airedAt || ep.aired_at || ep.air_date || null;
              
              console.log(`Inserting alternative episode: ${epNumber}`);
              
              let safeNumber = epNumber != null ? 
                (typeof epNumber === 'number' ? epNumber : parseInt(String(epNumber), 10)) : 
                null;
              
              if (safeNumber !== null && isNaN(safeNumber)) {
                safeNumber = null;
              }
              
              const epResult = await sql`
                INSERT INTO anime_episodes (
                  id, anime_id, number, title, description, aired_at
                ) VALUES (
                  ${epId}, ${safeId}, ${safeNumber}, ${epTitle}, ${epDescription}, ${epAiredAt}
                )
                ON CONFLICT (id) DO NOTHING
                RETURNING id
              `;
              
              if (epResult.length > 0) {
                episodesInserted++;
              }
            } catch (epError) {
              console.error(`Error inserting alternative episode:`, epError);
            }
          }
          
          break;
        }
      }
    }
    
    console.log(`Successfully inserted ${episodesInserted} episodes for anime ID ${id}`);

    const verifyInsert = await checkAnimeExists(id);
    if (!verifyInsert) {
      console.error(`Anime ID ${id} was not found in database after insert!`);
      await recordFailure(id, 'Database verification failed after insert');
      return false;
    }

    try {
      await sql`DELETE FROM anime_failures WHERE anime_id = ${id}`;
    } catch (error) {
      console.warn(`Could not clear failure records for anime ID ${id}:`, error);
    }

    return true;
  } catch (error) {
    console.error(`Error inserting anime ID ${anime.id}:`, error);
    await recordFailure(anime.id, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Ensure the database schema is initialized
async function ensureSchema(): Promise<boolean> {
  try {
    // Use a more robust approach to call the API that will work in all environments
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const res = await fetch(`${baseUrl}/api/db/init`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.ok;
  } catch (error) {
    console.error('Error initializing database schema:', error);
    return false;
  }
}

export async function runScraper(start = 1, limit = 500) {
  scrapeCount = 0;
  failureCount = 0;
  lastId = start;
  
  console.log(`Starting scraper from ID ${start}`);
  
  await ensureSchema().catch(() => console.warn('Schema initialization skipped'));

  for (let id = start; scrapeCount < limit; id++) {
    // Check if regular stop (immediate) is requested
    if (!getScraperRunning()) {
      console.log('Scraper stopped by user');
      break;
    }

    lastId = id;
    
    const exists = await checkAnimeExists(id);
    if (exists) {
      console.log(`Anime ID ${id} already exists, skipping...`);
      
      // Check for graceful stop after completing each item
      if (isGracefulStopRequested()) {
        console.log('Graceful stop requested, stopping after completing the current item');
        break;
      }
      
      continue;
    }
    
    try {
      const failureRecord = await sql`
        SELECT attempt_count FROM anime_failures 
        WHERE anime_id = ${id}
      `;
      
      if (failureRecord.length > 0 && failureRecord[0].attempt_count >= 3) {
        console.log(`Skipping anime ID ${id} after ${failureRecord[0].attempt_count} failed attempts`);
        
        // Check for graceful stop after skipping an item
        if (isGracefulStopRequested()) {
          console.log('Graceful stop requested, stopping after skipping the current item');
          break;
        }
        
        continue;
      }
    } catch (error) {
      console.warn(`Could not check failure records for anime ID ${id}:`, error);
    }
    
    // Fetch and process this anime completely before checking for a stop request
    const anime = await fetchAnime(id);
    
    if (!anime) {
      failureCount++;
      console.log(`Failed to fetch anime ID ${id}`);
      
      if (failureCount - scrapeCount >= 50) {
        console.log('Too many consecutive failures, stopping scraper');
        break;
      }
      
      // Check for graceful stop after failed fetch
      if (isGracefulStopRequested()) {
        console.log('Graceful stop requested, stopping after failed fetch');
        break;
      }
      
      continue;
    }

    // Complete the full insert of this anime before considering stopping
    const inserted = await insertAnime(anime);
    
    if (inserted) {
      scrapeCount++;
      console.log(`Successfully scraped and stored anime "${anime.title.romaji}" (ID: ${anime.id})`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      failureCount++;
      console.log(`Failed to insert anime ID ${id}`);
    }
    
    // Only check for graceful stop after fully completing an item
    if (isGracefulStopRequested()) {
      console.log('Graceful stop requested, stopping after completing current anime');
      break;
    }
  }

  console.log(`Scraping completed. Processed ${lastId - start + 1} IDs`);
  console.log(`Successfully stored ${scrapeCount} anime`);
  console.log(`Failed: ${failureCount}`);

  setScraperRunning(false);

  return { lastId, scrapeCount, failureCount };
}
