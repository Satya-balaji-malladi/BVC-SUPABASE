-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — MIGRATION V10 FEATURE SUITE DDL
-- Target Database: Supabase PostgreSQL
-- Purpose: Schema updates for Profile Completion, Smart Registration,
--          Faculty Event Creation/Approval Flow, Event Admin Draft Form,
--          and Guest Coordinator Management.
-- Safe Execution: idempotent DDL using IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- 1. GUEST COORDINATORS TABLE
CREATE TABLE IF NOT EXISTS guest_coordinators (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    name VARCHAR(255) NOT NULL,
    guest_id VARCHAR(50),
    branch VARCHAR(100),
    department VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_guest_coord_user_id ON guest_coordinators(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_coord_email ON guest_coordinators(email);

-- 2. ENSURE FACULTY TABLE
CREATE TABLE IF NOT EXISTS faculty (
    faculty_id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    faculty_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    department_id VARCHAR(50) NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    email VARCHAR(150),
    mobile VARCHAR(20),
    gender VARCHAR(20),
    joining_date DATE,
    qualification VARCHAR(100),
    experience_years INT DEFAULT 0,
    employment_type VARCHAR(50) DEFAULT 'Permanent',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_faculty_emp_id ON faculty(employee_id);
CREATE INDEX IF NOT EXISTS idx_faculty_user_id ON faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_dept ON faculty(department_id);

-- 3. ENSURE OTHER COLLEGE STUDENTS TABLE
CREATE TABLE IF NOT EXISTS other_college_students (
    id VARCHAR(50) PRIMARY KEY,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    college_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    year VARCHAR(20),
    section VARCHAR(20),
    email_address VARCHAR(150),
    phone_number VARCHAR(20),
    gender VARCHAR(10),
    city VARCHAR(100),
    state VARCHAR(100),
    emergency_contact VARCHAR(20),
    accommodation_needed VARCHAR(10) DEFAULT 'No',
    food_preference VARCHAR(20),
    id_proof_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active',
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_other_college_roll ON other_college_students(roll_number);

-- 4. EXTEND EVENTS TABLE FOR APPROVAL FLOW & DRAFT CONFIGURATIONS
ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Approved';
ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_by VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_window_start TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_window_end TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS schedule TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS speakers TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS certificates_config TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendance_settings TEXT;

-- 5. LINK USERS TO STUDENTS (For Student Coordinators)
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id VARCHAR(50);

COMMENT ON TABLE guest_coordinators IS 'Stores profile information for Guest Coordinators.';
COMMENT ON TABLE faculty IS 'Master table for Faculty and HOD members.';
COMMENT ON TABLE other_college_students IS 'Stores non-BVC external college student details.';
