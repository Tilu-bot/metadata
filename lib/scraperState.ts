// lib/scraperState.ts

// Create a simple state management for the scraper
// This would ideally be stored in a more persistent way in a real application
// but this works for demonstration purposes
let isScraperRunning = false;

export function setScraperRunning(value: boolean): void {
  isScraperRunning = value;
}

export function getScraperRunning(): boolean {
  return isScraperRunning;
}