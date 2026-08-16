-- =============================================================================
-- TRUNCATE SELECTIVE TABLES
-- This script removes data from all tables EXCEPT:
-- 1. departments
-- 2. users
-- 3. department_hods
-- =============================================================================

-- Disable foreign key constraints temporarily
SET session_replication_role = 'replica';

-- Truncate tables
TRUNCATE TABLE attendance_corrections CASCADE;
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE event_participants CASCADE;
TRUNCATE TABLE event_assignments CASCADE;
TRUNCATE TABLE event_coordinators CASCADE;
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE event_templates CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE faculty CASCADE;
TRUNCATE TABLE generated_reports CASCADE;
TRUNCATE TABLE export_templates CASCADE;
TRUNCATE TABLE test_history CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE diagnostics CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE user_permissions CASCADE;
TRUNCATE TABLE settings CASCADE;
TRUNCATE TABLE branches CASCADE;

-- Re-enable foreign key constraints
SET session_replication_role = 'origin';

SELECT 'Data cleared! Departments, Users, and HODs are kept safe.' AS status;
