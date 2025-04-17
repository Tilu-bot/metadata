import { neon } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED! });

export { sql, pool };
