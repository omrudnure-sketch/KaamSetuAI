-- ==============================================================================
-- KaamSetu AI — Supabase PostgreSQL Relational Schema
-- ==============================================================================
-- INSTRUCTIONS FOR USER:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard).
-- 2. Navigate to SQL Editor > New query.
-- 3. Paste and run this entire script to create all tables, indexes, and RLS policies.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('worker', 'employer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('super_admin', 'dispute_manager', 'verification_officer', 'analyst');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'suspended', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE wage_type AS ENUM ('daily', 'hourly', 'milestone', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('pending', 'selected', 'rejected', 'withdrawn');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE agreement_status AS ENUM ('pending_worker', 'pending_employer', 'confirmed', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'disputed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_status AS ENUM ('filed', 'under_review', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dispute_status AS ENUM ('open', 'investigating', 'resolved', 'escalated', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'worker',
    admin_role admin_role DEFAULT NULL,
    permissions TEXT[] DEFAULT '{}',
    preferred_language VARCHAR(10) DEFAULT 'en',
    status user_status NOT NULL DEFAULT 'active',
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKER PROFILES TABLE
CREATE TABLE IF NOT EXISTS worker_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    bio TEXT,
    skills TEXT[] DEFAULT '{}',
    experience_years INT DEFAULT 0,
    daily_wage NUMERIC(10, 2),
    hourly_rate NUMERIC(10, 2),
    availability VARCHAR(50) DEFAULT 'available',
    location VARCHAR(255),
    city VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    profile_completion INT DEFAULT 20,
    rating NUMERIC(3, 2) DEFAULT 0.0,
    review_count INT DEFAULT 0,
    completed_projects INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMPLOYER PROFILES TABLE
CREATE TABLE IF NOT EXISTS employer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    company_name VARCHAR(255),
    business_type VARCHAR(100),
    contact_person VARCHAR(255),
    location VARCHAR(255),
    city VARCHAR(100),
    profile_completion INT DEFAULT 30,
    rating NUMERIC(3, 2) DEFAULT 0.0,
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    required_skills TEXT[] DEFAULT '{}',
    wage_type wage_type NOT NULL DEFAULT 'daily',
    wage_amount NUMERIC(10, 2) NOT NULL,
    duration_days INT DEFAULT 1,
    location VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    workers_needed INT DEFAULT 1,
    status job_status NOT NULL DEFAULT 'open',
    ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOB APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proposed_wage NUMERIC(10, 2),
    cover_note TEXT,
    status application_status NOT NULL DEFAULT 'pending',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_job_worker_application UNIQUE (job_id, worker_id)
);

-- JOB INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS job_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_job_worker_invitation UNIQUE (job_id, worker_id)
);

-- HIRING AGREEMENTS TABLE
CREATE TABLE IF NOT EXISTS hiring_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agreed_wage NUMERIC(10, 2) NOT NULL,
    wage_type wage_type NOT NULL DEFAULT 'daily',
    start_date DATE NOT NULL,
    expected_end_date DATE,
    terms TEXT,
    proposed_by VARCHAR(50) DEFAULT 'employer',
    status agreement_status NOT NULL DEFAULT 'pending_worker',
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hiring_agreement_id UUID REFERENCES hiring_agreements(id),
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    start_date DATE NOT NULL,
    expected_end_date DATE,
    actual_end_date DATE,
    payment_amount NUMERIC(10, 2) NOT NULL,
    status project_status NOT NULL DEFAULT 'confirmed',
    completion_requested_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECT WORKERS TABLE
CREATE TABLE IF NOT EXISTS project_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hiring_agreement_id UUID REFERENCES hiring_agreements(id),
    agreed_wage NUMERIC(10, 2) NOT NULL,
    wage_type wage_type NOT NULL DEFAULT 'daily',
    status VARCHAR(50) DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_project_worker UNIQUE (project_id, worker_id)
);

-- ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'present',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_worker_project_attendance_date UNIQUE (project_id, worker_id, date)
);

-- DAILY PROGRESS UPDATES TABLE
CREATE TABLE IF NOT EXISTS progress_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completion_percentage INT NOT NULL CHECK (completion_percentage BETWEEN 0 AND 100),
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECT EXTENSIONS TABLE
CREATE TABLE IF NOT EXISTS project_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),
    additional_days INT NOT NULL,
    reason TEXT NOT NULL,
    original_end_date DATE NOT NULL,
    new_end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS LEDGER TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id),
    payee_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    wage_type wage_type NOT NULL DEFAULT 'daily',
    status payment_status NOT NULL DEFAULT 'completed',
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    transaction_ref VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_project_reviewer_reviewee UNIQUE (project_id, reviewer_id, reviewee_id)
);

-- CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    related_project_id UUID REFERENCES projects(id),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_participants UNIQUE (participant_a, participant_b)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    against_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status complaint_status NOT NULL DEFAULT 'filed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DISPUTES TABLE
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    claimant_id UUID NOT NULL REFERENCES users(id),
    respondent_id UUID NOT NULL REFERENCES users(id),
    assigned_admin_id UUID REFERENCES users(id),
    status dispute_status NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RISK FLAGS TABLE
CREATE TABLE IF NOT EXISTS risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    factors JSONB DEFAULT '{}',
    flagged_at TIMESTAMPTZ DEFAULT NOW()
);

-- VERIFICATION RECORDS TABLE
CREATE TABLE IF NOT EXISTS verification_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);

CREATE INDEX IF NOT EXISTS idx_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker ON job_applications(worker_id);

CREATE INDEX IF NOT EXISTS idx_projects_employer ON projects(employer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_attendance_project ON attendances(project_id);
CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendances(worker_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public / Anonymous can read open jobs
CREATE POLICY "Public can view open jobs" ON jobs
    FOR SELECT USING (status = 'open');

-- Public / Anonymous can view active worker profiles
CREATE POLICY "Public can view active worker profiles" ON worker_profiles
    FOR SELECT USING (true);

-- Authenticated Service Role bypasses RLS automatically in Supabase
-- (The backend using SUPABASE_SERVICE_ROLE_KEY or direct PostgreSQL connection
-- has full administrative read/write access to all tables).
