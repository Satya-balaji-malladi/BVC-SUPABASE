-- Add the missing participant_eligibility column to the events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS participant_eligibility VARCHAR(50) DEFAULT 'bvc_only';
