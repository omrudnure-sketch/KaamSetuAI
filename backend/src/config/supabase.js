import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../deployment/render.env') });
dotenv.config();

const { Pool } = pg;

// 1. Direct PostgreSQL Connection Pool (Supabase Database URL)
const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  null;

export const pgPool = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

// Helper to run parameterized SQL queries
export const query = async (text, params) => {
  if (!pgPool) {
    throw new Error('PostgreSQL connection pool is not configured. Please set DATABASE_URL.');
  }
  return await pgPool.query(text, params);
};

// 2. Supabase Client SDK (Service Role for backend operations)
const supabaseUrl = process.env.SUPABASE_URL || null;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  null;

export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

// Health & connectivity checker
export const checkSupabaseConnection = async () => {
  const status = {
    postgres: false,
    supabaseClient: false,
    error: null,
  };

  // Check Supabase SDK with an active test query first (HTTPS IPv4, fast and cloud-compatible)
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('users').select('id').limit(1);
      if (!error || error.code === 'PGRST116' || !error.message?.includes('fetch failed')) {
        status.supabaseClient = true;
      } else {
        status.error = error.message;
      }
    } catch (err) {
      status.error = err.message;
    }
  }

  // Check direct PostgreSQL pool
  if (pgPool) {
    try {
      const res = await pgPool.query('SELECT 1 as connected');
      status.postgres = res.rows?.[0]?.connected === 1;
      if (status.postgres) {
        status.error = null;
      }
    } catch (err) {
      // If supabaseClient is already healthy, do not flag direct pgPool failure as an overall error
      if (!status.supabaseClient) {
        status.error = err.message;
      }
    }
  }

  return status;
};

export default {
  pgPool,
  query,
  supabaseAdmin,
  checkSupabaseConnection,
};
