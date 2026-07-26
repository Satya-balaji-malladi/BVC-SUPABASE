-- MIGRATION V7: Add missing audit columns to events table
-- Fixes: Supabase REST Error (400): Could not find the 'created_by' column of 'events' in the schema cache
-- Run this in your Supabase SQL Editor

-- Add created_by column (maps to CONFIG.COLUMNS.CREATED_BY = 'Created By')
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'System';

-- Add updated_by column (maps to CONFIG.COLUMNS.UPDATED_BY = 'Updated By')
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100) DEFAULT 'System';

-- Add venue column as alias (the code uses 'venue' key in frontend but schema uses 'location')
-- The DatabaseService should already handle 'location', but add 'venue' as a computed view alias if needed
-- For now we ensure the EventService can write 'venue' field via the existing 'location' column mapping.
-- No schema change needed here — the Config.js maps VENUE -> 'Location' which already exists.

-- Ensure enable_registration column is text (not boolean) to match 'Yes'/'No' string values
-- from EventService. The current schema has BOOLEAN DEFAULT FALSE, but EventService sends 'Yes'/'No'
ALTER TABLE events ALTER COLUMN enable_registration TYPE TEXT USING CASE WHEN enable_registration THEN 'Yes' ELSE 'No' END;
ALTER TABLE events ALTER COLUMN allow_spot_registration TYPE TEXT USING CASE WHEN allow_spot_registration THEN 'Yes' ELSE 'No' END;

-- Update defaults to match string format
ALTER TABLE events ALTER COLUMN enable_registration SET DEFAULT 'No';
ALTER TABLE events ALTER COLUMN allow_spot_registration SET DEFAULT 'Yes';

-- Ensure registration_open and registration_close accept text/varchar too (some code sends ISO strings)
-- Keep as TIMESTAMP WITH TIME ZONE but allow nulls
ALTER TABLE events ALTER COLUMN registration_open DROP NOT NULL;
ALTER TABLE events ALTER COLUMN registration_close DROP NOT NULL;

-- Notify schema cache refresh (no-op statement to force PostgREST to reload schema)
NOTIFY pgrst, 'reload schema';
