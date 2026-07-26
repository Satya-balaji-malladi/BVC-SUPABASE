-- SQL Migration Script: Version 3.0.0 - Enterprise RBAC & Lifecycle Redesign
-- Run these commands on your Supabase SQL Editor to update your active database.

-- 1. Create User Permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_permission UNIQUE (user_id, permission_key)
);

-- 2. Create Event Assignments table
CREATE TABLE IF NOT EXISTS event_assignments (
    assignment_id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES events(event_id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'Coordinator',
    assigned_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_event_user_role UNIQUE (event_id, user_id, role)
);

-- 3. Add new columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS archive_status VARCHAR(20) DEFAULT 'Active';

-- 4. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_event_user ON event_assignments(event_id, user_id);

-- 5. Backfill existing event organizers into event_assignments as Event Admins
INSERT INTO event_assignments (assignment_id, event_id, user_id, role, assigned_by)
SELECT 
    'ASG' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 10) as assignment_id,
    event_id,
    organizer as user_id,
    'Event Admin' as role,
    'System' as assigned_by
FROM events
WHERE organizer IS NOT NULL
ON CONFLICT (event_id, user_id, role) DO NOTHING;
