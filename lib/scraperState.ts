// lib/scraperState.ts

// Create a simple state management for the scraper with timestamp tracking
let isScraperRunning = false;
let gracefulStopRequested = false; // Renamed variable to avoid conflict with function
let scraperStartTime: Date | null = null;
let scraperLastUpdateTime: Date | null = null;

export function setScraperRunning(value: boolean): void {
  isScraperRunning = value;
  
  if (value) {
    // If starting the scraper, record the start time and reset the graceful stop flag
    scraperStartTime = new Date();
    gracefulStopRequested = false;
  }
  
  // Always update the last update time
  scraperLastUpdateTime = new Date();
  
  console.log(`Scraper state changed: ${value ? 'RUNNING' : 'STOPPED'} at ${scraperLastUpdateTime.toISOString()}`);
}

// New function to request a graceful stop
export function requestGracefulStop(): void {
  if (isScraperRunning) {
    gracefulStopRequested = true;
    console.log(`Graceful stop requested at ${new Date().toISOString()}`);
  }
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
      gracefulStopRequested = false;
    }
  }
  
  return isScraperRunning;
}

// Function to check if graceful stop was requested
export function isGracefulStopRequested(): boolean {
  return gracefulStopRequested;
}

// Function to update the timestamp when scraper is doing work
export function updateScraperActivity(): void {
  if (isScraperRunning) {
    scraperLastUpdateTime = new Date();
  }
}

// Get info about the scraper's running state
export function getScraperInfo(): { isRunning: boolean; gracefulStopRequested: boolean; startTime: Date | null; lastUpdateTime: Date | null } {
  return {
    isRunning: isScraperRunning,
    gracefulStopRequested: gracefulStopRequested, // Using variable directly, not function
    startTime: scraperStartTime,
    lastUpdateTime: scraperLastUpdateTime
  };
}