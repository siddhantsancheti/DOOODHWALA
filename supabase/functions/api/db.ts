import { drizzle } from 'https://esm.sh/drizzle-orm/postgres-js';
import postgres from 'https://esm.sh/postgres@3.4.3';
import * as schema from './schema.ts';

let connectionString = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL') || '';
// Ensure connectionString is a valid URL to avoid synchronous crashing at boot
if (!connectionString || connectionString.includes('[YOUR_PASSWORD]')) {
  console.warn('Using fallback connection string to prevent boot error');
  connectionString = 'postgres://postgres:postgres@localhost:5432/postgres';
}
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
