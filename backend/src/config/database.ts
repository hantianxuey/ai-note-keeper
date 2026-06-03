require('dotenv').config();
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const databaseHost = databaseUrl ? new URL(databaseUrl).hostname : '';
const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(databaseHost);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' && !isLocalDatabase
    ? { rejectUnauthorized: false }
    : false,
});

export default pool;
