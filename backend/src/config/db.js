// Supabase Database Connection & Verification
// Replaces obsolete Mongoose/MongoDB connection and eliminates all MongoDB fallbacks

import { checkSupabaseConnection, pgPool, supabaseAdmin } from './supabase.js';

let isDbReady = false;

export const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasPgConfig = Boolean(process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL);
  const hasSdkConfig = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || (!isProduction && process.env.SUPABASE_ANON_KEY)));

  if (!hasPgConfig && !hasSdkConfig) {
    if (isProduction) {
      console.error('[KaamSetu AI] FATAL: Production environment missing database credentials (DATABASE_URL or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
      isDbReady = false;
      return false;
    }
    console.warn('[KaamSetu AI] Supabase configuration notice: DATABASE_URL and SUPABASE_URL are not set in environment.');
    console.warn('[KaamSetu AI] Operating with in-memory data access layer for test/isolated development mode only.');
    isDbReady = process.env.NODE_ENV === 'test';
    return false;
  }

  try {
    const status = await checkSupabaseConnection();
    if (status.supabaseClient || status.postgres) {
      console.log(`[KaamSetu AI] Connected to Supabase database successfully (${status.supabaseClient ? 'Supabase Client API' : 'PostgreSQL direct'}).`);
      isDbReady = true;
      return true;
    } else if (status.error) {
      console.error(`[KaamSetu AI] Supabase connection check failed: ${status.error}`);
      isDbReady = false;
      if (isProduction) {
        console.error('[KaamSetu AI] Database readiness failed in production.');
      }
      return false;
    }
  } catch (error) {
    console.error(`[KaamSetu AI] Error during Supabase connection initialization: ${error.message}`);
    isDbReady = false;
    return false;
  }

  isDbReady = false;
  return false;
};

export const getDbStatus = () => isDbReady;

export default connectDB;
