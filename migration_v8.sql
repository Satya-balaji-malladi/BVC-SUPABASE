-- Migration v8: Add attendance access restriction settings to events table

ALTER TABLE events
ADD COLUMN IF NOT EXISTS access_restriction_type TEXT DEFAULT 'ALL_COORDINATORS',
ADD COLUMN IF NOT EXISTS allowed_coordinator_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS allowed_departments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN events.access_restriction_type IS 'Restriction type for taking/modifying attendance: ALL_COORDINATORS, ASSIGNED_ONLY, SPECIFIC_COORDINATORS, DEPT_ONLY';
COMMENT ON COLUMN events.allowed_coordinator_ids IS 'List of coordinator user IDs allowed to take/modify attendance when restriction is SPECIFIC_COORDINATORS';
COMMENT ON COLUMN events.allowed_departments IS 'List of department codes allowed to take/modify attendance when restriction is DEPT_ONLY';
