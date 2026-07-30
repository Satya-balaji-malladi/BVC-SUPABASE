-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 06: TRIGGERS)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Automatic updated_at timestamp triggers across core entities.
-- =============================================================================

-- DEPARTMENTS UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- STUDENTS UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- OTHER COLLEGE STUDENTS UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_other_students_updated_at ON other_college_students;
CREATE TRIGGER trg_other_students_updated_at
BEFORE UPDATE ON other_college_students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- USERS UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FACULTY UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_faculty_updated_at ON faculty;
CREATE TRIGGER trg_faculty_updated_at
BEFORE UPDATE ON faculty
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- EVENTS UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- EVENT PARTICIPANTS UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_event_participants_updated_at ON event_participants;
CREATE TRIGGER trg_event_participants_updated_at
BEFORE UPDATE ON event_participants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ATTENDANCE UPDATED_AT TRIGGER
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance;
CREATE TRIGGER trg_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
