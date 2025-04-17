// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';

// Define an interface for the stats to avoid using 'any'
interface ScraperStats {
  scrapeCount: number;
  failureCount: number;
  lastScrapedId?: number;
  lastId?: number;
  lastRun?: string;
  episodeCount?: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<ScraperStats | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      // Create a dashboard-specific endpoint that doesn't require auth headers in the frontend
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Error fetching stats');
      console.error(err);
    }
  };

  const startScraping = async () => {
    try {
      // Create a dashboard-specific endpoint that doesn't require auth headers in the frontend
      const res = await fetch('/api/dashboard/start-scrape', {
        method: 'POST',
      });
      
      if (res.ok) {
        setIsScraping(true);
        fetchStats();  // Keep refreshing the stats.
        setError(null);
      } else {
        throw new Error('Failed to start scraping');
      }
    } catch (err) {
      setError('Error starting scraper');
      console.error(err);
    }
  };

  const stopScraping = async () => {
    try {
      // Call the stop-scrape endpoint to signal the server to stop the scraping process
      const res = await fetch('/api/dashboard/stop-scrape', {
        method: 'POST',
      });
      
      if (res.ok) {
        setIsScraping(false);
        setError(null);
      } else {
        throw new Error('Failed to stop scraping');
      }
    } catch (err) {
      setError('Error stopping scraper');
      console.error(err);
    }
  };

  useEffect(() => {
    // Initial fetch of stats when the component mounts
    fetchStats();
    
    const interval = setInterval(() => {
      if (isScraping) {
        fetchStats();
      }
    }, 5000); // Update the dashboard every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [isScraping]);

  return (
    <main className="p-6 font-mono">
      <h1 className="text-2xl font-bold">Anime Scraper Dashboard</h1>
      
      {error && (
        <div className="p-4 mt-4 bg-red-100 border rounded text-red-700">
          {error}
        </div>
      )}
      
      {stats ? (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-green-100 border rounded">
            <p>✅ Scraped: {stats.scrapeCount}</p>
            <p>🆔 Last Anime ID: {stats.lastScrapedId || stats.lastId}</p>
            <p>📅 Last Run: {stats.lastRun ? new Date(stats.lastRun).toLocaleString() : 'Not available'}</p>
          </div>
          <div className="p-4 bg-gray-100 border rounded">
            <p>❌ Failures: {stats.failureCount}</p>
            <p>⚡ Success Rate: {stats.scrapeCount > 0 ? ((stats.scrapeCount - stats.failureCount) / stats.scrapeCount * 100).toFixed(2) : 0}%</p>
            <p>🚀 Error Rate: {stats.failureCount > 0 ? (stats.failureCount / stats.scrapeCount * 100).toFixed(2) : 0}%</p>
          </div>
        </div>
      ) : (
        <p className="mt-4">Scraper is not running or waiting to start...</p>
      )}
      
      <div className="mt-4">
        <button
          onClick={startScraping}
          className="px-6 py-2 bg-blue-500 text-white rounded"
          disabled={isScraping}
        >
          {isScraping ? 'Scraping in Progress...' : 'Start Scraping'}
        </button>
        <button
          onClick={stopScraping}
          className="px-6 py-2 bg-red-500 text-white rounded ml-2"
          disabled={!isScraping}
        >
          Stop Scraping
        </button>
      </div>
    </main>
  );
}
