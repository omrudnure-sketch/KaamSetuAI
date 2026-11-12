-- ==============================================================================
-- KaamSetu AI — Production Migration: Role-Based Email Requirements
-- Migration ID: 20261106_role_based_email_requirements
--
-- WORKER: Email is optional (NULL allowed).
-- EMPLOYER: Email is mandatory.
-- Non-null emails enforce strict uniqueness (case-insensitive).
-- ==============================================================================

-- 1. Clean existing empty string emails to NULL
UPDATE users
SET email = NULL
WHERE email = '' OR email = ' ';

-- 2. Partial unique index on email for non-null values
-- Ensures uniqueness for all users who provide an email, while allowing multiple workers with NULL email
DROP INDEX IF EXISTS idx_users_email_unique_non_null;
CREATE UNIQUE INDEX idx_users_email_unique_non_null
ON users (LOWER(email))
WHERE email IS NOT NULL;

-- 3. Partial unique index on phone for non-null values
DROP INDEX IF EXISTS idx_users_phone_unique_non_null;
CREATE UNIQUE INDEX idx_users_phone_unique_non_null
ON users (phone)
WHERE phone IS NOT NULL;

-- 4. Check constraint to ensure employers always have an email provided
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_employer_email_required;
ALTER TABLE users ADD CONSTRAINT chk_employer_email_required
CHECK (role != 'employer' OR (email IS NOT NULL AND TRIM(email) != ''));

