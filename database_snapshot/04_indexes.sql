-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 04: INDEXES)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Performance optimization indexes for FKs, roll numbers, timestamps, and queries.
-- =============================================================================

-- STUDENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_dept_id ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_year_sec ON students(year, section);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);

-- OTHER COLLEGE STUDENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_other_college_roll ON other_college_students(roll_number);
CREATE INDEX IF NOT EXISTS idx_other_college_name ON other_college_students(college_name);

-- USERS INDEXES
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email_address);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department);

-- FACULTY INDEXES
CREATE INDEX IF NOT EXISTS idx_faculty_emp_id ON faculty(employee_id);
CREATE INDEX IF NOT EXISTS idx_faculty_user_id ON faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_dept ON faculty(department_id);

-- GUEST COORDINATORS INDEXES
CREATE INDEX IF NOT EXISTS idx_guest_coord_user_id ON guest_coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_coord_email ON guest_coordinators(email);

-- EVENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(event_status);
CREATE INDEX IF NOT EXISTS idx_events_archive ON events(archive_status);

-- EVENT ASSIGNMENTS & COORDINATORS INDEXES
CREATE INDEX IF NOT EXISTS idx_event_assignments_event_user ON event_assignments(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_coordinators_event_user ON event_coordinators(event_id, user_id);

-- EVENT PARTICIPANTS INDEXES
CREATE INDEX IF NOT EXISTS idx_event_participants_event_roll ON event_participants(event_id, roll_number);
CREATE INDEX IF NOT EXISTS idx_event_participants_status ON event_participants(attendance_status);

-- ATTENDANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_event_roll ON attendance(event_id, roll_number);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_att ON attendance_corrections(attendance_id);

-- SESSIONS INDEXES
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- AUDIT LOGS & DIAGNOSTICS INDEXES
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

-- NOTIFICATIONS & PERMISSIONS INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_export_templates_user ON export_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_timestamp ON test_history(run_timestamp DESC);
