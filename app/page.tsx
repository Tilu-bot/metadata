import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-12">
      <h1 className="text-4xl font-bold mb-6">Anime Metadata Scraper</h1>
      <p className="text-xl mb-8 text-center max-w-2xl">
        An automated tool for collecting and storing anime information from external APIs.
        Use the dashboard to monitor and control the scraping process.
      </p>
      
      <div className="flex gap-6 mt-4">
        <Link 
          href="/dashboard"
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </Link>
        
        <a 
          href="https://github.com/Tilu-bot/metadata"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          View Source Code
        </a>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <div className="border p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Automated Collection</h2>
          <p>Scheduled daily scraping at 10:00 AM with Vercel Cron jobs</p>
        </div>
        
        <div className="border p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Data Management</h2>
          <p>Efficient PostgreSQL storage with validation and error handling</p>
        </div>
        
        <div className="border p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3">Dashboard Controls</h2>
          <p>Monitor progress and manually start/stop the scraping process</p>
        </div>
      </div>
    </div>
  );
}
