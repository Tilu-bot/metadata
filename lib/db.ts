import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

// Add connection string safety check for Vercel environment
const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  console.error('DATABASE_URL_UNPOOLED environment variable is not set');
}

// Use correct database URL format for Vercel's environment
const sql = neon(connectionString!);

// Use pooled connections for better performance on Vercel
const pool = new Pool({ 
  connectionString: connectionString!,
  max: 10, // Limit max connections to prevent connection issues
  idleTimeoutMillis: 30000 // Close idle connections after 30 seconds
});

export { sql, pool };
