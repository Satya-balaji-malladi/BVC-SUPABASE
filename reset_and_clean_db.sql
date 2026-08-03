-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — SAFE DATABASE RESET SCRIPT
-- Cleans up old inconsistent records while preserving existing Super Admins
-- =============================================================================

-- 1. Disable triggers temporarily for clean cascade deletion
SET session_replication_role = 'replica';

-- 2. Clean child tables if they exist
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS event_participants CASCADE;
DROP TABLE IF EXISTS event_assignments CASCADE;
DROP TABLE IF EXISTS department_hods CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- 3. Clean Students & Events tables if they exist
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- 4. Delete non-Super Admin users (Preserve Super Admins)
DELETE FROM users WHERE LOWER(role) != 'superadmin' AND LOWER(default_role) != 'superadmin';

-- 5. Clean departments table if exists
DROP TABLE IF EXISTS departments CASCADE;

-- 6. Re-enable session triggers
SET session_replication_role = 'origin';

-- Output status
SELECT 'Database successfully reset! Super Admin accounts preserved.' AS status;
