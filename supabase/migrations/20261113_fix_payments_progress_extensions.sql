-- Migration: 20261113_fix_payments_progress_extensions.sql
-- Description: Add 'recorded' to payment_status enum, add rich progress columns, and support additional extension fields.

DO $$ BEGIN
    ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'recorded';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhance progress_updates with detailed task, blocker, and date columns while maintaining full backward-compatibility with summary
ALTER TABLE progress_updates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE progress_updates ADD COLUMN IF NOT EXISTS tasks_completed TEXT[] DEFAULT '{}';
ALTER TABLE progress_updates ADD COLUMN IF NOT EXISTS blockers TEXT[] DEFAULT '{}';
ALTER TABLE progress_updates ADD COLUMN IF NOT EXISTS expected_completion_date DATE;
ALTER TABLE progress_updates ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Enhance project_extensions with proposed_wage, project_worker_id, and safe default for additional_days
ALTER TABLE project_extensions ALTER COLUMN additional_days SET DEFAULT 1;
ALTER TABLE project_extensions ADD COLUMN IF NOT EXISTS proposed_wage NUMERIC(10, 2);
ALTER TABLE project_extensions ADD COLUMN IF NOT EXISTS project_worker_id UUID;

-- Reload Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';

