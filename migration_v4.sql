-- MIGRATION V4: CREATE EXPORT TEMPLATES TABLE
-- Run this on Supabase SQL Editor

CREATE TABLE IF NOT EXISTS export_templates (
    template_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    template_name VARCHAR(150) NOT NULL,
    module_type VARCHAR(50) NOT NULL,
    configuration TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_export_templates_user ON export_templates(user_id);
