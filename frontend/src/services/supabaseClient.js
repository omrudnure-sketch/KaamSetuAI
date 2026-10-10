// Supabase Client for KaamSetu AI Frontend
// Provides direct access to Supabase PostgreSQL database tables

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize client if credentials are provided
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

// Helper: Query open jobs directly from Supabase
export const fetchJobsFromSupabase = async ({ category, limit = 20 } = {}) => {
  if (!supabase) return { data: null, error: 'Supabase client is not configured' };

  let query = supabase
    .from('jobs')
    .select('id, title, description, category, required_skills, wage_type, wage_amount, duration_days, location, status, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  return await query;
};

// Helper: Query active worker profiles directly from Supabase
export const fetchWorkersFromSupabase = async ({ skill, limit = 20 } = {}) => {
  if (!supabase) return { data: null, error: 'Supabase client is not configured' };

  let query = supabase
    .from('worker_profiles')
    .select('id, user_id, bio, skills, experience_years, daily_wage, hourly_rate, availability, location, rating, review_count')
    .order('rating', { ascending: false })
    .limit(limit);

  if (skill) {
    query = query.contains('skills', [skill]);
  }

  return await query;
};

// Helper: Query single worker profile with user info
export const fetchWorkerProfileFromSupabase = async (userId) => {
  if (!supabase) return { data: null, error: 'Supabase client is not configured' };

  return await supabase
    .from('worker_profiles')
    .select('*, users(name, phone, preferred_language, is_verified)')
    .eq('user_id', userId)
    .single();
};

export default supabase;
