-- Migration: WhatsApp-Style Messaging System with Pre-Agreement Chat Requests and Media Support
-- Applied: 2026-11-06

-- 1. Extend conversations table with request workflow & metadata
ALTER TABLE IF EXISTS conversations
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'accepted',
    ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS request_message TEXT,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(50) DEFAULT 'direct',
    ADD COLUMN IF NOT EXISTS last_message TEXT;

-- Index for fast status and participant lookup
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_initiated_by ON conversations(initiated_by);

-- 2. Extend messages table with receiver, media attachments and duration
ALTER TABLE IF EXISTS messages
    ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS attachment_url TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_size INT,
    ADD COLUMN IF NOT EXISTS duration INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Index for message lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
