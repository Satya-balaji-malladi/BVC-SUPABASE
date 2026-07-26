-- MIGRATION V5: ENTERPRISE EVENT PLATFORM UPGRADE
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS event_templates (
    template_id VARCHAR(50) PRIMARY KEY,
    template_name VARCHAR(150) NOT NULL,
    default_config TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
    request_id VARCHAR(50) PRIMARY KEY,
    attendance_id VARCHAR(50) NOT NULL, -- references attendance(attendance_id)
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    requested_status VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    approval_status VARCHAR(50) DEFAULT 'Pending',
    handled_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- Add checkout & scanning time window support
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER;

ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_window_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_window_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS check_out_enabled BOOLEAN DEFAULT FALSE;
