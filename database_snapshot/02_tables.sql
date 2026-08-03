-- =============================================================================
-- BVC EVENT ATTENDANCE SYSTEM — DATABASE SNAPSHOT (PART 02: DDL TABLES)
-- Target Database: Supabase PostgreSQL 15+
-- Generated Date: 2026-07-30
-- Description: Complete table definitions for all 24 database entities.
-- =============================================================================

-- 1. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    department_id VARCHAR(50) PRIMARY KEY,
    department_code VARCHAR(10) NOT NULL UNIQUE,
    department_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    hod_name VARCHAR(100),
    hod_employee_id VARCHAR(50),
    total_students INT DEFAULT 0,
    total_coordinators INT DEFAULT 0,
    total_events_hosted INT DEFAULT 0,
    total_participants INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Active',
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 2. STUDENTS TABLE (BVC Regular Students)
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(50) PRIMARY KEY,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    email_address VARCHAR(150),
    year INT NOT NULL,
    semester INT,
    section VARCHAR(5),
    gender VARCHAR(10),
    student_status VARCHAR(20) DEFAULT 'Active',
    phone_number VARCHAR(15),
    department_id VARCHAR(50) REFERENCES departments(department_id) ON DELETE SET NULL,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50),
    address TEXT,
    date_of_birth DATE,
    admission_year INT,
    blood_group VARCHAR(10),
    enrollment_date DATE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    college VARCHAR(255) DEFAULT 'Bonam Venkata Chalamayya Engineering College',
    user_id VARCHAR(50), -- Link for Student Coordinators (Migration v10)
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 3. OTHER COLLEGE STUDENTS TABLE (Non-BVC / External Students)
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

-- 4. ROLES TABLE (System RBAC Roles)
CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(50) PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. USERS TABLE (System Users / Admins / Coordinators / HODs)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email_address VARCHAR(150) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    department VARCHAR(50),
    title_designation VARCHAR(100),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255),
    authentication_provider VARCHAR(50) DEFAULT 'Local',
    first_login BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) NOT NULL,
    default_role VARCHAR(50) DEFAULT 'Coordinator',
    status VARCHAR(20) DEFAULT 'Active',
    profile_picture_url TEXT,
    failed_login_attempts INT DEFAULT 0,
    account_locked BOOLEAN DEFAULT FALSE,
    last_login_timestamp TIMESTAMP WITH TIME ZONE,
    last_logout_timestamp TIMESTAMP WITH TIME ZONE,
    password_reset_required BOOLEAN DEFAULT FALSE,
    password_last_changed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    password_expiry_date TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    otp VARCHAR(10),
    otp_expiry TIMESTAMP WITH TIME ZONE,
    otp_attempts INT DEFAULT 0,
    popup_notifications BOOLEAN DEFAULT TRUE,
    notification_sound BOOLEAN DEFAULT TRUE,
    theme_preference VARCHAR(50) DEFAULT 'Default',
    language VARCHAR(10) DEFAULT 'en-IN',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    bio_notes TEXT,
    profile_completed BOOLEAN DEFAULT FALSE,
    online_status VARCHAR(50) DEFAULT 'Offline',
    last_seen TIMESTAMP WITH TIME ZONE,
    alternate_phone VARCHAR(15),
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 6. FACULTY MASTER TABLE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 7. GUEST COORDINATORS TABLE
CREATE TABLE IF NOT EXISTS guest_coordinators (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    name VARCHAR(255) NOT NULL,
    guest_id VARCHAR(50),
    branch VARCHAR(100),
    department VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 8. DEPARTMENT HODS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS department_hods (
    id VARCHAR(50) PRIMARY KEY,
    department_id VARCHAR(50) NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dept_hod UNIQUE (department_id, user_id)
);

-- 9. EVENTS MASTER TABLE
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(50) PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    event_category VARCHAR(100),
    organizer VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    attendance_type VARCHAR(50),
    barcode_attendance BOOLEAN DEFAULT TRUE,
    manual_attendance BOOLEAN DEFAULT TRUE,
    capacity INT,
    registered_count INT DEFAULT 0,
    event_status VARCHAR(50) DEFAULT 'Draft',
    report_generated BOOLEAN DEFAULT FALSE,
    report_date DATE,
    remarks TEXT,
    departments TEXT,
    years VARCHAR(100),
    last_action VARCHAR(100),
    last_action_at TIMESTAMP WITH TIME ZONE,
    last_action_by VARCHAR(100),
    enable_registration TEXT DEFAULT 'No',
    registration_open TIMESTAMP WITH TIME ZONE,
    registration_close TIMESTAMP WITH TIME ZONE,
    maximum_seats INT,
    allow_spot_registration TEXT DEFAULT 'Yes',
    registration_fields TEXT,
    terms_and_conditions TEXT,
    registration_url TEXT,
    last_attendance_sync TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    archive_status VARCHAR(20) DEFAULT 'Active',
    access_restriction_type TEXT DEFAULT 'ALL_COORDINATORS',
    allowed_coordinator_ids JSONB DEFAULT '[]'::jsonb,
    allowed_departments JSONB DEFAULT '[]'::jsonb,
    approval_status VARCHAR(50) DEFAULT 'Approved',
    approved_by VARCHAR(50),
    approved_at TIMESTAMP WITH TIME ZONE,
    attendance_window_start TIMESTAMP WITH TIME ZONE,
    attendance_window_end TIMESTAMP WITH TIME ZONE,
    check_out_enabled BOOLEAN DEFAULT FALSE,
    rules TEXT,
    schedule TEXT,
    speakers TEXT,
    certificates_config TEXT,
    attendance_settings TEXT,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 10. EVENT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS event_templates (
    template_id VARCHAR(50) PRIMARY KEY,
    template_name VARCHAR(150) NOT NULL,
    default_config TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 11. EVENT COORDINATORS TABLE (Legacy Assignment)
CREATE TABLE IF NOT EXISTS event_coordinators (
    assignment_id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES events(event_id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    assignment_role VARCHAR(100),
    assignment_status VARCHAR(20) DEFAULT 'Active',
    assigned_by VARCHAR(50),
    assigned_date DATE,
    updated_by VARCHAR(50),
    updated_date DATE,
    remarks TEXT,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 12. EVENT ASSIGNMENTS TABLE (Enterprise RBAC Junction)
CREATE TABLE IF NOT EXISTS event_assignments (
    assignment_id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'Coordinator',
    coordinator_type VARCHAR(50) DEFAULT 'N/A',
    status VARCHAR(20) DEFAULT 'Active',
    assigned_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_event_user_role UNIQUE (event_id, user_id, role)
);

-- 13. EVENT PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS event_participants (
    participant_id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES events(event_id) ON DELETE CASCADE,
    roll_number VARCHAR(50) REFERENCES students(roll_number) ON DELETE CASCADE,
    registration_type VARCHAR(50),
    registration_status VARCHAR(50) DEFAULT 'Active',
    attendance_status VARCHAR(50) DEFAULT 'Absent',
    approval_status VARCHAR(50) DEFAULT 'Pending',
    approved_by VARCHAR(50),
    registration_date DATE,
    registration_time TIME,
    registration_timestamp TIMESTAMP WITH TIME ZONE,
    attendance_timestamp TIMESTAMP WITH TIME ZONE,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_id VARCHAR(100),
    custom_fields_data TEXT,
    last_action VARCHAR(255),
    remarks TEXT,
    last_sync_timestamp TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 14. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES events(event_id) ON DELETE CASCADE,
    roll_number VARCHAR(50) REFERENCES students(roll_number) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    attendance_status VARCHAR(20) DEFAULT 'Present',
    attendance_method VARCHAR(20),
    date DATE NOT NULL,
    time TIME NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_undo BOOLEAN DEFAULT FALSE,
    undo_reason TEXT,
    undo_timestamp TIMESTAMP WITH TIME ZONE,
    correction_requested BOOLEAN DEFAULT FALSE,
    correction_status VARCHAR(50),
    correction_reason TEXT,
    correction_handled_by VARCHAR(50),
    location VARCHAR(255),
    remarks TEXT,
    sync_status VARCHAR(50),
    check_out_timestamp TIMESTAMP WITH TIME ZONE,
    total_duration_minutes INT,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 15. ATTENDANCE CORRECTIONS TABLE
CREATE TABLE IF NOT EXISTS attendance_corrections (
    request_id VARCHAR(50) PRIMARY KEY,
    attendance_id VARCHAR(50) NOT NULL REFERENCES attendance(attendance_id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    requested_status VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    approval_status VARCHAR(50) DEFAULT 'Pending',
    handled_by VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 16. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    login_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    logout_timestamp TIMESTAMP WITH TIME ZONE,
    session_status VARCHAR(50) DEFAULT 'Active',
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_type VARCHAR(50),
    os VARCHAR(50),
    browser VARCHAR(50),
    location VARCHAR(255),
    login_method VARCHAR(50) DEFAULT 'Local',
    session_token VARCHAR(255) NOT NULL UNIQUE,
    remarks TEXT,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 17. GENERATED REPORTS TABLE
CREATE TABLE IF NOT EXISTS generated_reports (
    report_id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES events(event_id) ON DELETE CASCADE,
    generated_by_user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE SET NULL,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50),
    generated_date DATE NOT NULL,
    generated_time TIME,
    generated_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    report_status VARCHAR(50) DEFAULT 'Pending',
    pdf_available BOOLEAN DEFAULT FALSE,
    excel_available BOOLEAN DEFAULT FALSE,
    csv_available BOOLEAN DEFAULT FALSE,
    print_available BOOLEAN DEFAULT FALSE,
    total_downloads INT DEFAULT 0,
    last_downloaded_by VARCHAR(50),
    last_downloaded_date DATE,
    file_path TEXT,
    remarks TEXT,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 18. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    setting_id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    description TEXT,
    editable BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'Active',
    notes TEXT,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 19. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    employee_id VARCHAR(50),
    username VARCHAR(100),
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    record_id VARCHAR(50),
    record_type VARCHAR(50),
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    ip_address VARCHAR(50),
    device VARCHAR(100),
    browser VARCHAR(100),
    location VARCHAR(255),
    session_id VARCHAR(50),
    session_token TEXT,
    error_message TEXT,
    execution_time_ms INT,
    remarks TEXT,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 20. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    notification_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'Info',
    status VARCHAR(50) DEFAULT 'Unread',
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) DEFAULT 'System',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 21. DIAGNOSTICS TABLE
CREATE TABLE IF NOT EXISTS diagnostics (
    id BIGSERIAL PRIMARY KEY,
    log_type VARCHAR(50) DEFAULT 'LOG',
    module VARCHAR(100),
    log_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. USER PERMISSIONS OVERRIDES TABLE
CREATE TABLE IF NOT EXISTS user_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_permission UNIQUE (user_id, permission_key)
);

-- 23. EXPORT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS export_templates (
    template_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    template_name VARCHAR(150) NOT NULL,
    module_type VARCHAR(50) NOT NULL,
    configuration TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_flag BOOLEAN DEFAULT FALSE
);

-- 24. TEST HISTORY TABLE
CREATE TABLE IF NOT EXISTS test_history (
    run_id VARCHAR(50) PRIMARY KEY,
    run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    triggered_by VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    details TEXT,
    deletion_flag BOOLEAN DEFAULT FALSE
);
