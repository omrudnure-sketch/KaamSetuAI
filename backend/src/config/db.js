// Supabase Database Connection & Verification
// Replaces obsolete Mongoose/MongoDB connection and eliminates all MongoDB fallbacks

import { checkSupabaseConnection, pgPool, supabaseAdmin } from './supabase.js';

let isDbReady = false;

export const connectDB = async () => {
  const hasPgConfig = Boolean(process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL);
  const hasSdkConfig = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));

  if (!hasPgConfig && !hasSdkConfig) {
    console.warn('[KaamSetu AI] Supabase configuration notice: DATABASE_URL and SUPABASE_URL are not set in environment.');
    console.warn('[KaamSetu AI] Operating with in-memory data access layer for test/isolated mode.');
    isDbReady = true;
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
      return false;
    }
  } catch (error) {
    console.error(`[KaamSetu AI] Error during Supabase connection initialization: ${error.message}`);
    isDbReady = false;
    return false;
  }

  isDbReady = true;
  return true;
};

export const getDbStatus = () => isDbReady;

export default connectDB;
