-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 03: CONSTRAINTS)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Primary key, foreign key, unique, check, and integrity constraints.
-- =============================================================================

-- 1. UNIQUE CONSTRAINTS
ALTER TABLE departments DROP CONSTRAINT IF EXISTS uq_department_code;
ALTER TABLE departments ADD CONSTRAINT uq_department_code UNIQUE (department_code);

ALTER TABLE students DROP CONSTRAINT IF EXISTS uq_students_roll_number;
ALTER TABLE students ADD CONSTRAINT uq_students_roll_number UNIQUE (roll_number);

ALTER TABLE other_college_students DROP CONSTRAINT IF EXISTS uq_other_students_roll_number;
ALTER TABLE other_college_students ADD CONSTRAINT uq_other_students_roll_number UNIQUE (roll_number);

ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_employee_id;
ALTER TABLE users ADD CONSTRAINT uq_users_employee_id UNIQUE (employee_id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email_address;
ALTER TABLE users ADD CONSTRAINT uq_users_email_address UNIQUE (email_address);

ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_username;
ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username);

ALTER TABLE roles DROP CONSTRAINT IF EXISTS uq_roles_role_name;
ALTER TABLE roles ADD CONSTRAINT uq_roles_role_name UNIQUE (role_name);

ALTER TABLE faculty DROP CONSTRAINT IF EXISTS uq_faculty_employee_id;
ALTER TABLE faculty ADD CONSTRAINT uq_faculty_employee_id UNIQUE (employee_id);

ALTER TABLE guest_coordinators DROP CONSTRAINT IF EXISTS uq_guest_coord_user_id;
ALTER TABLE guest_coordinators ADD CONSTRAINT uq_guest_coord_user_id UNIQUE (user_id);

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS uq_sessions_token;
ALTER TABLE sessions ADD CONSTRAINT uq_sessions_token UNIQUE (session_token);

ALTER TABLE settings DROP CONSTRAINT IF EXISTS uq_settings_key;
ALTER TABLE settings ADD CONSTRAINT uq_settings_key UNIQUE (key);

ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS unique_user_permission;
ALTER TABLE user_permissions ADD CONSTRAINT unique_user_permission UNIQUE (user_id, permission_key);

ALTER TABLE department_hods DROP CONSTRAINT IF EXISTS unique_dept_hod;
ALTER TABLE department_hods ADD CONSTRAINT unique_dept_hod UNIQUE (department_id, user_id);

ALTER TABLE event_assignments DROP CONSTRAINT IF EXISTS unique_event_user_role;
ALTER TABLE event_assignments ADD CONSTRAINT unique_event_user_role UNIQUE (event_id, user_id, role);

-- 2. CHECK CONSTRAINTS
ALTER TABLE faculty DROP CONSTRAINT IF EXISTS chk_faculty_employment_type;
ALTER TABLE faculty ADD CONSTRAINT chk_faculty_employment_type CHECK (employment_type IN ('Permanent', 'Contract', 'Guest'));

ALTER TABLE faculty DROP CONSTRAINT IF EXISTS chk_faculty_status;
ALTER TABLE faculty ADD CONSTRAINT chk_faculty_status CHECK (status IN ('Active', 'Inactive'));

ALTER TABLE students DROP CONSTRAINT IF EXISTS chk_student_year;
ALTER TABLE students ADD CONSTRAINT chk_student_year CHECK (year BETWEEN 1 AND 4);

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS chk_attendance_status;
ALTER TABLE attendance ADD CONSTRAINT chk_attendance_status CHECK (attendance_status IN ('Present', 'Absent', 'Late', 'Excused'));

-- 3. FOREIGN KEY RELATIONSHIP AUDIT & REENFORCEMENT
-- Note: FKs are defined in CREATE TABLE statements in 02_tables.sql with appropriate ON DELETE CASCADE / SET NULL rules.
