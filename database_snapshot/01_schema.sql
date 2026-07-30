-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 01: SCHEMA & SETUP)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Environment setup, required extensions, enum types, and clean teardown logic.
-- =============================================================================

-- 1. ENABLE REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CLEAN UP EXISTING TABLES (REVERSE DEPENDENCY CASCADE DROP)
DROP TABLE IF EXISTS test_history CASCADE;
DROP TABLE IF EXISTS guest_coordinators CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS export_templates CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS event_assignments CASCADE;
DROP TABLE IF EXISTS diagnostics CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS generated_reports CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS attendance_corrections CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS event_participants CASCADE;
DROP TABLE IF EXISTS event_coordinators CASCADE;
DROP TABLE IF EXISTS event_templates CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS department_hods CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS other_college_students CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- 3. SCHEMA NOTIFICATION REFRESH (SUPABASE POSTGREST)
NOTIFY pgrst, 'reload schema';
