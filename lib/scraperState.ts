// lib/scraperState.ts

// Create a simple state management for the scraper with timestamp tracking
let isScraperRunning = false;
let scraperStartTime: Date | null = null;
let scraperLastUpdateTime: Date | null = null;

export function setScraperRunning(value: boolean): void {
  isScraperRunning = value;
  
  if (value) {
    // If starting the scraper, record the start time
    scraperStartTime = new Date();
  }
  
  // Always update the last update time
  scraperLastUpdateTime = new Date();
  
  console.log(`Scraper state changed: ${value ? 'RUNNING' : 'STOPPED'} at ${scraperLastUpdateTime.toISOString()}`);
}

export function getScraperRunning(): boolean {
  // Check if the scraper has been running for too long without updates (10 minutes)
  if (isScraperRunning && scraperLastUpdateTime) {
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - scraperLastUpdateTime.getTime()) / (1000 * 60);
    
    // If it's been more than 10 minutes since last update, assume it's stopped
    if (minutesSinceUpdate > 10) {
      console.log(`Scraper appears stuck (no updates for ${minutesSinceUpdate.toFixed(1)} minutes). Auto-resetting state.`);
      isScraperRunning = false;
    }
  }
  
  return isScraperRunning;
}

// Function to update the timestamp when scraper is doing work
export function updateScraperActivity(): void {
  if (isScraperRunning) {
    scraperLastUpdateTime = new Date();
  }
}

// Get info about the scraper's running state
export function getScraperInfo(): { isRunning: boolean; startTime: Date | null; lastUpdateTime: Date | null } {
  return {
    isRunning: isScraperRunning,
    startTime: scraperStartTime,
    lastUpdateTime: scraperLastUpdateTime
  };
}