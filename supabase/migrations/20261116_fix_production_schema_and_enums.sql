-- ==============================================================================
-- KaamSetu AI — Consolidated Production Database Fix Migration
-- Migration: 20261116_fix_production_schema_and_enums.sql
-- ==============================================================================
-- INSTRUCTIONS FOR USER:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard/project/hoinlgircvmnahydgwvr).
-- 2. Click "SQL Editor" in the left sidebar > Click "New query".
-- 3. Paste and run this entire script.
-- 4. It will add any missing columns and enum values and immediately reload the PostgREST schema cache.
-- ==============================================================================

-- 1. CONVERSATIONS TABLE — Pre-Agreement Chat Requests & Messaging System
ALTER TABLE IF EXISTS conversations
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'accepted',
    ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS request_message TEXT,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(50) DEFAULT 'direct',
    ADD COLUMN IF NOT EXISTS last_message TEXT,
    ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_initiated_by ON conversations(initiated_by);

-- 2. MESSAGES TABLE — Receiver & Media Support
ALTER TABLE IF EXISTS messages
    ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS attachment_url TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_size INT,
    ADD COLUMN IF NOT EXISTS duration INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);

-- 3. PAYMENTS TABLE & PAYMENT_STATUS ENUM
DO $$ BEGIN
    ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'recorded';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE IF EXISTS payments
    ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS payee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS wage_type wage_type DEFAULT 'daily',
    ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(100),
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. PROGRESS UPDATES TABLE — Rich Work Logs
ALTER TABLE IF EXISTS progress_updates
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS tasks_completed TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS blockers TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS expected_completion_date DATE,
    ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- 5. PROJECT EXTENSIONS TABLE
ALTER TABLE IF EXISTS project_extensions
    ALTER COLUMN additional_days SET DEFAULT 1;

ALTER TABLE IF EXISTS project_extensions
    ADD COLUMN IF NOT EXISTS proposed_wage NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS project_worker_id UUID;

-- 6. WORKER PROFILES TABLE — Location & Availability Columns
ALTER TABLE IF EXISTS worker_profiles
    ADD COLUMN IF NOT EXISTS is_available_for_work BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS availability VARCHAR(50) DEFAULT 'available',
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS area VARCHAR(100),
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 7. NOTIFY POSTGREST TO RELOAD SCHEMA CACHE IMMEDIATELY
NOTIFY pgrst, 'reload schema';
