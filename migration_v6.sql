-- MIGRATION V6: CREATE TEST HISTORY TABLE FOR SYSTEM TEST CENTER
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS test_history (
    run_id VARCHAR(50) PRIMARY KEY,
    run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    triggered_by VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    summary TEXT NOT NULL, -- JSON string storing total, passed, failed, duration, module metrics
    details TEXT,          -- Detailed error log stacks and execution timings
    deletion_flag BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_test_history_timestamp ON test_history(run_timestamp DESC);
