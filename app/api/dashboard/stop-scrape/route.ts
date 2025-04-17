// app/api/dashboard/stop-scrape/route.ts

import { NextResponse } from 'next/server';

// Create a simple state management for the scraper
// This would ideally be stored in a more persistent way in a real application
// but this works for demonstration purposes
let isScraperRunning = false;

// This function will be exported so that the start-scrape endpoint can use it
export function setScraperRunning(value: boolean): void {
  isScraperRunning = value;
}

// This function will be exported so that the scraper can check if it should continue
export function getScraperRunning(): boolean {
  return isScraperRunning;
}

export async function POST(): Promise<NextResponse> {
  try {
    // Set the scraper running flag to false
    setScraperRunning(false);
    
    return NextResponse.json({
      message: 'Scraping stopped successfully',
      isRunning: false,
    });
  } catch (error) {
    console.error('Error stopping scraper:', error);
    return NextResponse.json({ error: 'Failed to stop scraper' }, { status: 500 });
  }
}