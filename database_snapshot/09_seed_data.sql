-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 09: SEED DATA)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Essential system roles, departments, default admin accounts, and reference data.
-- =============================================================================

-- 1. SEED SYSTEM ROLES
INSERT INTO roles (role_id, role_name, description) VALUES
('ROLE_SUPER_ADMIN', 'Super Admin', 'Full system control, global user management & audit access'),
('ROLE_HOD', 'HOD', 'Head of Department - Department level analytics & cross-dept participation access'),
('ROLE_EVENT_ADMIN', 'Event Admin', 'Full administrative authority over assigned events'),
('ROLE_FACULTY_COORD', 'Faculty Coordinator', 'Faculty member assigned to lead scanner operations for an event'),
('ROLE_STUDENT_COORD', 'Student Coordinator', 'Student volunteer conducting barcode/camera attendance scanning'),
('ROLE_GUEST_COORD', 'Guest Coordinator', 'Temporary external coordinator for specific event scanning')
ON CONFLICT (role_id) DO NOTHING;

-- 2. SEED DEPARTMENTS (11 CORE DEPARTMENTS)
INSERT INTO departments (department_id, department_name, department_code, status, created_at, allowed_years) VALUES
('DEPT_CSE', 'Computer Science and Engineering', 'CSE', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_AIML', 'CSE (Artificial Intelligence & Machine Learning)', 'CSE-AIML', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_DS', 'CSE (Data Science)', 'CSE-DS', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_AIDS', 'Artificial Intelligence & Data Science', 'AI&DS', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_IT', 'Information Technology', 'IT', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_ECE', 'Electronics and Communication Engineering', 'ECE', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_EEE', 'Electrical and Electronics Engineering', 'EEE', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_ME', 'Mechanical Engineering', 'ME', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_CIVIL', 'Civil Engineering', 'CIVIL', 'Active', CURRENT_TIMESTAMP, '[1,2,3,4]'),
('DEPT_MBA', 'Master of Business Administration', 'MBA', 'Active', CURRENT_TIMESTAMP, '[1,2]'),
('DEPT_MCA', 'Master of Computer Applications', 'MCA', 'Active', CURRENT_TIMESTAMP, '[1,2]')
ON CONFLICT (department_id) DO UPDATE SET 
  department_code = EXCLUDED.department_code,
  department_name = EXCLUDED.department_name,
  allowed_years = EXCLUDED.allowed_years;

-- 3. SEED DEFAULT SUPER ADMIN USER
INSERT INTO users (
    user_id, employee_id, first_name, last_name, email_address, phone_number,
    department, title_designation, username, password_hash, role, default_role, status, profile_completed
) VALUES (
    'USER_SUPER_ADMIN', 'EMP_SA_0001', 'Super', 'Administrator', 'admin@bvc.edu.in', '9876543210',
    'DEPT_CSE', 'System Administrator', 'superadmin', '$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEF', 'Super Admin', 'Super Admin', 'Active', TRUE
) ON CONFLICT (user_id) DO NOTHING;

-- 4. SEED SAMPLE SETTINGS
INSERT INTO settings (setting_id, category, key, value, data_type, description, editable, status) VALUES
('SET_001', 'System', 'SYSTEM_NAME', 'BVC Engineering College Event Attendance System', 'String', 'Global title of application', TRUE, 'Active'),
('SET_002', 'System', 'ACADEMIC_YEAR', '2025-2026', 'String', 'Current Academic Year', TRUE, 'Active'),
('SET_003', 'Attendance', 'ALLOW_SPOT_REGISTRATION', 'Yes', 'Boolean', 'Default spot registration rule', TRUE, 'Active')
ON CONFLICT (key) DO NOTHING;
