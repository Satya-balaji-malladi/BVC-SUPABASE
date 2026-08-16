-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — TRUNCATE ALL DATA SCRIPT
-- This script safely removes ALL data from ALL tables while keeping the 
-- table structures (schema) intact. 
-- 
-- WARNING: THIS ACTION CANNOT BE UNDONE.
-- =============================================================================

-- Disable foreign key constraints temporarily so we can truncate in any order
SET session_replication_role = 'replica';

-- Truncate all standard tables
TRUNCATE TABLE attendance_corrections CASCADE;
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE event_participants CASCADE;
TRUNCATE TABLE event_assignments CASCADE;
TRUNCATE TABLE event_coordinators CASCADE;
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE event_templates CASCADE;
TRUNCATE TABLE department_hods CASCADE;
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
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE settings CASCADE;
TRUNCATE TABLE departments CASCADE;

-- Re-enable foreign key constraints
SET session_replication_role = 'origin';

-- Insert Super Admin and Developer accounts
INSERT INTO users (user_id, employee_id, first_name, email_address, username, password_hash, role, status)
VALUES 
('superadmin-1', 'BVCADMIN', 'Super Admin', 'admin@bvc.edu.in', 'admin', 'admin123', 'SuperAdmin', 'Active'),
('dev-1', 'BVCDEV', 'Developer', 'dev@bvc.edu.in', 'developer', 'dev123', 'Developer', 'Active');

SELECT 'All data successfully cleared from the database!' AS status;
