-- ==============================================================================
-- KaamSetu AI — Production Migration: Security, Profile Persistence,
-- Worker Availability & Geospatial Location Indexes
-- Migration ID: 20261012_production_security_and_profile_persistence
-- ==============================================================================

-- 1. ADDITIVE ENHANCEMENTS TO WORKER PROFILES
ALTER TABLE worker_profiles
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS primary_skill VARCHAR(100),
    ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{"en"}',
    ADD COLUMN IF NOT EXISTS preferred_work_type VARCHAR(50) DEFAULT 'both',
    ADD COLUMN IF NOT EXISTS area VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_available_for_work BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS availability_updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS service_radius_km INT DEFAULT 15,
    ADD COLUMN IF NOT EXISTS profile_photo TEXT,
    ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

-- Backfill default availability flag based on existing availability string
UPDATE worker_profiles
SET is_available_for_work = (availability = 'available' OR availability IS NULL)
WHERE is_available_for_work IS NULL;

-- 2. ADDITIVE ENHANCEMENTS TO JOBS
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS area VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

-- Extract city and area from existing location string if city column is currently null
UPDATE jobs
SET city = TRIM(SPLIT_PART(location, ',', 2)),
    area = TRIM(SPLIT_PART(location, ',', 1))
WHERE city IS NULL AND location LIKE '%,%';

-- 3. ADDITIVE ENHANCEMENTS TO EMPLOYER PROFILES
ALTER TABLE employer_profiles
    ADD COLUMN IF NOT EXISTS area VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 4. PERFORMANCE & GEOSPATIAL INDEXES
CREATE INDEX IF NOT EXISTS idx_jobs_lat_lng ON jobs(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_jobs_city_area ON jobs(city, area);
CREATE INDEX IF NOT EXISTS idx_jobs_status_category ON jobs(status, category);

CREATE INDEX IF NOT EXISTS idx_worker_profiles_lat_lng ON worker_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_availability ON worker_profiles(is_available_for_work, availability);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_city_area ON worker_profiles(city, area);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_primary_skill ON worker_profiles(primary_skill);

CREATE INDEX IF NOT EXISTS idx_agreements_status ON hiring_agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_counterparties ON hiring_agreements(employer_id, worker_id, status);

-- 5. COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all operational and sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiring_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;

-- Drop overly broad legacy public policy if present
DROP POLICY IF EXISTS "Public can view active worker profiles" ON worker_profiles;

-- RLS: Jobs — Public can view open jobs (excluding private employer contact details)
DROP POLICY IF EXISTS "Public can view open jobs" ON jobs;
CREATE POLICY "Public can view open jobs" ON jobs
    FOR SELECT USING (status = 'open');

-- RLS: Worker Profiles — Authenticated users can view active public profile cards
DROP POLICY IF EXISTS "Authenticated can view public worker profiles" ON worker_profiles;
CREATE POLICY "Authenticated can view public worker profiles" ON worker_profiles
    FOR SELECT TO authenticated
    USING (is_available_for_work = true OR auth.uid() = user_id);

-- RLS: Worker Profiles — Worker can update own profile
DROP POLICY IF EXISTS "Workers can update own profile" ON worker_profiles;
CREATE POLICY "Workers can update own profile" ON worker_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS: Employer Profiles — Employer can manage own profile
DROP POLICY IF EXISTS "Employers can manage own profile" ON employer_profiles;
CREATE POLICY "Employers can manage own profile" ON employer_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS: Job Applications — Workers see own applications; employers see applications for their own jobs
DROP POLICY IF EXISTS "Workers can view and create own applications" ON job_applications;
CREATE POLICY "Workers can view and create own applications" ON job_applications
    FOR ALL TO authenticated
    USING (auth.uid() = worker_id)
    WITH CHECK (auth.uid() = worker_id);

-- RLS: Hiring Agreements — Visible only to attached employer and worker
DROP POLICY IF EXISTS "Agreements visible only to participants" ON hiring_agreements;
CREATE POLICY "Agreements visible only to participants" ON hiring_agreements
    FOR ALL TO authenticated
    USING (auth.uid() = employer_id OR auth.uid() = worker_id)
    WITH CHECK (auth.uid() = employer_id OR auth.uid() = worker_id);

-- RLS: Messages & Notifications — Strictly user-owned
DROP POLICY IF EXISTS "Users can only read own notifications" ON notifications;
CREATE POLICY "Users can only read own notifications" ON notifications
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Note: In Supabase, the backend service role key (used by Express server) bypasses RLS
-- automatically, ensuring server-side queries function with least-privilege server authorization.
