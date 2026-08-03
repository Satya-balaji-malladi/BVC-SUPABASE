-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — GUESTS TABLE CREATION SCRIPT
-- Target Database: Supabase PostgreSQL 15+
-- Description: Creates dedicated table for Guest Event Admins.
-- =============================================================================

CREATE TABLE IF NOT EXISTS guests (
    guest_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150),
    full_name VARCHAR(255),
    email VARCHAR(150) NOT NULL UNIQUE,
    mobile VARCHAR(20),
    organization VARCHAR(255),
    designation VARCHAR(150),
    address TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- Enable RLS (Row Level Security) if RLS is enabled in your database
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Allow read and write access for authenticated service roles and admin users
CREATE POLICY "Allow all access to guests" ON guests FOR ALL USING (true);
