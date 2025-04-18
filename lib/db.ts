import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

// Create a proper noopSql implementation that better matches the NeonQueryFunction interface
// We need to cast to unknown first and then to the target type to avoid type checking errors
const noopSql = {
  query: async () => {
    console.error('Database not connected. DATABASE_URL_UNPOOLED is not set.');
    return [];
  },
  execute: async () => ({ rowCount: 0 }),
  queryData: async () => ([]),
  unsafe: async () => [],
  transaction: async () => ({
    query: async () => [],
    execute: async () => ({ rowCount: 0 }),
    release: async () => {}
  })
} as unknown as NeonQueryFunction<true, false>;

// Add connection string safety check for Vercel environment
const connectionString = process.env.DATABASE_URL_UNPOOLED;

// Use these variables to track connection status
let isDbConnected = false;
let connectionError: Error | null = null;

// Initialize sql and pool with safe defaults
let sql: NeonQueryFunction<true, false>;
let pool: Pool | null = null;

try {
  if (!connectionString) {
    console.error('DATABASE_URL_UNPOOLED environment variable is not set');
    throw new Error('Database connection string not provided');
  }

  // Use correct database URL format for Vercel's environment
  sql = neon<true, false>(connectionString);

  // Use pooled connections for better performance on Vercel
  pool = new Pool({ 
    connectionString: connectionString,
    max: 10, // Limit max connections to prevent connection issues
    idleTimeoutMillis: 30000 // Close idle connections after 30 seconds
  });
  
  isDbConnected = true;
  console.log('Database connection initialized successfully');
} catch (error) {
  sql = noopSql; // Set sql to the noopSql if connection fails
  connectionError = error instanceof Error ? error : new Error('Unknown database connection error');
  console.error('Failed to initialize database connection:', connectionError);
}

export { sql, pool, isDbConnected, connectionError };
