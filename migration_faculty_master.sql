-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — MASTER FACULTY TABLE DDL
-- Target Database: Supabase PostgreSQL
-- =============================================================================

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
    employment_type VARCHAR(50) DEFAULT 'Permanent' CHECK (employment_type IN ('Permanent', 'Contract', 'Guest')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_faculty_emp_id ON faculty(employee_id);
CREATE INDEX IF NOT EXISTS idx_faculty_user_id ON faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_dept ON faculty(department_id);
