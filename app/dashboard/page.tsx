// app/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';

// Define an interface for the stats to avoid using 'any'
interface ScraperStats {
  scrapeCount: number;
  failureCount: number;
  lastScrapedId?: number;
  lastId?: number;
  lastRun?: string;
  episodeCount?: number;
  isRunning: boolean;
  error?: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<ScraperStats | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Memoize fetchStats to avoid recreation on each render
  const fetchStats = useCallback(async () => {
    try {
      // Add cache-busting query parameter
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/dashboard/stats?_=${timestamp}`, {
        // Ensure we always get fresh data
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await res.json();
      setStats(data);
      setIsScraping(data.isRunning);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Error fetching stats');
      console.error(err);
    }
  }, []);

  const startScraping = async () => {
    try {
      const res = await fetch('/api/dashboard/start-scrape', {
        method: 'POST',
      });
      
      if (res.ok) {
        setIsScraping(true);
        // Immediately fetch stats to update the UI
        await fetchStats();
        setError(null);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start scraping');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error starting scraper');
      console.error(err);
    }
  };

  const stopScraping = async () => {
    try {
      const res = await fetch('/api/dashboard/stop-scrape', {
        method: 'POST',
      });
      
      if (res.ok) {
        setIsScraping(false);
        // Immediately fetch stats to update the UI
        await fetchStats();
        setError(null);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to stop scraping');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error stopping scraper');
      console.error(err);
    }
  };

  useEffect(() => {
    // Initial fetch of stats when the component mounts
    fetchStats();
    
    // Always refresh stats periodically, regardless of scraper state
    const interval = setInterval(() => {
      fetchStats();
    }, 3000); // Update more frequently (every 3 seconds)

    return () => clearInterval(interval); // Cleanup on unmount
  }, [fetchStats]);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="py-6 mb-8 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Anime Metadata Scraper Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor and control your anime metadata collection process</p>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </header>
      
      {error && (
        <div className="p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}
      
      {stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Total Scraped Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Scraped</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.scrapeCount}</p>
                </div>
              </div>
            </div>
            
            {/* Failed Requests Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 text-red-800 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Failed Requests</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.failureCount}</p>
                </div>
              </div>
            </div>
            
            {/* Success Rate Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.scrapeCount > 0 ? ((stats.scrapeCount - stats.failureCount) / stats.scrapeCount * 100).toFixed(2) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            {/* Last Anime ID Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-800 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Last Anime ID</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.lastScrapedId || stats.lastId || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {/* Scraper Status Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Scraper Status</h3>
              <div className="flex items-center mb-4">
                <div className={`w-3 h-3 rounded-full mr-2 ${isScraping ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="font-medium">{isScraping ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{isScraping ? 'Running' : 'Stopped'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Episodes collected:</span>
                  <span className="font-medium">{stats.episodeCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last run:</span>
                  <span className="font-medium">{stats.lastRun ? new Date(stats.lastRun).toLocaleString() : 'Not available'}</span>
                </div>
              </div>
            </div>
            
            {/* Controls Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Controls</h3>
              <p className="text-gray-600 mb-4">Start or stop the anime metadata scraping process.</p>
              
              <div className="flex space-x-4">
                {/* Start Button */}
                <button
                  onClick={startScraping}
                  className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center ${isScraping 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  disabled={isScraping}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  {isScraping ? 'Scraping in Progress...' : 'Start Scraping'}
                </button>
                
                {/* Stop Button */}
                <button
                  onClick={stopScraping}
                  className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center ${!isScraping 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700'}`}
                  disabled={!isScraping}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Stop Scraping
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg text-gray-600">Loading scraper statistics...</p>
          </div>
        </div>
      )}
    </div>
  );
}
